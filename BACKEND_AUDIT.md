# AdoDad API (NestJS) — Architecture, Performance & Security Audit
### Handover document for the **backend** agent

**Repo:** `ado-dad` · **Branch analysed:** `develop`
**Counterpart:** the Flutter app `ado_dad_mobile` (branch `dev_redesign`) is being worked by a separate agent against `FRONTEND_AUDIT.md`. See **§9 Shared contracts** before changing anything that crosses the wire.
**Status:** analysis only. No code has been modified.

> **Terminology.** "Advertisements" here are the **marketplace listings** (`Ad` + `VehicleAd` / `PropertyAd` / `CommercialVehicleAd` sub-documents), not third-party ad units. There is a separate `/banner` promo carousel.

---

## 1. Current architecture

```
main.ts
  helmet · compression(threshold 1 KB) · json/urlencoded limit 1 MB · text limit 5 MB
  ValidationPipe({ whitelist: true, skipMissingProperties: true })
  CORS: process.env.CORS_ORIGINS, falls back to '*'
  RedisIoAdapter for websockets (falls back to in-memory)
  morgan · graceful shutdown

app.module.ts
  Mongoose.forRootAsync  → maxPoolSize: 10, serverSelectionTimeoutMS: 5000,
                           socketTimeoutMS: 45000, bufferCommands: false
  JwtModule  → getJwtSecret(), issuer 'ado-dad-api', audience 'ado-dad-users'
  APP_GUARD  → AuthThrottleGuard   ← only acts on @Throttle()-decorated routes
  20 feature modules

TWO PARALLEL AD STACKS
  src/ads/        (v1)  AdsController → AdsService  ← 112 KB, one file
  src/ads-v2/     (v2)  AdsV2Controller
                          → CreateAdUc / ListAdsUc / GetAdByIdUc
                            / ProfileStatsUc / SellerStatsUc
                          → AdRepository → Mongoose
                          → AdsCache → RedisService (optional, fails open)

MongoDB — Ad collection carries 25+ indexes incl. { geoLocation: '2dsphere' }
          and a { title: 'text', description: 'text' } index
```

**The mobile app reads through v2 and writes through v1:**
`POST /ads`, `PUT /ads/:id`, `PUT /ads/:id/sold`, `DELETE /ads/:id`, `GET /ads` (`add_repo.dart:593,609,696,713,785`) but `POST /v2/ads/list`, `GET /v2/ads/:id`, `GET /v2/ads/me/stats`, `GET /v2/ads/sellers/:id/stats`.

---

## 2. Request path for the hot endpoint

```
POST /v2/ads/list                        ads.v2.controller.ts:380-395
  no @UseGuards — public
  extractUserIdFromToken(req.headers.authorization)   ads.v2.controller.ts:59-73
      jwtService.verify(token, { secret })   ← manual, outside the guard pipeline
  ▼
ListAdsUc.exec(dto, userId?)             list-ads.uc.ts:59-101
  ├─ generateListCacheKey(filters)       list-ads.uc.ts:109-160
  │     returns a key ONLY for:
  │       (1) no filters at all
  │       (2) category + textual location
  │     returns **null** whenever latitude/longitude are present   ← lines 131-135, 148-152
  │
  ├─ [cache miss or null key] fetchListDataFromDatabase           :173-192
  │     if lat/lng and maxDistance  → fetchWithOriginalLogic(filters, maxDistance)
  │     if lat/lng and no maxDistance → fetchWithDistanceFallback  :194-222
  │            loops 50 → 100 → 200 → 500 → 1000 km,
  │            re-running the FULL aggregation each time until data.length > 0
  │
  └─ fetchWithOriginalLogic                                        :239-874
        pipeline[0] = $geoNear { near, maxDistance, spherical,
                                 query:{isDeleted,isActive,isApproved,soldOut} }   :313-334
        + locationHierarchyService.getLocationAggregationPipeline(...)              :336-344
        + locationHierarchyService.getLocationScoringStage(...)  → $addFields locationScore
        + category / price / search $match stages
        + [property or vehicle filters → early $lookup]
        + $skip / $limit                                                            :646-650
        + $lookup users (projected)                                                 :655-682
        + $lookup propertyads / vehicleads / commercialvehicleads                   :684-720
        + $addFields (user object, isFavorite:false, $arrayElemAt each sub-doc)
        + $project                                                                  :748-780
        Promise.all([
          adRepo.aggregate(pipeline),
          runCount ? adRepo.aggregate(buildSimplifiedCountPipeline()) : …           :805-809
        ])
        buildSimplifiedCountPipeline():396-408 → stages.push(pipeline[0])  ⟵ REPLAYS $geoNear
        + batchFetchInventoryItems(data)                                            :876-985
              5 parallel Mongo queries — manufacturers, models, variants,
              fuelTypes, transmissionTypes — for static reference data, uncached
        + mapToDetailedResponseDtoWithInventory per row
  ▼
  if (userId) getUserFavorites(userId)   list-ads.uc.ts:1460-1486
        Redis key ads:v2:userFavorites:{userId}, TTL 300 s, **never invalidated**
        addIsFavoriteToAds → userFavorites.includes(ad.id)  ← O(n·m) array scan
  ▼
  ← { data[], total, page, limit, totalPages, hasNext, hasPrev, nextCursor, prevCursor }
      each row's `user` includes email, countryCode, phoneNumber
```

