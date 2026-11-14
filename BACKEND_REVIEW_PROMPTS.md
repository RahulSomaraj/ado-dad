# Ado-dad Backend — Code Review Prompt Pack

A reusable set of review prompts for the `ado-dad` NestJS backend (`E:\personal\personal\ado-dad-repo\ado-dad`).
Run them **one module at a time**. Each prompt is self-contained — paste it (or say "run Review N")
and the reviewer will read the listed files, then report findings.

**Stack context to include in every review:** NestJS 11, MongoDB via Mongoose 8, Socket.IO, Passport
(JWT + local + Firebase), AWS S3/SES, Redis, deployed via Docker/ECS. Auth is JWT (HS256 with `TOKEN_KEY`)
with an optional Firebase path. Global `ValidationPipe` runs with `skipMissingProperties: true`.

---

## How to use

For each review, the reviewer should:
1. Read every file in the **Scope** list (and any imports needed to judge them).
2. Evaluate against the **Review dimensions** below.
3. Report findings as a ranked table: **Severity** (Critical / High / Medium / Low / Info), **File:line**,
   **Category**, **What & why it's exploitable/problematic**, **Concrete fix**.
4. Rank most-severe first. For each Critical/High, give a concrete failure scenario (inputs → bad outcome).
5. End with a short "what's solid" note and a suggested fix order.

### Review dimensions (apply to every module)

