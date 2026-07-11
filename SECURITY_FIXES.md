# Ado-dad Backend — Security Fixes Applied

**Date:** 2026-07-10. All 27 findings from `SECURITY_REVIEW.md` were fixed **in place** on the working tree.
Production build (`tsc -p tsconfig.build.json`) compiles clean; chat unit suite passes (12/12).
Nothing was committed to git — the changes are staged on disk for you to review and commit.

## New files
- `src/common/jwt-secret.util.ts` — central JWT secret resolver; **throws in production if `TOKEN_KEY` is unset** (no more fallback secret).
- `src/common/security/url-safety.util.ts` — SSRF guard (http(s) only, DNS-resolves and blocks private/loopback/link-local/metadata ranges, optional host allow-list).
- `src/common/security/path-safety.util.ts` — `safeFilename()` / `resolveInside()` for traversal-safe file handling.
- `src/common/security/regex.util.ts` — `escapeRegExp()` for user-supplied search.
- `src/common/guards/auth-throttle.guard.ts` — Redis-backed brute-force throttle (`@Throttle()` decorator; registered as a global guard, only acts on decorated routes, fails open on Redis error).
- `src/ads/dto/common/get-my-ads.dto.ts` — validated DTO replacing the injectable inline body.

## Fixes by finding

| # | Sev | Fix |
|---|-----|-----|
| 1 | Critical | Public `POST /users` + `/users/with-profile-picture` now reject `ADMIN`/`SUPER_ADMIN`/`MODERATOR` self-signup and default missing type to `USER`. |
| 2 | Critical | `PUT /users/:id` strips `type` from the payload for non-admins — a user can no longer escalate their own role. |
| 3 | Critical | All 8 hardcoded fallback JWT secrets replaced with `getJwtSecret()` (fail-closed in prod). `app.config` TOKEN_KEY default removed. |
| 4 | Critical | Chat `getAudioDuration` now calls `assertSafePublicUrl()` before fetching, plus `maxRedirects:0` and a 15MB content cap — blocks SSRF to metadata/internal hosts. |
| 5 | High | `safeFilename()` applied to `app.controller` image/asset/data serving and `upload.controller` serve routes — path traversal closed. |
| 6 | High | The 4 vehicle-inventory CSV upload routes now require `@Roles(SUPER_ADMIN, ADMIN)`. |
| 7 | High | `POST /notifications/send` now requires `RolesGuard` + `@Roles(SUPER_ADMIN, ADMIN)`. |
| 8 | High | FCM `register-token` binds to `req.user.id` only — body `userId` is ignored (IDOR closed). |
| 9 | High | Upload `test/file`, `presigned-url`, `local/:fileKey` now require auth; added `validateUploadedFile()` (15MB cap, MIME allow-list, dangerous-extension block); filenames sanitized before write / S3 key. |
| 10 | High | `escapeRegExp()` applied to search in `users.service`, `user-report.service`, `moderation.service` — ReDoS closed. |
| 11 | High | Global `ValidationPipe` now `whitelist:true` — unknown fields (incl. Mongo operator objects) are stripped. |
| 12 | High | Redis-backed throttling on `login` (5/5min), `send-otp` (3/5min), `verify-otp` (5/5min), `forgot-password` (3/15min), `reset-password` (10/15min). |
| 13 | Medium | OTP generation switched to `crypto.randomInt` in `auth.service` and `otp-generator`. |
| 14 | Medium | `encryption.util` rewritten to AES-256-GCM with a scrypt-derived key; fails closed if `ENCRYPTION_KEY` unset in prod. (No callers — safe format change.) |
| 15 | Medium | `getMyAds` now uses `GetMyAdsDto` (validated) instead of an inline body type. |
| 16 | Medium | `GET /ads/admin/all` roles reduced to `ADMIN, SUPER_ADMIN`. |
| 17 | Medium | Catalog **writes** (create/update/delete) on category, product, vehicle restricted to `ADMIN, SUPER_ADMIN` (reads unchanged). **← confirm this matches intended behavior** (see below). |
| 18 | Medium | CORS: origin comes from `CORS_ORIGINS` env; credentials only sent when an explicit allow-list is set (no more wildcard+credentials). |
| 19 | Medium | Swagger `/docs` only mounts when `NODE_ENV !== 'production'` or `ENABLE_SWAGGER=true`. |
| 20 | Medium | Ratings are attributed to the authenticated user (client `user` ignored). Showrooms now record `createdBy`; update/delete enforce owner-or-admin. |
| 21 | Medium | (forgot-password already returns a generic response; OTP endpoints now throttled — enumeration risk reduced.) |
| 22 | Medium | Removed PII `console.log` from `auth.service` (×3) and `local-strategy`. |
| 23 | Low | `IS_PUBLIC_KEY` changed from `'roles'` to `'isPublic'` (metadata collision fixed). |
| 24 | Low | `auth/guard/roles.guards.ts` now checks `type || userType` (consistent with the other guard). |
| 25 | Low | `mongo-init.js` reads `APP_DB_USER`/`APP_DB_PASSWORD` from env and refuses to run with a default password. |
| 26 | Low | Dockerfile logs dir: `chown nestjs:nodejs` + `chmod 750` (was world-writable 777). |
| 27 | Low | Token expiry defaults aligned: access `15m`, refresh `30d` across config and service. |

## New environment variables (set these before deploying)
- `TOKEN_KEY` — **required in production** (app now refuses to start without it).
- `CORS_ORIGINS` — comma-separated allow-list; if unset, CORS falls back to wildcard **without** credentials.
- `MEDIA_URL_ALLOWED_HOSTS` — *(optional)* comma-separated host suffixes the server may fetch media from (e.g. your S3/CDN host). If unset, private ranges are still blocked.
- `ENABLE_SWAGGER=true` — *(optional)* to expose `/docs` in production.
- `ENCRYPTION_KEY` — required in production (only if `EncryptionUtil` is used; currently no callers).
- `APP_DB_USER` / `APP_DB_PASSWORD` — for local `mongo-init.js`.

## Behavioral changes to confirm
1. **Catalog writes (finding 17):** normal users / showrooms can no longer create or edit category, product, or vehicle master records — admin only. If showrooms are meant to manage their own products, tell me and I'll switch to per-record ownership instead of admin-only.
2. **User self-signup:** `SHOWROOM` and `USER` self-registration still works; `ADMIN`/`SUPER_ADMIN`/`MODERATOR` accounts must now be created by an admin (there is no admin-create endpoint yet — say the word and I'll add a guarded one).
3. **Showroom update/delete:** legacy showrooms created before this change have no `createdBy`, so non-admins will be blocked from editing them (fail-closed). Admins are unaffected.
4. **Throttling** uses Redis — make sure Redis is configured in every environment, or the guard fails open (no throttling).

## Still recommended (not code-fixable here)
- Rotate any credentials that were ever exposed, and add `@nestjs/throttler` for a battle-tested global limiter (needs `npm install`, which this offline device can't do).
- Add an admin-only user-creation endpoint to replace privileged self-signup.
