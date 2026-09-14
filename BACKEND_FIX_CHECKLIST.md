# AdoDad API — Backend Fix Checklist

Derived from `BACKEND_AUDIT.md` (repo `ado-dad`, branch `develop`).
Every item is independently shippable unless it carries a **⛓ C#** coordination tag (see §Coordination).

**Working rule:** one fix per cycle — *analyse → root cause → implement one → test → measure → tick → next*. Never combine unrelated fixes. No perf claim without a before/after measurement.

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked · ⛓ needs frontend coordination

---

## P0 — Security (ship independently of the perf work)

### [ ] P0-1 ⛓C3 — Strip seller PII from the public list projection *(S1, Critical)*
`src/ads-v2/application/use-cases/list-ads.uc.ts:655-682, 727-740, 748-780`

- [ ] Frontend confirms **no list screen** reads `ad.user.email` / `ad.user.phone` / `ad.user.countryCode` (detail screen keeps using the detail response)
- [ ] Remove `email`, `phoneNumber`, `countryCode` from the `$lookup` users projection (`:655-682`)
- [ ] Remove them from the `$addFields` user object (`:727-740`)
- [ ] Remove them from the final `$project` (`:748-780`)
- [ ] Confirm `GET /v2/ads/:id` still returns the seller phone (call/chat buttons depend on it)
- [ ] Optional hardening: move contact reveal to a throttled, authenticated `POST /v2/ads/:id/contact` that can be audited
- [ ] Purge any cached list payloads that still carry PII (`ads:v2:list:*`) on deploy

**Accept:** `curl -s -X POST …/v2/ads/list | jq '.data[0].user'` contains no `email`/`phoneNumber`/`countryCode`. Mobile list + detail screens still render and the call button works.
**Blocked until:** frontend agent reports back on C3.

### [~] P0-2 — Rate-limit the public v2 read endpoints *(S2, High)*
`src/ads-v2/ads.v2.controller.ts` · reuse `src/common/guards/auth-throttle.guard.ts`

- [x] `@Throttle({ name: 'adsList', limit: 60, ttl: 60 })` on `POST /v2/ads/list`
- [x] `@Throttle({ name: 'adsDetail', limit: 120, ttl: 60 })` on `GET /v2/ads/:id`
- [x] `@Throttle({ name: 'sellerStats', limit: 60, ttl: 60 })` on `GET /v2/ads/sellers/:id/stats`
- [x] Confirm `AuthThrottleGuard` is reached (it is a global `APP_GUARD` in `app.module.ts:139`)
- [ ] Verify `x-forwarded-for` is trusted correctly behind the proxy — set `app.set('trust proxy', 1)` if the bucket key resolves to the LB IP for everyone
- [x] Confirm fail-open behaviour on Redis outage is preserved (guard untouched)

**Accept:** 61 rapid list calls from one IP → 60×200 then 429. Redis down → all 200 (fail open).

### [ ] P0-4 — Drop `skipMissingProperties: true` *(S3, Medium)*
`src/main.ts:184-192`

- [ ] Remove `skipMissingProperties: true` from the global `ValidationPipe`
- [ ] Keep `whitelist: true`
- [ ] Run the full test suite and smoke every write endpoint — required-field violations will now surface as 400s
- [ ] For each break, decide: genuinely optional field → add `@IsOptional()`; genuinely required → fix the caller
- [ ] Pay special attention to PATCH/PUT DTOs that were relying on partial bodies — those need `PartialType()` or explicit `@IsOptional()`
- [ ] Re-run the mobile app against the branch: create ad, update ad, mark sold, profile update, chat

**Accept:** `POST /v2/ads` with a body missing `description` returns 400, not a Mongo-level failure. No previously-working client call regresses.

### [~] P0-5 — Make `CORS_ORIGINS` mandatory in production *(S4, Medium)*
`src/main.ts:29-53`

- [x] Throw at bootstrap when `NODE_ENV === 'production'` and `CORS_ORIGINS` is empty
- [x] Keep `origin: '*'` only for non-production
- [x] Keep `credentials: corsOrigins.length > 0`
- [ ] Set `CORS_ORIGINS` in `.env.prod` and `.env.uat` before deploying
- [ ] Document the variable in `env.example`

**Accept:** prod boot without `CORS_ORIGINS` fails fast with a clear message; with it set, only listed origins get an `Access-Control-Allow-Origin`.

### [~] P0-6 — Replace manual JWT verification with an optional-auth guard *(S5, Medium)*
`src/ads-v2/ads.v2.controller.ts:58-75` (used at `:387` and `:472`)