---

## 3. Findings — performance

### F1 — The geo path is 100 % uncached, and it is the default path *(Critical)*
`generateListCacheKey()` returns a cache key for exactly two request shapes and returns **`null` whenever `latitude`/`longitude` are present** (`list-ads.uc.ts:131-135, 148-152`).

The mobile app sends coordinates on: the Home feed (`searchByLocation`, `maxDistance: 200`), every Category page, and the ad-detail "similar ads" strip. So the hottest queries in the product have a **0 % Redis hit rate** and go to Mongo every time.

`AdsCache` itself (`ads-v2/infrastructure/services/ads-cache.ts`) is well-built — tag-set invalidation, `setList`, `setById`, `invalidateLists`, `invalidateById`. The coverage is the problem, not the mechanism.

### F2 — Every list request runs the expensive stage twice *(Critical)*
`buildSimplifiedCountPipeline()` starts with `stages.push(pipeline[0])` (`list-ads.uc.ts:398`) — on the geo path `pipeline[0]` **is** the `$geoNear` stage, so the count query replays the whole geospatial scan over the full radius. Both run under `Promise.all` at `:805-809`.

`includeTotal` defaults to `true` and the client never sends `false` — and **can't**, because it derives `hasNext` from `total` (`add_repo.dart:93-95`). Roughly 2× the Mongo CPU/IO per request, permanently.

### F3 — `GET /v2/ads/:id` has no caching at all *(High)*
`grep -n cache ads-v2/application/use-cases/get-ad-by-id.uc.ts` → nothing. `AdsCache.setById()` exists and is **never called from anywhere**. Ad detail is the second-most-requested endpoint and it hits Mongo on every open.

### F4 — `locationScore` is computed over the whole candidate set and never used *(High)*
`location-hierarchy.service.ts:324-400` builds a large `$addFields` expression (nested `$cond`/`$round`/`$multiply` over bounds checks) that runs **before** `$skip`/`$limit`, i.e. for every document inside the radius. The `$sort` that used to consume it was deliberately removed — see the comment at `list-ads.uc.ts:615-623`. The field is still computed and still carried through `$project` (`:778`). Pure dead CPU on the hot path.

### F5 — `fetchWithDistanceFallback` can run the full aggregation five times *(High)*
`list-ads.uc.ts:194-222` loops `[50, 100, 200, 500, 1000]` km, running the complete pipeline at each radius until a page returns rows, then falls back to a non-geo query at page 1. In a sparse region a single user request becomes six aggregations.

### F6 — Static reference data is refetched per request *(Medium)*
`batchFetchInventoryItems` (`list-ads.uc.ts:876-985`) is correctly *batched* — 5 parallel queries, not N+1 — but manufacturers / models / variants / fuel types / transmission types are effectively immutable and are **not cached at any layer**. That is 5 extra Mongo round trips on every single list response. The `/vehicle-inventory/*` endpoints the filter sheet calls are likewise uncached.

