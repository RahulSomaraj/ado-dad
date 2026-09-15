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

### [~] P1-2 ⭐ — Make the geo path cacheable (geo-bucket the list cache key) *(F1, Critical)*
`src/ads-v2/application/use-cases/list-ads.uc.ts:109-160`
**This is the designated first performance task.**

- [ ] **Capture the baseline first** (see §Measurement) — no baseline, no ship
- [x] Stop returning `null` from `generateListCacheKey()` when `latitude`/`longitude` are present (`:131-135`, `:148-152`)
- [x] Quantise coords: `geoBucket = ${lat.toFixed(2)}:${lng.toFixed(2)}` (≈1.1 km cells)
- [x] Include the radius in the key — the **requested** `maxDistance`, or `auto` when omitted. The fallback ladder is deterministic for a given filter set, so `auto` identifies that shape unambiguously; there is no need (and no way, at key-generation time) to know which rung will win
- [x] Replaced the three scenario branches with a single allow-list key builder — `category`, `location`, `geo`, `listingType`, pagination, sort, `includeTotal`. **This also fixed a live cache-poisoning bug:** the old Scenario 1/2 guards ignored `manufacturerIds`, `modelIds`, `propertyTypes`, the year/bedroom/area ranges and the boolean property filters, so e.g. `{ propertyTypes: ['villa'] }` matched "Scenario 1: all ads" and could be served an entry built for a different filter set
- [x] Keep returning `null` for high-cardinality shapes: free-text `search`, price ranges, multi-select id filters
- [x] Keep `CACHE_TTL` at 300 s; keep writing through `AdsCache.setList` so existing tag invalidation on ad writes keeps working
- [x] **Guard:** cached `CachedListData` must stay user-agnostic — `isFavorite` is applied *after* the cache read (`exec()` `:83-88`). `userId` must never enter the key
- [x] Hit/miss/uncacheable counters — in-process, logged every 500 list requests as `ads:v2:list cache — requests=… hitRate=…%`, so no metrics dependency was added
- [ ] **Capture the after-numbers and compare** — the only step left on this item

**Do not** in this task: change the response shape, remove the count query, or touch `$geoNear`.
**Accept:** two users 500 m apart with the same filters share one cache entry. Hit rate goes from 0 % to a meaningful fraction. p95 falls for cached buckets; cold-bucket latency unchanged.

### [x] P1-2b — v1 writes must invalidate the v2 caches *(new finding, prerequisite for P1-2)*
`src/ads/services/ads.service.ts` · `src/ads/ads.module.ts`

Found while shipping P1-2: `AdsService.invalidateAdCache()` only cleared v1's own `AdsService.CACHE_PREFIX` keys. Every write still goes through v1, so nothing ever cleared the `ads:v2:*` namespace. Before P1-2 that only affected two narrow cached shapes; after it, an edited/sold/deleted ad would sit in the v2 feed for up to 5 minutes.

- [x] Inject `AdsCache` into `AdsService` and call `invalidateLists()` + `invalidateById(adId)` from `invalidateAdCache()`
- [x] Provide `AdsCache` in `AdsModule` (it only depends on the global `RedisService`, so no module cycle and no shared state)
- [x] `updateSoldOut()` now calls `invalidateAdCache()` — **it previously invalidated nothing at all**, in either namespace
- [ ] Verify by hand: edit an ad → refetch the feed immediately → the change is visible; mark an ad sold → it disappears from the feed at once

### [ ] P1-3 ⛓C1 — Kill the duplicate count aggregation *(F2, Critical)*
`src/ads-v2/application/use-cases/list-ads.uc.ts:396-408, 805-830`

- [ ] Frontend ships first: delete `hasNext = (page*limit) < total` at `add_repo.dart:93-95` and consume the server's `hasNext`
- [ ] Derive `hasNext` from a `limit + 1` over-fetch (the cursor branch at `:818-825` already does this — reuse it)
- [ ] Make `includeTotal` default to `false`
- [ ] Stop calling `buildSimplifiedCountPipeline()` unless `includeTotal === true`
- [ ] Keep returning `total`/`totalPages` as `null` (or omit) when not requested — confirm the client tolerates it
- [ ] Measure Mongo ops/sec before and after (expect ≈50 % drop on the list path)

