# Ado-dad Backend — Security Review

**Scope:** NestJS 11 + MongoDB (Mongoose 8) + Socket.IO + Redis + AWS S3/SES, deployed on ECS/Fargate.
**Date:** 2026-07-10. **Method:** source read of auth, users, ads/ads-v2, chat, moderation, notifications,
uploads/shared, vehicle-inventory, catalog modules, plus config/deploy files. Critical findings were
verified directly in code. This report finds concrete, exploitable issues only.

> Note: the **chat/socket** module was already hardened earlier today (WS auth guard re-enabled, participant
> check on message reads, rate-limit restored, no token logging). Those are marked *Fixed* below. One chat
> issue (audio-URL SSRF) was **not** covered by that fix and is included here as live.

---

## Severity-ranked findings

| # | Sev | Location | Category | Finding & exploit | Minimal fix |
|---|-----|----------|----------|-------------------|-------------|
| 1 | **Critical** | `users.controller.ts:54` & `:64` (`POST /users`, `POST /users/with-profile-picture`) | Broken auth + priv-esc | **No guard at all.** `createUser` does `new this.userModel(userData)` and saves the DTO verbatim, incl. `type`. An unauthenticated attacker `POST /users {"name","email","phoneNumber","password","type":"SA"}` creates a **SUPER_ADMIN**, then logs in → full admin takeover. Verified end-to-end. | Guard the privileged path (`@Roles(ADMIN,SUPER_ADMIN)`); for public self-signup force `type = NU` server-side and never read `type` from the body. |
| 2 | **Critical** | `users.controller.ts:264` → `update-user.dto.ts:67` → `users.service.ts:644` (`PUT /users/:id`) | Mass-assignment priv-esc | Route is authenticated and enforces self-ownership, **but** `UpdateUserDto` includes `type` and `updateUser` passes `updateData` straight to `findByIdAndUpdate`. A normal user updates their *own* profile with `{"type":"SA"}` → self-escalates to super admin. Verified. | Remove `type` from `UpdateUserDto`; only allow role changes via an admin-guarded endpoint with an explicit allow-list of fields. |
| 3 | **Critical** | `config` (systemic): `app.module.ts:97`, `ads-v2/ads.v2.controller.ts:69`, `ads-v2/ads.v2.module.ts:84`, `app-version/app-version.module.ts:19`, `jwt-strategy.ts:18`, `ws-guard.ts` (fixed), `chat.gateway.ts` (fixed), `auth.module.ts:33` (`'default-secret'`) | Hardcoded fallback JWT secret | JWT signing/verification falls back to `'default-secret-key-change-in-production'` (and `'default-secret'`) in **8 places** if `TOKEN_KEY` is unset. If the env var is ever missing/misnamed in an environment, anyone can forge an admin JWT. `ads-v2` verifies JWTs inline with the fallback too. | Centralize secret resolution; **throw on startup** if `TOKEN_KEY` is unset when `NODE_ENV=production`. Remove every literal fallback. |
| 4 | **Critical** | `chat.service.ts:98-106,512` (`getAudioDuration`) | SSRF | On an audio chat message, the server does `axios.get(attachment.url)` with the URL taken straight from the client. Payload: send a message with `attachments:[{type:"audio",url:"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}]` → server fetches cloud-metadata / internal services (blind SSRF, internal port scan). 5s timeout doesn't mitigate. | `https`-only, resolve host and block private/link-local/loopback ranges, restrict to your S3/CDN host allow-list. |
| 5 | **High** | `app.controller.ts:134,189,244` (`GET /images/:filename`, `/assets/:filename`, `/data/:filename`) & `upload.controller.ts:189-238` | Path traversal / arbitrary file read | Unauthenticated endpoints do `readFileSync/sendFile(join(base, req.param))` with no containment. `GET /data/..%2f..%2f.env` (or the firebase admin JSON, source) escapes the intended dir → arbitrary file read. | Reject any filename containing `/`, `\`, `..`, null byte; assert `path.resolve(final).startsWith(root)`. |
| 6 | **High** | `vehicle-inventory.controller.ts` CSV routes (`:354,:400,:446,:478`) | Unprotected state-changing write | Four `POST .../upload-csv` bulk routes have **no guard** while the JSON CRUD beside them is admin-gated. Anyone can bulk-create/overwrite manufacturers/models/variants (catalog poisoning). | Add `@UseGuards(JwtAuthGuard,RolesGuard)+@Roles(ADMIN,SUPER_ADMIN)`. |
| 7 | **High** | `notifications.controller.ts:15` (`POST /notifications/send`) | Missing role check | Class has only `@UseGuards(JwtAuthGuard)` — no role gate. Any logged-in normal user can broadcast a push to the entire user base (`{"targetType":"ALL",...}`). | Add `RolesGuard` + `@Roles(ADMIN,SUPER_ADMIN)`. |
| 8 | **High** | `fcm.controller.ts:45` (`POST /fcm/register-token`) | IDOR | `userId = dto.userId || req.user.id` — trusts body first. Attacker sends `{"userId":"<victim>","token":"<attackerDevice>"}` to bind their device to the victim's account (hijack the victim's notifications). | Ignore body `userId`; always use `req.user.id`. |
| 9 | **High** | `upload.controller.ts:34-57,95,114,155` + `s3.service.ts:50` | Unsafe upload + unauth + path write | `FileInterceptor` has no `limits`/`fileFilter`; client `mimetype` is trusted and objects are stored `ACL:'public-read'`. `POST /upload/test/file`, `GET /upload/presigned-url`, `POST /upload/local/:fileKey` have **no auth**. On S3 failure, `file.originalname` flows into `join(uploadsDir, ...)` + `writeFileSync` → `originalname` with `../` writes outside `public/uploads`; and an unauth attacker can store `evil.html`/`shell.svg` as public-read (stored XSS). | Require auth on all upload routes; enforce size + magic-byte MIME allow-list; use only the UUID + `path.basename` for the key; tighten ACL. |
| 10 | **High** | `users.service.ts:158-166,266-274` (search) | ReDoS | User `search` is compiled via `new RegExp(search,'i')` and `$or`-applied. `search=(x+x+)+y` → catastrophic backtracking, one request pins CPU (DoS). Same pattern via `$regex` in `user-report.service.ts:145`, `moderation.service.ts:469`. | `escapeRegExp(search)` before use (or `$text` index); cap input length. |
| 11 | **High** | `main.ts:173-180` global `ValidationPipe` | Weak input validation (root cause) | Configured with `skipMissingProperties:true` and **no `whitelist`/`forbidNonWhitelisted`**. Unknown fields survive into services — this is what makes findings #2 and the operator-injection below reachable, and enables mass-assignment generally. | Set `whitelist:true, forbidNonWhitelisted:true`; remove `skipMissingProperties` unless a route needs it. |
| 12 | **High** | login (`app.controller.ts:300`) + OTP (`auth.service.ts:241`) | No brute-force protection | No rate limiting/lockout on `/auth/login`, OTP verify, or refresh. 6-digit OTP + 10-min window + no attempt counter → brute-forceable; passwords guessable unlimited. | Throttle by IP+identifier, lock after N failures, cap OTP attempts to ~5. |
| 13 | **Medium** | `auth.service.ts:272` & `utils/otp-generator.ts` | Weak OTP randomness | OTP from `Math.floor(100000+Math.random()*900000)` — predictable, not cryptographic. | `crypto.randomInt(100000,1000000)`. |
| 14 | **Medium** | `common/encryption.util.ts` | Weak crypto | Hardcoded default key `'your_32_char_secret_key_here_123'`, raw `Buffer.from(KEY)` with no KDF/length check, AES-256-**CBC** with no authentication (malleable / padding-oracle-prone; `decrypt` trusts `iv:ct` format). | Fail closed if `ENCRYPTION_KEY` unset; derive 32-byte key via KDF; switch to `aes-256-gcm` with auth tag; validate input format. |
| 15 | **Medium** | `ads.controller.ts:673` (`getMyAds`) | NoSQL operator injection | Binds `@Body()` to an inline anonymous type (not a DTO class), so the pipe can't strip it. `{"soldOut":{"$ne":null},"search":{"$gt":""}}` reaches the query builder. Combined with #11 this is live. | Use a decorated DTO class + `whitelist:true`. |
| 16 | **Medium** | `ads.controller.ts:766` (`GET /ads/admin/all`) | Over-broad role | Admin "all ads" (supports `postedBy`, returns others' unapproved ads) is decorated `@Roles(ADMIN,SUPER_ADMIN,USER,SHOWROOM)` — any normal user gets the admin view. | Remove `USER`/`SHOWROOM`. |
| 17 | **Medium** | `category.controller.ts:36`, `product.controller.ts:37`, `vehicle.controller.ts:37` | Over-broad catalog writes | Category/product/vehicle create/update/delete open to `USER`/`SHOWROOM`. Since `SHOWROOM`/`USER` self-register freely (#1), an attacker can mutate global catalogs. No ownership check in controllers. | Restrict catalog writes to admin roles (or enforce ownership). |
| 18 | **Medium** | `main.ts:27` and `chat.gateway.ts` | CORS misconfig | `origin:'*'` combined with `credentials:true`. Browsers block that pairing, but it signals intent to allow any origin with credentials — tighten to an explicit allow-list before enabling cookies. | Set an explicit origin allow-list when using credentials. |
| 19 | **Medium** | `main.ts:70` (Swagger) | Prod info disclosure | `SwaggerModule.setup('docs', …)` is called unconditionally; `/docs` (full API surface, examples, schemas) is exposed in production. `app.config` has `ENABLE_SWAGGER` but it isn't consulted here. | Gate Swagger behind `NODE_ENV !== 'production'` (or auth). |
| 20 | **Medium** | `showroom.controller.ts:117,133`, `rating.controller.ts:64` | Ownership / spoofed identity | `PUT/DELETE /showrooms/:id` open to `USER`; `CreateRatingDto` carries a body `user` field. If the service trusts these rather than `req.user.id`, users can edit others' showrooms / post ratings as anyone. | Enforce owner-or-admin in service; derive `user` from `req.user.id`, ignore body. |
| 21 | **Medium** | `auth.service.ts:206` (`generateOTP` throws "User not found"), `userExists` | Account enumeration | Differing responses reveal whether an email/phone is registered. | Return a generic "if an account exists, an OTP was sent". |
| 22 | **Medium** | `auth.service.ts` / `local-strategy.ts:23` (multiple `console.log`) | PII in logs | `console.log` of trimmed username, parsed phone, and the full sanitized user object (name/email/phone) → PII in stdout/log aggregation. | Remove the debug `console.log`s. |
| 23 | **Low** | `roles.decorator.ts:5` | Metadata key collision | `IS_PUBLIC_KEY = 'roles'` equals `ROLES_KEY` — a `@Public()` flag would clobber `@Roles()`. | Use distinct metadata keys. |
| 24 | **Low** | two `RolesGuard`s (`roles/roles.guard.ts` vs `auth/guard/roles.guards.ts`) | Inconsistent role field | One checks `user.type||user.userType`, the other only `user.type`. Depending on which a route uses, checks can pass/fail wrong. | Consolidate to one guard + one field. |
| 25 | **Low** | `mongo-init.js:8-17` | Weak default DB creds | Hardcoded `adodad_user/adodad_password` (local docker mongo). Harmless if never used in prod, risky if copied. | Parameterize from env; don't ship default creds. |
| 26 | **Low** | `Dockerfile:51` | World-writable dir | `chmod -R 777 /app/logs`. | `750` owned by the `nestjs` user. |
| 27 | **Low** | token expiry config | Inconsistent TTL | `app.config` (access `1m`/refresh `4m`) vs `app.service` fallbacks (`1h`/`60d`) vs `docker-compose` (`86400000`) all disagree; access tokens can't be revoked (logout only clears refresh). | Pin one source; keep access TTL genuinely short. |

---

## Systemic themes

1. **No default-deny.** Authorization is applied guard-by-guard, so several state-changing routes ship with
   *no* guard (all `/users` creation, vehicle-inventory CSV uploads, `upload` test/local/presigned) and role
   sets are often too broad. The safest fix is a global authenticated-by-default posture with explicit opt-out.

2. **User-controlled `type`/identity trusted at the sink.** The `type` field is accepted from create/update
   DTOs (→ two privilege-escalation Criticals), and body-supplied ids (`fcm.userId`, likely `rating.user`)
   are trusted over `req.user.id`. Never let the client assert who they are or what role they hold.

3. **Untrusted input reaches dangerous sinks unvalidated.** The global pipe runs without `whitelist`, so
   unknown fields and Mongo operator objects survive; server-side fetches (chat audio, geocoding) don't
   validate the URL host (SSRF); filenames flow into filesystem paths (traversal); `search` compiles into
   regex (ReDoS). One config change (`whitelist:true`) plus per-sink validation closes most of this.

4. **Secrets management is good; secret *fallbacks* are not.** Real secrets are in SSM/gitignored `.env`
   (well done) — but the hardcoded fallback JWT secret in 8 files undermines that entirely if an env var
   is ever missing.

---

## Recommended fix order

1. **Kill the privilege-escalation paths (today):** guard `POST /users*` and force `type` server-side (#1);
   remove `type` from `UpdateUserDto` (#2). These are unauthenticated/self-service admin takeover.
2. **Fail-closed on secrets:** throw when `TOKEN_KEY` unset in prod; delete all fallback literals (#3).
3. **Lock unauthenticated writes/reads:** vehicle-inventory CSV (#6), upload routes (#9), path-traversal
   file serving (#5), notifications broadcast (#7), FCM token IDOR (#8).
4. **Block server-side SSRF** on chat audio + add timeout on geocoding (#4).
5. **Harden input globally:** `whitelist:true, forbidNonWhitelisted:true` (#11), escape regex search (#10),
   DTO-ify `getMyAds` (#15).
6. **Auth hygiene:** rate-limit login/OTP (#12), crypto-random OTP (#13), fix `encryption.util` (#14).
7. **Config/exposure:** gate Swagger in prod (#19), tighten CORS (#18), narrow over-broad roles (#16, #17).
8. **Cleanups:** enumeration (#21), PII logging (#22), metadata-key/guard consistency (#23, #24), infra (#25–27).

## What's already solid

Passwords use bcrypt with configurable rounds via a pre-save hook; refresh tokens are bcrypt-hashed at rest
and rotated (old token deleted) on refresh; deleted users are blocked at login; real secrets live in AWS SSM
(`taskdef.json`) and gitignored `.env`/firebase JSON (verified: not in git history); the Docker image runs as
a non-root user; Helmet is enabled and body sizes are capped; and the chat module's auth/rate-limit/participant
gaps were already remediated earlier today.