### F7 — `POST` makes the feed uncacheable by anything upstream *(Medium)*
`/v2/ads/list` is a `@Post` (`ads.v2.controller.ts:380`). No CDN, reverse proxy, or HTTP client cache can serve it, and ETag/`If-None-Match` is unavailable. A read endpoint modelled as a write.

### F8 — No query timeouts against a pool of 10 *(Medium)*
`AdRepository.aggregate` (`ad.repo.ts:394-396`) sets no `maxTimeMS`, no `allowDiskUse`, no read preference. `maxPoolSize: 10` (`app.module.ts:78`). A handful of slow geo scans saturates the pool and stalls the entire API.

### F9 — `userFavorites` cache is never invalidated *(Medium — correctness)*
`ads:v2:userFavorites:{userId}` is written with a 300 s TTL at `list-ads.uc.ts:1476` and nothing in `favorites/favorite.service.ts` deletes it on add/remove. A user's hearts are stale for up to 5 minutes after a toggle. (The client masks this with an optimistic `UpdateAdFavoriteStatusEvent`, which reverts on the next refetch.) Also `addIsFavoriteToAds` uses `Array.includes` per row — make it a `Set`.

### F10 — Over-indexing on `Ad` *(Low — write amplification)*
`ads/schemas/ad.schema.ts:120-175` declares 25+ indexes. Several single-field ones (`{isActive:1}`, `{soldOut:1}`, `{isApproved:1}`, `{status:1}`) are already prefixes of existing compounds. Every ad create/update pays for all of them.

> **Note on the comment at `ad.schema.ts:172-175`:** it states that MongoDB allows only one `2dsphere` index per collection and that compound `2dsphere` indexes are impossible. Both are inaccurate — MongoDB supports compound indexes with a `2dsphere` key (e.g. `{ geoLocation: '2dsphere', category: 1 }`) and multiple geo indexes per collection. Worth re-testing: today the `$geoNear` `query` filters (`isDeleted`/`isActive`/`isApproved`/`soldOut`) are applied per-document after the geo index returns candidates, which is what makes the scan expensive when a lot of ads are sold or unapproved.

---

## 4. Findings — security

| # | Sev | Finding | Evidence |
|---|---|---|---|
| **S1** | **Critical** | **Seller PII on a public, unauthenticated, unthrottled endpoint.** Every row of `POST /v2/ads/list` carries `user.email`, `user.phoneNumber`, `user.countryCode`. The route has no `@UseGuards`; `AuthThrottleGuard` only fires on `@Throttle()`-decorated handlers; `limit` is capped at 100. An unauthenticated scraper harvests the entire seller phone/email book at 100 rows per request. | `list-ads.uc.ts:655-682` (`$lookup` projection), `:727-740` (`$addFields user`), `:748-780` (`$project`); `ads.v2.controller.ts:380-395`; `auth-throttle.guard.ts:36-40` |
| **S2** | **High** | **No rate limiting on any public read endpoint** — `/v2/ads/list`, `/v2/ads/:id`, `/v2/ads/sellers/:id/stats`. Each list call costs two Mongo aggregations (F2), so this is a cheap amplification vector. | `app.module.ts:135` — `AuthThrottleGuard` is the only global guard and is opt-in per route |
| **S3** | **Medium** | **`ValidationPipe({ skipMissingProperties: true })`** globally disables "required property missing" validation — `@IsNotEmpty`/`@IsDefined` no longer fire when the key is absent from the body. `whitelist: true` is correctly set, so mass-assignment and Mongo-operator injection are blocked; the gap is required-field enforcement. | `main.ts:184-190` |
| **S4** | **Medium** | **CORS falls back to `origin: '*'`** when `CORS_ORIGINS` is unset. Credentials are correctly suppressed in that case, but a wildcard should not be the production default. | `main.ts:30-53` |
| **S5** | **Medium** | **Manual JWT verification inside the controller.** `extractUserIdFromToken` calls `jwtService.verify(token, { secret })` directly, duplicating and bypassing the guard/strategy pipeline — no explicit issuer/audience assertion at the call site, no user-existence check, no suspension check (`moderation/guards/suspension.guard.ts` is never consulted). Used by both `/list` and `/:id`. | `ads.v2.controller.ts:59-73`, used at `:386` and `:469` |
| **S6** | **Low/Med** | **Two live ad stacks with independent authorization surfaces.** v1 `/ads` handles all writes from mobile, v2 handles reads. Every authz rule must be maintained twice, and `ads.service.ts` is 112 KB. | `src/ads/` vs `src/ads-v2/`; `add_repo.dart:593,609,696,785` |
| **S7** | Low | Firebase admin service-account JSON sits in the repo root, and `.env` / `.env.prod` / `.env.uat` sit beside it. All are **correctly gitignored** (`.gitignore:7-11, 131-134`), so this is local hygiene, not a leak. | — |