**Accept:** one aggregation per list request. `hasNext` still correct on the last page and on an exactly-full page.

### [~] P1-5 — Cache `GET /v2/ads/:id` *(F3, High)*
`src/ads-v2/application/use-cases/get-ad-by-id.uc.ts` · `ads-cache.ts`

- [x] Read through the cache before hitting Mongo — added `AdsCache.byIdKey()` so the read uses the same key format `setById` writes
- [x] Write through `AdsCache.setById` (TTL 300 s) — it existed and was called from nowhere
- [x] Invalidate via `AdsCache.invalidateById` on v1 update / delete / approval / mark-sold — covered by P1-2b, since all four route through `invalidateAdCache()`
- [x] Cached payload stays user-agnostic: stored in the `anonymous` slot, with `isFavorite`, `favoritesCount`, chats and ratings layered on after the read, and the response spread into a fresh object so the cached one is never mutated
- [x] View count stays exact: the fire-and-forget `$inc` became `AdRepository.incrementViewCount()` (a `findOneAndUpdate` returning the new value, run inside the same `Promise.all`) — same single write, but the displayed count no longer comes from a cached snapshot

**Accept:** second open of the same ad serves from Redis (no aggregation in the Mongo profiler); editing the ad reflects immediately; the view count still advances by one per open.
- [ ] Measure before/after

### [~] P1-6 — Cache vehicle-inventory reference data *(F6, Medium)*
`src/ads-v2/infrastructure/services/vehicle-inventory.gateway.ts:180-205` · `vehicle-inventory.service.ts`

- [x] Cached in Redis under `ads:v2:inventory:<kind>:<id>`, TTL 1 h — **per id, not per collection**, so the list batch path and the single-item detail path share entries
- [x] All five `get*ByIds` and all five singular `get*` methods now read through the cache and load only the misses; fails open on any Redis error. `assertRefs()` deliberately still reads Mongo — validation must stay authoritative
- [ ] Cache the `/vehicle-inventory/*` controller reads that the filter sheet calls (separate service, not yet done)
- [ ] Add an admin-triggered invalidation, or accept the 1 h staleness explicitly (currently accepted)

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

### [x] P2-4 — Invalidate the favourites cache *(F9, Medium — correctness)*
`src/favorites/favorite.service.ts` · `list-ads.uc.ts:1460-1497`

- [x] `DEL ads:v2:userFavorites:{userId}` on favourite **add**
- [x] `DEL ads:v2:userFavorites:{userId}` on favourite **remove** (both the toggle branch in `addFavorite` and `removeFavorite`)
- [x] Also on `updateFavorite` (re-points a favourite at a different ad). Invalidation is wrapped in try/catch — a Redis failure must never fail the favourite itself
- [x] `addIsFavoriteToAds` now builds a `Set` (O(n·m) → O(n)), with an early exit when the user has no favourites

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

### [x] P3-2 — Delete the dead `locationScore` stage *(F4, High)*
- [x] Removed the `$addFields` locationScore push from the list pipeline. `LocationHierarchyService.getLocationScoringStage()` itself is left in place — dead code now, delete it once nothing else references it
- [x] Removed `locationScore` from the `$project`
- [x] Confirmed nothing sorts on it — the `$sort` was deliberately removed earlier, and `$geoNear` already emits nearest-first
- [ ] Check the frontend never reads `locationScore` off a row — **the one open item here**, since the field has left the response
- [ ] Measure: it runs before `$skip`/`$limit`, i.e. over every doc in the radius

### [~] P3-3 — Query timeouts and pool sizing *(F8, Medium)*
- [x] `maxTimeMS: 5000` on both `AdRepository.aggregate()` and `aggregateOneByIdDetailed()`, overridable per call
- [x] `allowDiskUse` decided explicitly: left **off**, with a comment saying a stage that needs disk is a pipeline bug to fix rather than a flag to flip
- [ ] Add a read preference if reading from a secondary is acceptable (not done — needs a call on replica-set topology and staleness)
- [ ] Only **after** P1-2/P1-3 reduce load: re-measure pool checkout wait, then raise `maxPoolSize` off 10 (`app.module.ts:79`)
- [ ] Alert on `maxTimeMS` expirations so timeouts don't hide a regression