- [x] Add an `OptionalJwtAuthGuard` that reuses the existing JWT strategy and resolves to `req.user = null` instead of throwing when no/invalid token — `src/auth/guard/optional-jwt-auth-guard.ts`
- [!] Assert `issuer: 'ado-dad-api'` / `audience: 'ado-dad-users'` — **deliberately deferred, do not ship blind.** `JwtStrategy` (`auth/passport-strategies/jwt-strategy.ts:18-22`) asserts neither, and `AuthModule`'s `JwtModule` (`auth/auth.module.ts:30-37`) registers **no** `signOptions`, so live tokens may well have been minted without those claims. Turning the assertion on would log every existing session out.
  - [ ] Find where access tokens are actually signed and confirm the claims are present
  - [ ] Only then add `issuer`/`audience` to `JwtStrategy`'s `super()` options, and ship it behind a grace period (accept tokens with or without the claims for one token lifetime)
- [x] Check the user still exists — `JwtStrategy.validate()` already does a `findById`, which the manual path skipped entirely
- [x] Apply the suspension check — implemented **inside** the optional guard (banned / actively-suspended → anonymous) rather than via `SuspensionGuard`, so public reads keep returning 200 and no extra DB round trip is added. `SuspensionGuard` still guards mutating routes with its 403
- [x] Apply to `POST /v2/ads/list` and `GET /v2/ads/:id`
- [x] Delete `extractUserIdFromToken` and the now-unused `JwtService` / `ConfigService` / `getJwtSecret` imports

**Accept:** a token signed with the right secret but wrong issuer is rejected; a suspended user's request is treated as anonymous (or 403, per product decision); anonymous requests still return 200 with `isFavorite: false`.

---

## P1 — Major performance

### [ ] P1-2 ⭐ — Make the geo path cacheable (geo-bucket the list cache key) *(F1, Critical)*
`src/ads-v2/application/use-cases/list-ads.uc.ts:109-160`
**This is the designated first performance task.**

- [ ] **Capture the baseline first** (see §Measurement) — no baseline, no ship
- [ ] Stop returning `null` from `generateListCacheKey()` when `latitude`/`longitude` are present (`:131-135`, `:148-152`)
- [ ] Quantise coords: `geoBucket = ${lat.toFixed(2)}:${lng.toFixed(2)}` (≈1.1 km cells)
- [ ] Include the **effective** radius in the key (`maxDistance`, or the fallback threshold actually used — not the requested one)
- [ ] Extend Scenario 1 (no filters) and Scenario 2 (category + textual location) to accept a geo component
- [ ] Add Scenario 3: `category + geoBucket`
- [ ] Keep returning `null` for high-cardinality shapes: free-text `search`, price ranges, multi-select id filters
- [ ] Keep `CACHE_TTL` at 300 s; keep writing through `AdsCache.setList` so existing tag invalidation on ad writes keeps working
- [ ] **Guard:** cached `CachedListData` must stay user-agnostic — `isFavorite` is applied *after* the cache read (`exec()` `:83-88`). `userId` must never enter the key
- [ ] Add Redis hit/miss counters for `ads:v2:list:*`
- [ ] Publish before/after numbers

**Do not** in this task: change the response shape, remove the count query, or touch `$geoNear`.
**Accept:** two users 500 m apart with the same filters share one cache entry. Hit rate goes from 0 % to a meaningful fraction. p95 falls for cached buckets; cold-bucket latency unchanged.

### [ ] P1-3 ⛓C1 — Kill the duplicate count aggregation *(F2, Critical)*
`src/ads-v2/application/use-cases/list-ads.uc.ts:396-408, 805-830`

- [ ] Frontend ships first: delete `hasNext = (page*limit) < total` at `add_repo.dart:93-95` and consume the server's `hasNext`
- [ ] Derive `hasNext` from a `limit + 1` over-fetch (the cursor branch at `:818-825` already does this — reuse it)
- [ ] Make `includeTotal` default to `false`
- [ ] Stop calling `buildSimplifiedCountPipeline()` unless `includeTotal === true`
- [ ] Keep returning `total`/`totalPages` as `null` (or omit) when not requested — confirm the client tolerates it
- [ ] Measure Mongo ops/sec before and after (expect ≈50 % drop on the list path)

**Accept:** one aggregation per list request. `hasNext` still correct on the last page and on an exactly-full page.

### [ ] P1-5 — Cache `GET /v2/ads/:id` *(F3, High)*
`src/ads-v2/application/use-cases/get-ad-by-id.uc.ts` · `ads-cache.ts`