Things that are **correct** and should not be "fixed": `getJwtSecret()` fails closed in production (`common/jwt-secret.util.ts`), the throttle guard fails open on Redis errors (deliberate), `whitelist: true`, body size limits, helmet, compression, graceful shutdown, and post-pagination `$lookup` ordering in the list pipeline (already the right shape).

---

## 5. Root causes

| Symptom | Root cause | Fix |
|---|---|---|
| Redis hit rate ≈ 0 on the ads feed | `generateListCacheKey()` returns `null` for any request carrying lat/lng — the app's default shape | Geo-bucket the coordinates into the cache key |
| Mongo CPU ≈ 2× apparent query cost | Count pipeline reuses `pipeline[0]`, replaying `$geoNear`; client can't opt out because it needs `total` | `limit + 1` over-fetch for `hasNext`; make `includeTotal` opt-in |
| Ad detail always hits Mongo | `AdsCache.setById` exists but is never called | Cache `GET /v2/ads/:id`, invalidate via the existing `invalidateById` tag |
| Slow responses in sparse regions | `fetchWithDistanceFallback` re-runs the whole aggregation at 5 radii | Cap at two radii, or widen `maxDistance` once instead of looping |
| Pool exhaustion under load | No `maxTimeMS`, `maxPoolSize: 10`, 2 aggregations per request | Add `maxTimeMS`, then raise the pool after measuring |
| Seller contact details scrapable | Public list projection includes `email`/`phoneNumber` | Strip from list; expose only on an authenticated, throttled path |

---

## 6. Target backend architecture

```
  GET /v2/ads/list?…                    ← cacheable by CDN / proxy / client (ETag)
        │  public rows: NO seller email / phone
        ▼
  AdsV2Controller  (guards, not manual jwt.verify)
        ▼
  ListAdsUc
     cacheKey = hash(normalised filters
                     + geoBucket(lat, lng rounded to 2 dp ≈ 1.1 km)
                     + radius bucket
                     + page/limit/sort)
        ▼
  Redis  ads:v2:list:<hash>           TTL 120 s   tag-invalidated on ad write
         ads:v2:byId:<id>             TTL 300 s   tag-invalidated on ad write
         ads:v2:inventory:<type>      TTL 1 h     (manufacturers/models/fuel/transmission/variants)
         ads:v2:userFavorites:<uid>   TTL 300 s   **invalidated on favourite toggle**
        ▼ miss
  MongoDB
     single $geoNear pass — no count replay (hasNext from limit+1)
     no locationScore stage
     maxTimeMS set on every ads aggregation
     compound geo index re-evaluated (see note in F10)
```

Neighbours in the same town collapse onto one cache entry instead of each triggering a cold geo scan.

---

## 7. Prioritized plan (backend)

**P0 — Security (ship independently of the performance work)**
- **P0-1** Remove `user.email`, `user.phoneNumber`, `user.countryCode` from the public `/v2/ads/list` projection. Keep them on the authenticated detail path, or move contact reveal to a dedicated throttled `POST /v2/ads/:id/contact` that can be audited. **Coordinate — §9 C3.** *(`list-ads.uc.ts:655-682, 727-740, 748-780`)*
- **P0-2** Add IP-based rate limiting to `/v2/ads/list`, `/v2/ads/:id`, `/v2/ads/sellers/:id/stats` — reuse `AuthThrottleGuard` + `@Throttle({ limit, ttl, name })`, which already has the Redis bucket logic. *(`ads.v2.controller.ts`)*
- **P0-4** Drop `skipMissingProperties: true`; fix whatever required-field violations that surfaces. *(`main.ts:184-190`)*
- **P0-5** Make `CORS_ORIGINS` mandatory when `NODE_ENV === 'production'` instead of falling back to `*`. *(`main.ts:30-53`)*
- **P0-6** Replace `extractUserIdFromToken` with an optional-auth guard/strategy so issuer/audience, user existence and suspension checks apply uniformly. *(`ads.v2.controller.ts:59-73`)*