### [x] P3-5 — Cap the distance fallback *(F5, High)*
`list-ads.uc.ts:194-222`

- [x] `[50, 100, 200, 500, 1000]` → `[200, 1000]`. Result-equivalent for dense areas — `$geoNear` returns nearest-first, so a 200 km radius yields the same first page as a 50 km one whenever anything exists within 50 km — and at most two aggregations instead of six in sparse ones
- [x] (alternative not needed — see above)
- [x] The non-geo page-1 fallback after the ladder is untouched and still triggers for genuinely empty regions
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
- [ ] **P4-3** Delete `src/app.module.ts.bak`, `temp-task-def.json`, `updated-task-def.json`, `new-task-def.json` — **must be done locally**: this session can write files to the repo but cannot delete them
- [ ] **S7** Local hygiene: the Firebase service-account JSON and `.env*` files in the repo root are correctly gitignored — confirm they have never been committed (`git log --all --full-history -- '*firebase-adminsdk*'`) and rotate if they were

---

## D — Ad detail page support (2026-09-15, for mobile pass 5)

Written in a Cowork session; `tsc --noEmit` over `ads.v2.module` + `ads.module`
is clean and the new unit spec passes (9 tests). **Not committed, not run
against Mongo/Redis.**

### [~] D-1 — Sold ads load on `GET /v2/ads/:id`
`get-ad-by-id.uc.ts` — removed `soldOut: false` from `$match`. Lists still exclude sold ads.
- [x] Response already carried `soldOut`; the app now renders a SOLD state
- [ ] Smoke: mark an ad sold → open it from chat / wishlist → 200 with `soldOut: true`
- [ ] Decide separately: should `isRemovedByAdmin` / `status: rejected` ads 404 for non-owners? (they don't today)

### [~] D-2 — Chat rooms on detail are owner/staff-only; exact `chatsCount`
- [x] `chats` (participant names/emails, last message text) now only for `postedBy === userId` or `SA`/`AD`/`MO`; everyone else gets `[]`
- [x] `chatsCount` = `countDocuments` (was `rooms.length` after `.limit(10)`)
- [ ] Check ado_dad_admin still shows chats on the ad page (admin token → `type` `SA`/`AD`)

### [~] D-3 — `priceHistory`
- [x] `Ad.priceHistory: [{ price, changedAt }]` (no `_id`, capped at `PRICE_HISTORY_LIMIT` = 20)
- [x] `AdsService.update` appends the outgoing price when `price` changes (`appendPriceHistory`, unit-tested)
- [x] Detail response: `priceHistory` (last 5), `previousPrice`, `priceChangedAt`
- [ ] Smoke: edit price 5,00,000 → 4,85,000 → detail has `previousPrice: 500000`
- Note: only v1 `PATCH /ads/:id` changes price today; if a v2 update path is added it must call `appendPriceHistory` too

### [~] D-4 — `distance` + `hasCoordinates` on detail
- [x] `GET /v2/ads/:id?lat=&lng=` (optional, validated, silently ignored if bad) → `distance` km (1 dp, haversine)
- [x] `hasCoordinates: false` when lat/lng are the 9.3311/76.9222 fallback; no distance then
- [x] Computed after the cache read, so the shared cache entry stays viewer-independent

### [x] D-5 — Seller `isVerified` on detail
- [x] Added to the users `$lookup` projection and `user` object

### Follow-ups found here
- [ ] Detail still returns seller `email` publicly; the mobile app no longer reads it — candidate to strip (check admin first)
- [ ] `ads.service.spec.ts` fails on `develop` before these changes: missing `AdsCache` provider in the testing module, and jest has no `moduleNameMapper` for `src/…` absolute imports (`manufacturers.service.ts:18`)

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