- [ ] Read through `AdsCache.getById` before hitting Mongo
- [ ] Write through `AdsCache.setById` (TTL 300 s) — currently `setById` exists and is called from nowhere
- [ ] Invalidate via `AdsCache.invalidateById` on: v2 create, v1 update, v1 mark-sold, v1 delete, admin approve/reject, moderation actions
- [ ] Keep the cached payload user-agnostic — apply `isFavorite` and any view-count side effects after the cache read
- [ ] Confirm a view-count increment (if any) is not skipped by the cache

**Accept:** second open of the same ad serves from Redis; editing the ad reflects immediately.

### [ ] P1-6 — Cache vehicle-inventory reference data *(F6, Medium)*
`src/ads-v2/infrastructure/services/vehicle-inventory.gateway.ts:180-205` · `vehicle-inventory.service.ts`

- [ ] Cache manufacturers / models / variants / fuel types / transmission types in Redis, key `ads:v2:inventory:<type>`, TTL 1 h
- [ ] Wrap `VehicleInventoryGateway.get*ByIds` so `batchFetchInventoryItems` (`list-ads.uc.ts:876-985`) stops issuing 5 Mongo queries per list response
- [ ] Cache the `/vehicle-inventory/*` controller reads the filter sheet calls
- [ ] Add an admin-triggered invalidation (or accept the 1 h staleness explicitly)

**Accept:** a warm list request issues 0 inventory queries to Mongo.

---

## P2 — Architecture

### [ ] P2-2 ⛓C2 — Add `GET /v2/ads/list` with ETag *(F7, Medium)*
`src/ads-v2/ads.v2.controller.ts` · `dto/list-ads-v2.dto.ts`

- [ ] Add a `@Get('list')` route taking the same filters as query params
- [ ] Reuse `ListAdsUc` unchanged
- [ ] Emit `ETag` (hash of the response body) and honour `If-None-Match` → 304
- [ ] Set a sane `Cache-Control` (e.g. `public, max-age=60`) — but only once PII is out of the payload (**P0-1 must ship first**)
- [ ] Keep `POST /v2/ads/list` alive for one full release
- [ ] Frontend switches `fetchAllAds` to `_dio.get` and enables conditional requests
- [ ] Remove POST one release after the client has migrated

### [ ] P2-4 — Invalidate the favourites cache *(F9, Medium — correctness)*
`src/favorites/favorite.service.ts` · `list-ads.uc.ts:1460-1497`

- [ ] `DEL ads:v2:userFavorites:{userId}` on favourite **add**
- [ ] `DEL ads:v2:userFavorites:{userId}` on favourite **remove**
- [ ] Do the same on any bulk/clear favourites path
- [ ] Replace the `Array.includes` scan in `addIsFavoriteToAds` with a `Set` (O(n·m) → O(n))

**Accept:** toggle a heart, refetch the list immediately — state is correct with no 5-minute lag and no optimistic-update revert.

### [ ] P2-5 ⛓C5 — Retire the v1 `/ads` write path *(S6, Low/Med)*
- [ ] Frontend migrates `postAd` / `updateAd` / `deleteAd` / `markAdAsSold` / `fetchAdsByUserId` onto v2
- [ ] Port any v1-only authz rules onto v2 and diff the two authorization surfaces before deleting anything
- [ ] Keep `/ads` write routes alive until client telemetry shows zero traffic
- [ ] Delete `src/ads/services/ads.service.ts` (112 KB)

### [ ] P2-7 — Split `list-ads.uc.ts` (1 498 lines)
- [ ] Extract the pipeline builder
- [ ] Extract the cache-key policy
- [ ] Extract inventory hydration
- [ ] Extract DTO mapping
- [ ] Do this **after** P1-2/P1-3 land, so the diffs stay reviewable

---

## P3 — Optimization

### [ ] P3-2 — Delete the dead `locationScore` stage *(F4, High)*
- [ ] Remove the `$addFields` locationScore stage (`location-hierarchy.service.ts:324-400`, wired at `list-ads.uc.ts:348-353`)
- [ ] Remove `locationScore` from the `$project` (`:778`)
- [ ] Confirm nothing sorts on it — the `$sort` was deliberately removed (see comment at `:615-623`)
- [ ] Check the frontend never reads `locationScore` off a row
- [ ] Measure: it runs before `$skip`/`$limit`, i.e. over every doc in the radius