**P1 — Major performance**
- **P1-2 ⭐ Cache the geo path.** *(first task — see §8)*
- **P1-3** Kill the duplicate count aggregation: derive `hasNext` from a `limit + 1` over-fetch (the cursor branch at `:818-825` already does exactly this) and make `includeTotal` opt-in. **Coordinate — §9 C1.** *(`list-ads.uc.ts:396-408, 805-830`)*
- **P1-5** Cache `GET /v2/ads/:id` using the existing `AdsCache.setById` / `invalidateById`. *(`get-ad-by-id.uc.ts`, `create-ad.uc.ts`, v1 update/delete paths)*
- **P1-6** Cache vehicle-inventory reference data in Redis (1 h TTL) behind `VehicleInventoryGateway.get*ByIds` and the `/vehicle-inventory/*` controllers. *(`vehicle-inventory.gateway.ts:180-205`, `vehicle-inventory.service.ts`)*

**P2 — Architecture**
- **P2-2** Add `GET /v2/ads/list` with query params alongside the existing POST; emit `ETag` + honour `If-None-Match`. Keep POST for one release. **Coordinate — §9 C2.** *(`ads.v2.controller.ts`, `list-ads-v2.dto.ts`)*
- **P2-4** Invalidate `ads:v2:userFavorites:{uid}` on favourite add/remove; switch `addIsFavoriteToAds` to a `Set`. *(`favorites/favorite.service.ts`, `list-ads.uc.ts:1489-1497`)*
- **P2-5** Retire the v1 `/ads` write path onto v2 once the client migrates, then delete `ads/services/ads.service.ts` (112 KB). **Coordinate — §9 C5.**
- **P2-7** Split `list-ads.uc.ts` (1 498 lines) — pipeline builder, cache-key policy, inventory hydration and DTO mapping are four separable concerns.

**P3 — Optimization**
- **P3-2** Delete the `locationScore` stage and its `$project` entry (computed, never sorted on). *(`location-hierarchy.service.ts:324-400`, `list-ads.uc.ts:348-353, 778`)*
- **P3-3** Add `maxTimeMS` to every ads aggregation; re-measure, then raise `maxPoolSize` off the default 10. *(`ad.repo.ts:394`, `app.module.ts:78`)*
- **P3-5** Cap `fetchWithDistanceFallback` at two radii instead of five. *(`list-ads.uc.ts:197`)*
- **P3-7** Re-test a compound `{ geoLocation: '2dsphere', ... }` index so the `$geoNear` `query` filters are index-served (see note in F10).
- **P3-8** Verify and fix the `commercialVehicleTypes` filter on the `commercialVehicleDetails` sub-document — the client currently re-filters defensively. **Coordinate — §9 C4.**

**P4 — Cleanup**
- **P4-2** Prune redundant single-field `Ad` indexes that duplicate existing compound prefixes. *(`ad.schema.ts:120-175`)*
- **P4-3** Delete `src/app.module.ts.bak`, `temp-task-def.json`, `updated-task-def.json`, `new-task-def.json`.

---

## 8. FIRST IMPLEMENTATION TASK — P1-2

> **Make the geo path cacheable: geo-bucket the list cache key.**

**Why this one first.** It is the highest-leverage backend change: it converts the single most-requested endpoint from a 0 % hit rate to a shared cache, it touches one method, it changes **no API contract**, and it is trivially measurable via Redis hit/miss counters. It is also independent of the frontend agent's work.

**Change — `src/ads-v2/application/use-cases/list-ads.uc.ts`:**
1. In `generateListCacheKey()`, stop returning `null` when `latitude`/`longitude` are present. Instead quantise them:
   `geoBucket = ${lat.toFixed(2)}:${lng.toFixed(2)}` (≈ 1.1 km cells) and include the effective radius (`maxDistance` or the fallback threshold actually used) in the key.