**Security**
- AuthN/AuthZ: every route/event has the right `@UseGuards` + `@Roles`; no missing guards; no IDOR
  (can user A act on user B's resource by changing an id?); ownership/participant checks on reads *and* writes.
- Secrets: no hardcoded/fallback secrets reaching production; `.env` not committed; keys not logged.
- Input validation: DTOs validate & whitelist; `skipMissingProperties`/missing `whitelist` gaps;
  mass-assignment; NoSQL injection via unsanitized `$`-operators or user-controlled query objects.
- Output: no PII/token/password/hash leakage in responses or logs; error messages don't leak internals.
- Web: CORS `origin:'*'` + `credentials:true` mismatch; missing rate limits; SSRF on any server-side fetch
  (axios/image/URL); file upload type/size/content validation; path traversal.
- Crypto: password hashing (bcrypt rounds), token expiry/rotation, OTP randomness & expiry & attempt limits.

**Vulnerabilities**
- Injection (NoSQL/command/regex-DoS from user-supplied regex), prototype pollution, ReDoS in validators/moderation,
  unsafe `eval`/dynamic import of user data, deserialization, race conditions (TOCTOU) on create/update.

**Complexity / maintainability**
- Oversized files/functions (e.g. `ads.service.ts` ~116KB), deep nesting, duplicated logic, dead code,
  `any` overuse defeating type safety, commented-out code left in, magic numbers, inconsistent error handling.

**Performance / scalability**
- N+1 Mongo queries (loops of `findById`), missing indexes for hot queries, unbounded `find()` without limits,
  heavy aggregation on request path, missing pagination, blocking work in request lifecycle, missing caching.

**Correctness / robustness**
- Unhandled promise rejections, swallowed errors, wrong status codes, inconsistent response envelopes,
  time zone / date bugs, ObjectId vs string comparison bugs, missing transactions on multi-doc writes.

---

## Review 1 — Auth & Session

**Scope:**
`src/auth/auth.module.ts`, `auth.service.ts`, `auth.refresh.service.ts`,
`src/auth/guard/*` (jwt, local, firebase, refresh, roles, ws-guard),
`src/auth/passport-strategies/*`, `src/auth/schemas/schema.refresh-token.ts`,
`src/auth/dto/*`, plus `src/app.module.ts` JwtModule config and `src/config/app.config.ts`.

**Focus:** token signing/verification (alg confusion HS vs RS), fallback secret in prod, refresh-token
rotation/revocation & storage, guard coverage, roles logic (`user.type` vs `userType` mismatch),
Firebase strategy trust boundary, OTP/login brute-force protection, timing-safe comparisons.

---

## Review 2 — Users & User Reports

**Scope:**
`src/users/users.controller.ts`, `users.service.ts` (~55KB — expect complexity findings),
`user-report.controller.ts`, `user-report.service.ts`, `user-report.module.ts`, `users.module.ts`,
`src/users/dto/*`, `src/users/schemas/*`, `src/users/enums/*`, `src/users/seed/add-super-admin.ts`.

**Focus:** IDOR on profile/report endpoints, privilege escalation (can a USER set their own role/type?),
mass-assignment via update DTOs, PII exposure in responses, password/OTP handling, phone/email validation,
the size/complexity of `users.service.ts`, seed script leaving default admin credentials.

---

## Review 3 — Ads (v1)

**Scope:**
`src/ads/controllers/*` (ads.controller.ts, lookup, validation pipe),
`src/ads/services/*` (ads.service.ts ~116KB, ads.service.utils.ts, commercial-vehicle-detection,
data-validation, lookup), `src/ads/schemas/*`, `src/ads/dto/**`.

**Focus:** authZ on create/edit/approve/delete (owner vs admin), the approval workflow, NoSQL injection in
filter building (`filter-ad.dto` → query), unbounded queries/pagination, the massive service file
(decomposition opportunities, duplicated branches per ad category), image/URL handling.

---

## Review 4 — Ads v2 (DDD module)

**Scope:**
`src/ads-v2/ads.v2.controller.ts`, `ads.v2.module.ts`,
`src/ads-v2/application/use-cases/*` (list-ads.uc.ts ~49KB, create-ad, get-by-id, seller-stats, profile-stats),
`src/ads-v2/domain/*`, `src/ads-v2/infrastructure/repos/*`, `infrastructure/services/*`
(idempotency, outbox, cache, vehicle-inventory.gateway), `src/ads-v2/dto/*`, `controllers/location-config.controller.ts`.

**Focus:** idempotency & outbox correctness (races, at-least-once side effects), cache key/permission bleed,
the huge `list-ads.uc.ts` (query builder injection + complexity), gateway SSRF/timeouts, authZ parity with v1.

---

## Review 5 — Chat & Realtime  *(already reviewed + fixed 2026-07-10 — re-verify only)*

**Scope:** `src/chat/**`, `src/auth/guard/ws-guard.ts`, `src/shared/redis-io.adapter.ts`.

**Focus:** confirm the applied fixes hold (WsJwtGuard + RateLimitGuard enabled, participant check on
`getRoomMessages`, no default secret in prod, no token logging). Then check remaining items: admin methods
without guarded routes, room-wide vs per-user read receipts, CORS, audio dynamic-import/`eval` in chat.service.

---

## Review 6 — Notifications & FCM

**Scope:**
`src/notifications/**` (notifications.controller, producer, worker, dto/broadcast, queue/redis-queue),
`src/notifications/fcm/**` (service, token service, controller, repositories, schemas),
`src/firebase/firebase.service.ts`, `src/config/fcm.config.ts`.

**Focus:** who can broadcast (authZ on broadcast endpoint), token ownership/spoofing, queue worker error
handling & retries/poison messages, Firebase admin credential loading (the committed
`ado-dad-firebase-adminsdk-*.json` — flag as leaked secret), fan-out performance.

---

## Review 7 — Moderation & Suspensions

**Scope:**
`src/moderation/**` (controller, service ~21KB, suspension guard, dto, schemas: suspension, strike,
appeal, admin-action-log, moderation-settings), `src/chat/services/content-moderation.service.ts`.

**Focus:** admin-only enforcement on all actions, audit-log integrity/immutability, suspension guard bypass,
ReDoS in profanity/spam/PII regexes, appeal workflow authZ, fail-open moderation behavior.

---

## Review 8 — Uploads & Shared Services

**Scope:**
`src/shared/upload.controller.ts`, `upload.module.ts`, `s3.service.ts`, `redis.service.ts` (~16KB),
`redis.module.ts`, `exception-service.ts`, `common/encryption.util.ts`, `src/utils/*`
(email.service, file-parser.util, otp-generator), `src/interceptors/logging.interceptors.ts`.

**Focus:** upload MIME/size/content sniffing & S3 key path traversal, presigned-URL scope, `otp-generator`
randomness (Math.random vs crypto), `encryption.util` algorithm/IV/key handling, email header injection,
CSV/file parser injection, Redis command injection / key namespacing, error filter leaking stack traces.

---

## Review 9 — Vehicle Inventory & Catalog Modules

**Scope:**
`src/vehicle-inventory/**` (manufacturers.controller/service ~20KB, vehicle-inventory.controller/service ~67KB,
dto/**, schemas/**, scripts/**, seed/**), plus the small catalog modules:
`src/vehicles/**`, `src/banner/**`, `src/category/**`, `src/product/**`, `src/cart/**`, `src/rating/**`,
`src/favorites/**`, `src/showroom/**`, `src/app-version/**`.

**Focus:** authZ (which catalog writes should be admin-only?), the very large inventory service (complexity),
`filter-vehicle-model.dto.ts` (~34KB — validation/injection surface), seed/fix scripts run against prod DB,
IDOR on cart/favorites/rating (user scoping), unbounded catalog listings.

---

## Review 10 — Cross-cutting: Config, Bootstrap, Infra, Dependencies

**Scope:**
`src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.service.ts`,
`src/config/*` (app, mongo, redis, fcm), `src/common/**` (guards, decorators, services, base, test-safety),
`src/roles/**`, root: `Dockerfile`, `docker-compose*.yml`, `.env*` (flag committed env files),
`ecosystem.config.js`, `taskdef*.json`/`*-task-def.json`, `package.json`, `tsconfig*.json`, `mongo-init.js`.

**Focus:** committed secrets (`.env`, `.env.prod`, `.env.uat`, firebase json), CORS/helmet config,
global pipe `skipMissingProperties` weakening validation, body-size limits, Swagger exposed in prod,
Mongo connection options, Docker running as root / secrets in image, ECS task-def secrets,
dependency risk (outdated/duplicate: bcrypt + bcryptjs, passport versions), graceful-shutdown correctness.

---

## Consolidated deliverable (after all 10)

After running the module reviews, produce a single **Backend Security & Quality Report** that:
- Aggregates all findings into one severity-ranked register (ID, module, severity, category, fix, effort).
- Summarizes systemic themes (e.g. "authZ ownership checks missing across N modules", "committed secrets",
  "oversized services") rather than repeating per-file detail.
- Gives a prioritized remediation roadmap: (1) secrets rotation & removal, (2) authZ/IDOR, (3) injection/validation,
  (4) complexity refactors, (5) performance.
- Notes what is already well-implemented.