### [ ] P3-3 — Query timeouts and pool sizing *(F8, Medium)*
- [ ] Add `maxTimeMS` (start at 5 000 ms) to every ads aggregation in `ad.repo.ts:394-396`
- [ ] Decide `allowDiskUse` explicitly
- [ ] Add a read preference if reading from a secondary is acceptable
- [ ] Only **after** P1-2/P1-3 reduce load: re-measure pool checkout wait, then raise `maxPoolSize` off 10 (`app.module.ts:79`)
- [ ] Alert on `maxTimeMS` expirations so timeouts don't hide a regression

### [ ] P3-5 — Cap the distance fallback *(F5, High)*
`list-ads.uc.ts:194-222`

- [ ] Replace `[50, 100, 200, 500, 1000]` with at most two radii (e.g. `[200, 1000]`)
- [ ] Or: widen `maxDistance` once and sort by distance instead of looping
- [ ] Make sure the non-geo page-1 fallback still triggers for genuinely empty regions
- [ ] Measure worst-case latency in a sparse pincode before/after

### [ ] P3-7 — Re-test a compound `2dsphere` index *(F10 note)*
- [ ] Verify the claim in the comment at `ad.schema.ts:172-175` is wrong (it is: Mongo supports compound `2dsphere` and multiple geo indexes)
- [ ] Try `{ geoLocation: '2dsphere', isActive: 1, isApproved: 1, soldOut: 1, isDeleted: 1 }`
- [ ] Confirm with `explain("executionStats")` that the `$geoNear` `query` filters become index-served instead of post-filtered per document
- [ ] Compare `totalDocsExamined` before/after on a dense city
- [ ] Only keep it if the numbers justify the extra write cost

### [ ] P3-8 ⛓C4 — Fix the `commercialVehicleTypes` filter
- [ ] Verify the server filter against the `commercialVehicleDetails` sub-document
- [ ] Confirm page sizes are correct once the filter actually applies
- [ ] Report to the frontend, then they delete the defensive re-filter at `add_repo.dart:104-114`

---

## P4 — Cleanup

- [ ] **P4-2** Prune redundant single-field `Ad` indexes that duplicate compound prefixes — `{isActive:1}`, `{soldOut:1}`, `{isApproved:1}`, `{status:1}` (`ad.schema.ts:120-175`). Confirm each with `explain()` before dropping; drop one per deploy.
- [ ] **P4-3** Delete `src/app.module.ts.bak`, `temp-task-def.json`, `updated-task-def.json`, `new-task-def.json`
- [ ] **S7** Local hygiene: the Firebase service-account JSON and `.env*` files in the repo root are correctly gitignored — confirm they have never been committed (`git log --all --full-history -- '*firebase-adminsdk*'`) and rotate if they were

---

## Coordination gates (do not ship unilaterally)

| # | Change | Order |
|---|---|---|
| **C1** | `hasNext` stops depending on `total` | **Frontend first**, then backend drops the count query |
| **C2** | `POST /v2/ads/list` → `GET /v2/ads/list` | **Backend ships GET first**, frontend migrates, POST removed after one release |
| **C3** | Seller `email`/`phoneNumber` out of list rows | **Frontend audits and confirms**, then backend ships. Shipping blind breaks call/chat buttons |
| **C4** | `commercialVehicleTypes` server filter | **Backend fixes and confirms**, then frontend removes the workaround |
| **C5** | Retire v1 `/ads` writes | **Frontend migrates first**, backend deletes after |

---

## Measurement checklist (run before and after every perf item)

- [ ] Redis hit rate on `ads:v2:list:*` and `ads:v2:byId:*`
- [ ] p50 / p95 / p99 latency of the list endpoint
- [ ] Mongo ops/sec and `$geoNear` scan counts (`explain("executionStats")` on the geo pipeline)
- [ ] `totalDocsExamined` / `totalKeysExamined` on the list aggregation
- [ ] Node event-loop lag
- [ ] Mongo connection-pool checkout wait time
- [ ] Replay a realistic mix: Home feed with coords, category + coords, similar-ads strip

## Non-regression guards (must stay true after every change)

- [ ] Redis keeps **failing open** — a Redis outage degrades to no-cache, never to errors
- [ ] `getJwtSecret()` keeps **failing closed** in production
- [ ] Tag-based cache invalidation on ad writes keeps working
- [ ] `whitelist: true` stays on the global `ValidationPipe`
- [ ] Body size limits, helmet, compression and graceful shutdown untouched
- [ ] Post-pagination `$lookup` ordering in the list pipeline preserved
- [ ] No response-shape change without a §Coordination entry — the Flutter client parses strictly