2. Extend Scenario 1 and Scenario 2 to accept a geo component, and add a Scenario 3 for `category + geoBucket`. Keep returning `null` for genuinely high-cardinality shapes (free-text `search`, price ranges, multi-select id filters) so Redis isn't polluted with single-use entries.
3. Keep TTL at 300 s for now (`ListAdsUc.CACHE_TTL`) and keep writing through `AdsCache.setList`, so existing tag invalidation on ad create/update continues to work unchanged.
4. **Careful:** the cached `CachedListData` must stay user-agnostic. `isFavorite` is applied *after* the cache read (`exec()` lines 83-88) — keep it that way, and do not let `userId` leak into the key.

**Do not** change the response shape, remove the count query, or touch `$geoNear` in this task. One change at a time.

**Baseline to capture before the change** — replay a realistic mix (Home feed with coords, category + coords, similar-ads) at steady load:
- Redis hit rate on `ads:v2:list:*`
- p50 / p95 / p99 latency of `POST /v2/ads/list`
- Mongo ops/sec and `$geoNear` scan counts (`explain("executionStats")` on the geo pipeline)
- Node event-loop lag and Mongo connection-pool checkout wait

**Expected:** hit rate rises from 0 % to a meaningful fraction for users in the same locality; p95 falls sharply for cached buckets while cold-bucket latency is unchanged. Publish before/after numbers before moving to P1-3.

---

## 9. Shared contracts — coordinate with the frontend agent

These **cannot be changed unilaterally**. The frontend agent has the matching entries in `FRONTEND_AUDIT.md`.

| # | Change | Backend does | Frontend does | Order |
|---|---|---|---|---|
| **C1** | **`hasNext` stops depending on `total`** | Derive `hasNext` from a `limit + 1` over-fetch; make `includeTotal` opt-in and stop running the count pipeline by default | Delete `hasNext = (page*limit) < total` at `add_repo.dart:93-95`; consume the `hasNext` the response already carries | **Frontend first** (the server already returns `hasNext`, so this is safe today), **then** backend drops the count query |
| **C2** | **`POST /v2/ads/list` → `GET /v2/ads/list`** | Add the GET route + ETag/`If-None-Match`; keep POST alive one full release | Switch `fetchAllAds` to `_dio.get`, enable conditional requests | **Backend ships GET first**, frontend migrates, POST removed after one release |
| **C3** | **Seller `email`/`phoneNumber` out of list rows (S1)** | Strip from the public list projection; keep on the detail response | Audit that no *list* screen reads `ad.user.email` / `ad.user.phone` and report back. The detail call button uses the **detail** response, which retains the phone | **Frontend audits and confirms, then backend ships.** Do not ship this blind — it will break the call/chat buttons if any list screen depends on it |
| **C4** | **`commercialVehicleTypes` server filter** | Verify/fix the filter against `commercialVehicleDetails`; confirm page sizes are correct | Remove the defensive client-side re-filter at `add_repo.dart:104-114` | **Backend fixes and confirms, then frontend removes the workaround** |
| **C5** | **Retire v1 `/ads` writes (P2-5)** | Keep `/ads` write routes alive until the client has migrated | Move `postAd` / `updateAd` / `deleteAd` / `markAdAsSold` / `fetchAdsByUserId` onto v2 | **Frontend migrates first, backend deletes after.** `ads.service.ts` stays until then |

**Independent of the frontend (safe to ship any time):** P0-2, P0-4, P0-5, P0-6, P1-2, P1-5, P1-6, P2-4, P2-7, P3-2, P3-3, P3-5, P3-7, P4-*.

---

## 10. Working rules for this handover

- One fix per cycle: **analyse → root cause → propose → implement one → test → measure → document → next.** Do not combine unrelated fixes.
- Never change a response shape or remove a field without checking §9 and pinging the frontend agent — the Flutter client parses these payloads strictly.
- No index is added without first confirming the query pattern with `explain("executionStats")`. The collection is already over-indexed (F10).
- Don't regress: Redis must keep failing open (`redis.service.ts` degrades to no-cache by design), `getJwtSecret()` must keep failing closed in production, and the existing tag-based cache invalidation on ad writes must keep working.
- No performance claim without a before/after measurement under comparable load.
