# V2 Ads Search: Audit and Hybrid-Search Plan

**Status:** Audit + agreed tier-1 design (revised 22 Sep 2026). Tier 1 implemented on branch `feat/search-v3-hybrid` (23 Sep 2026); see §L for what is built and what still has to be run against a database.
**Scope:** `POST /v2/ads/list` with `search`, plus everything it depends on.
**Basis:** A read of the code at `4171c9d` (2026-09-21). The database was **not** queried because no credentials were available in the checkout. Every claim that depends on live data is marked **[VERIFY]**, and §H lists the command that settles each one.

---

## 0. Summary

Search breaks for three separate reasons that overlap:

1. **The parser deletes the words it recognises.** `resolveFilters()` sets `search = parsed.freeText`. When every word is recognised ("creta", "hyundai", "cars in kochi"), the text term becomes `undefined` and correctness then depends entirely on the structured filter being right. There is no fallback when that filter is incomplete, gets ignored, or returns nothing.
2. **The structured filter is often incomplete, and some of it is ignored.**
   - Brand terms carry no category. Vehicle filters only run when `category` is a vehicle category, so `hyundai` becomes "all ads, including property".
   - If the catalogue has not been copied into the lexicon, "creta" resolves to *category = Cars* only, so the user sees every car.
   - A parsed location is recognised, removed from the text, and never applied.
3. **The text path can't find brand, model, variant or fuel.** An `Ad` document only holds `title` and `description`. Brand, model, variant, fuel and transmission live in `vehicleads` and `commercialvehicleads` as ObjectIds. Auto-generated titles contain the model name and year but **never the brand**. With lat/lng, the whole query must also appear as one literal phrase, so "hyundai creta" can't match "Creta 2022".

The parser is off unless `SEARCH_PARSER_ENABLED=true`. It is set in the local `.env`, but not in `.env.uat`, `.env.prod`, the ECS task definitions, `ecosystem.config.js` or the CI workflow. Unless it is set on the servers directly **[VERIFY]**, **local and deployed environments run different search algorithms**, and each fails in its own way (see §B).

The fix is the hybrid design in §C (revised 22 Sep after review; the "stay on `$text`, no Atlas Search" decision of 17 Sep is reversed):
- The parser proposes filters but never removes words from the query. Typos are corrected against the lexicon (SymSpell) before retrieval.
- Each ad gets a denormalised `searchText` and `searchKeys`, so brand/model searches are served from the `ads` collection by index, with no `$lookup` before pagination.
- Parsed **entities** (brand, model, category, location) constrain; parsed **attributes** (year, fuel, transmission) rank. That removes most of the relaxation logic.
- Retrieval is **one scored query**: structured hits and text hits are fetched together and ranked by `relevance × distance decay × freshness decay × seller quality`. No radius ladder for searches.
- Retrieval sits behind a port with two adapters: Mongo-native (`$or` of `searchKeys` and `$text`) and **Atlas Search** (`$search compound`, fuzzy, native geo/recency scoring). You are on Atlas, so the Atlas adapter is the target; the Mongo adapter is the fallback and the test baseline.
- Every search is logged (`search_events`), which is what makes tiers 2 and 3 (§J) possible.
- The normal case costs **one query plus one capped count**, down from up to eight today.

---

## A. Current architecture

### A.1 Request flow

```
POST /v2/ads/list  (ads.v2.controller.ts:370, public, 60 req/min/IP, OptionalJwtAuthGuard)
  body: ListAdsV2Dto { search, category, location, latitude, longitude, maxDistance,
                       manufacturerIds, modelIds, fuelTypeIds, transmissionTypeIds,
                       minYear, maxYear, minPrice, maxPrice, commercialVehicleTypes,
                       propertyTypes, listingType, min/maxBedrooms, min/maxArea,
                       isFurnished, hasParking, page, limit, cursor, sortBy, sortOrder,
                       includeTotal }
        │
        ▼
ListAdsUc.exec()                                         list-ads.uc.ts:177
  1. resolveFilters()            (only when SEARCH_PARSER_ENABLED=true)   :123
       SearchQueryService.parse(search) → ParsedQuery
       if confidence ≥ 0.34: fill parsed filters into EMPTY dto fields
       search := parsed.freeText   ← recognised words are removed here
  2. generateListCacheKey()      any `search`/brand/model/… ⇒ uncacheable  :287
  3. fetchListDataFromDatabase()
       lat/lng + maxDistance → one geo run at that radius
       lat/lng, no maxDistance → ladder 50 → 200 → 1000 km → no-geo (page reset to 1)
       no lat/lng → one run
  4. fetchWithOriginalLogic() builds ONE aggregation:
       stage 0: $geoNear (if lat/lng) | $match{$text + visibility} (if search) | $match{visibility}
       $match category / location(regex) / price
       if search && geo: $match {$or:[title~/phrase/i, description~/phrase/i]}
       property filters → $lookup propertyads BEFORE pagination
       vehicle filters  → $lookup vehicleads|commercialvehicleads BEFORE pagination
                          (only if category ∈ {private_vehicle, two_wheeler, commercial_vehicle})
       $sort createdAt (no textScore); geo keeps nearest-first unless sortBy sent
       $skip/$limit or _id cursor
       $lookup users, propertyads, vehicleads, commercialvehicleads (post-page)
     plus a parallel count pipeline, skipped whenever property/vehicle filters are present
  5. aggregateWithTextFallback(): Mongo error 27 → rewrite $text as a phrase regex
  6. isFavorite applied per user; `query` block (chips etc.) attached when the parser ran
```

### A.2 The 16 audit questions

| # | Question | What the code actually does | Where |
|---|---|---|---|
| 1 | How raw text enters | `ListAdsV2Dto.search`, a free string with no length cap and no trimming beyond `.trim()`. The Flutter request format was **not** available in this checkout **[VERIFY]**: does the app send `category` together with `search` from the home screen? | `dto/list-ads-v2.dto.ts:28` |
| 2 | Parsing | `tokenize()` lowercases, applies NFKC, transliterates about 30 Malayalam words and strips digit grouping. A longest-match n-gram scan runs over `search_terms` (terms) and `location_terms` (gazetteer). Numeric rules run over the words left unclaimed. | `text-normalizer.ts`, `search-query.service.ts:74` |
| 3 | Brands | **Only** via `InventoryLexiconMaterializer` (`npm run search:seed`), from the `manufacturers` name, displayName and a hard-coded alias table (`tata motors→tata`, `honda motorcycle…→honda`). Aliases shorter than 3 characters (`re`, `vw`) are silently dropped. **The payload has no category.** | `inventory-lexicon.materializer.ts:118` |
| 4 | Models | Also materializer-only: bare model name plus `"<brand> <model>"` (weight +5). The payload includes modelId, manufacturerId and a category derived from `vehicleType` / `isCommercialVehicle`. 23 English-word models (`city`, `jazz`, `ace`…) are only matched as brand+model. | `:141–179` |
| 5 | Variants | Materializer-only, and only as `"<model> <variant>"`. A bare "vxi" is never matched. | `:182–214` |
| 6 | Category inference | (a) seed category words (`cars`, `bikes`, `flat`…); (b) the **seed `DUAL_HINT_TERMS`** (`creta`, `swift`, `i20`… → Cars at weight 70, with no model ID); (c) the model payload; (d) implied from a property type, a commercial-vehicle type or BHK. **Never** from a brand. | `lexicon.seed.ts:126`, `search-query.service.ts:343` |
| 7 | Location | Words after `in/at/near/around/within/from` prefer the gazetteer; other words try the lexicon first and the gazetteer second. A match is removed from the text, turned into a chip and returned in `query.location`, and **then ignored**: `resolveFilters()` never fills `location`/lat/lng from it. The separate `location` DTO field is an escaped regex on `ads.location`. | `search-query.service.ts:127`, `list-ads.uc.ts:156–170` |
| 8 | Price/year/fuel/etc. | `numeric-rules.ts`: "under 5 lakh" gives maxPrice. A bare amount of 1000 or more is a budget. `2018`, `2018 model` and `after 2018` give **minYear** (a bare year means "that year or newer"). BHK gives bedrooms. Fuel and transmission come from the materialized lexicon only. | `numeric-rules.ts` |
| 9 | `$text` | Only when there is **no** lat/lng: `$match{$text:{$search}}` as stage 0. Word-OR semantics with English stemming. Results are sorted by `createdAt`, **not** by `textScore`. The index is whichever text index exists on the collection **[VERIFY]**. The schema declares `{title, description}`; the migration script defines `ad_search_v2 {title:12, searchText:6, description:1}`, but **no code writes `searchText`**. `autoIndex` is disabled outside local, so the schema declaration does not guarantee anything. | `list-ads.uc.ts:594`, `ad.schema.ts:173`, `search-index-migration.ts:43`, `app.module.ts:97` |
| 10 | Effect of lat/lng | `$geoNear` must be stage 0, so `$text` is impossible. Search switches to a case-insensitive **whole-phrase** substring regex on title/description. No stemming, no word-OR, no ranking, and it can't use an index (it scans every ad inside the radius). | `:681` |
| 11 | Radius widening | Without `maxDistance`: 50, then 200, then 1000 km, then no geo at all (page forced to 1). Each rung is a **complete** aggregation plus count. It widens whenever `data.length === 0`, so a query that matches nothing anywhere costs 4 aggregations (8 with counts) and still returns empty. The final no-geo step silently changes the result semantics: nearest-first becomes newest-first across India. | `:505–528` |
| 12 | Full recognition | `search` is cleared and only structured filters run. That is correct **only if** the structured filter is complete and actually applied (it often isn't; see §B). | `:173` |
| 13 | Partial recognition | If at least 34% of meaningful words are recognised, the recognised filters are hard-applied and the rest becomes `$text`/phrase-regex. With "hyundai creta" and a seed-only lexicon, "creta" becomes category Cars and "hyundai" becomes `$text`. Brands are never in titles, so the result is close to zero. | `parsed-query.ts:108` |
| 14 | Structured search returns 0 | Nothing happens. An empty page is returned with no relaxation. The geo ladder widens the radius, but it never drops a filter. | — |
| 15 | Incomplete `search_terms` | Silent. `LexiconService` loads whatever exists, with a 15-min TTL and "serve stale on error". No health check, no model-count check, no staleness check. A seed-only lexicon turns every `DUAL_HINT` model word into "all cars". | `lexicon.service.ts:101` |
| 16 | Do ads contain brand/model text? | **Partly, and never the brand.** v2 create: `title = data.title ?? "<ModelName> <year> (<color>)"` (`ad.v2.mappers.ts:126`). v1 create (four paths): `"<ModelName> <year>"`, or the user's title. The brand, variant, fuel and transmission exist only as ObjectIds in `vehicleads`/`commercialvehicleads`. A user-supplied title may contain none of them. v1 update no longer rewrites titles (commented out, `ads.service.ts:3321`), so an edited model leaves a stale title. What share of vehicle ads have a custom title is **[VERIFY]**. | — |

### A.3 Other defects found on the same path

- **Cache collision.** A seed-only "creta" becomes `{category: private_vehicle}` with no `search`. That is **cacheable**, and its key equals the Cars-tab feed key, so the "search" can be served straight from the Cars feed cache.
- **Brand plus model gives a cross-product `$in`.** `manufacturerId $in [...] AND modelId $in [...]`. It works today only because a model payload carries its own manufacturer. It is fragile.
- **Vehicle filters run `$lookup` over every candidate before pagination** (the whole radius or category). The count is then skipped, so `total` is `undefined` for every parsed vehicle search.
- **Duplicate manufacturer names by design.** The schema comment says "same name for different vehicle categories", so Honda cars and Honda bikes are two documents. The lexicon returns both IDs, which is correct, but no category exists to pick between them.
- **The migration script's supporting indexes reference `districtSlug`**, which doesn't exist on `Ad`. They would be created as useless indexes.
- **v1 `ads.service.ts:397, 420, 2098` still build `$regex` from raw user input** (a ReDoS risk). Out of scope here, but the same class of bug S0-1 fixed in v2.
- **The cursor paginates on `_id` while sorting on `sortBy`.** This is only correct for `createdAt`. Pre-existing; noted because the new ranking must not rely on it.

---

## B. Root causes, traced per query

Legend. Parser **ON** is the local `.env`; parser **OFF** is UAT/prod (as far as the repo shows). **L0** means `search_terms` holds seed rows only (materializer never run on that DB). **L1** means the seed plus the materialized catalogue. **geo** means lat/lng was sent.

| Query | Mode | Parser result | Generated filter | Mongo query (essence) | Why it fails |
|---|---|---|---|---|---|
| `creta` | ON, L0 | seed hint gives category=private_vehicle; conf 1.0 | `{category:'private_vehicle'}`, search **removed** | `$match{visible, category}` | **Every car is returned.** Also cacheable and shares a key with the Cars feed. |
| `creta` | ON, L1 | seed hint + MODEL(creta) gives category, mfrIds [H], modelIds [C] | vehicle filters | `$lookup vehicleads` over **all** cars, then `$elemMatch{mfr∈[H],model∈[C]}` | Correct when IDs line up. If Creta ads reference a different catalogue doc (duplicate/CSV-imported model) **[VERIFY]**: empty, no fallback. `total` is always undefined. |
| `creta` | OFF, no geo | — | `search:'creta'` | `$text:"creta"` on title/desc | Works for auto titles. Misses custom titles such as "Hyundai SUV for sale". If the text index is missing it degrades to a phrase regex. |
| `creta` | OFF, geo | — | same | `$geoNear` then `title~/creta/i` | Mostly works. Up to 4 aggregations when nothing is nearby. |
| `swift`, `i20`, `baleno`, `nexon`, `thar` | all | identical to `creta` (all are in `DUAL_HINT_TERMS`) | | | Same as above. |
| `verna`, `brezza`, `venue`, `seltos` | ON, L0 | no hit, conf 0 | `search` kept | `$text` | Text-path limits only. |
| same | ON, L1 | MODEL term; category from `model.vehicleType` | vehicle filters **only if** a category was derived | | If the catalogue model has no `vehicleType` **[VERIFY]**: category is undefined, vehicle filters are **ignored**, search is removed, and **every ad** comes back. |
| `hyundai creta` | ON, L0 | creta gives category; hyundai unclaimed; conf 0.5 ≥ 0.34 | `{category:cars, search:'hyundai'}` | `$text:"hyundai"` within cars | The brand is never in auto titles, so **almost no results**. |
| `hyundai creta` | ON, L1 | 2-gram MODEL "hyundai creta" | model filter | as `creta` L1 | Works, with the L1 caveats. |
| `hyundai creta` | OFF, no geo | — | `$text:"hyundai creta"` | OR of words, sorted by createdAt | Recall is fine because "creta" matches, but there is no relevance ordering. |
| `hyundai creta` | OFF, geo | — | phrase regex `/hyundai creta/i` | | **0 at every radius**, because no title contains that phrase. Then it falls back to no-geo `$text`, and **location is lost**. 4 aggregations + 4 counts. |
| `hyundai`, `maruti`, `tata`, `toyota`, `kia` | ON, L1 | MANUFACTURER term(s), **no category**; conf 1.0 | `{manufacturerIds:[…]}`, search **removed** | `hasVehicleFilters` = false because category isn't a vehicle category | **Filter silently dropped, so every ad comes back, property included.** |
| same | ON, L0 / OFF | no hit | `$text`/regex "hyundai" | | The brand is never in titles, so only ads whose description mentions it. |
| `honda` | ON, L1 | two manufacturer docs (car and bike, via alias) | as above | | Same as the other brands. |
| `creta 2020` | ON, L0 | category + minYear 2020 (inferred) | `{category, minYear:2020}` | `$lookup` + `year≥2020` | **Every car from 2020 onward**; Creta is ignored. |
| `creta 2020` | ON, L1 | model + minYear | | | Works, but means "2020 or newer", not 2020. |
| `creta petrol`, `creta automatic` | ON, L0 | category; "petrol" unclaimed | `$text:"petrol"` within cars | | Any car whose description says petrol. |
| same | ON, L1 | model + fuel/transmission ID | | | Works. |
| `creta swift` | ON, L1 | two models | `$in` on both | | Union; works. |
| `creta swift` | OFF, geo | — | phrase regex | | 0 everywhere, then no-geo, and location is lost. |
| `red creta` | ON, L1 | model; "red" is free text | model filter + `$text:"red"` (no geo) or regex `/red/i` (geo) | | "red" must appear in title/description. Only works if the auto title's `(Red)` color survived. |
| `creta kollam`, `cars in kochi`, `hyundai in kollam` | ON | location matched and **removed**, never applied | category/model only | | **Location silently ignored.** Results come from anywhere, or near the device if lat/lng was sent. |
| `creta kollam` | OFF | — | `$text:"creta kollam"` | | OR semantics: every ad (any category) whose description mentions Kollam, plus the Cretas. |
| `swift near me` | ON | `near` is a separator and `me` a stop word, leaving swift | as swift | | Fine only if the app sends lat/lng. |
| cat=`two_wheeler` + `creta` | ON, L1 | Rule 1 keeps the explicit category; model filled | bikes + model Creta | `$elemMatch` on vehicleads | **Always empty.** Search removed, no explanation, no fallback. |
| `xyzabc` | any, geo | conf 0 | `$text`/regex | | Correctly empty, but costs up to 4 aggregations + 4 counts. |
| `cretta`, `swfit` | any | exact-match lexicon only | `$text`/regex | | **Typos are not supported.** Documented as phase P2. |

**Most likely cause of the report:**
- Locally (parser ON), the lexicon was probably never materialized against the local DB, so `creta`/`swift` become "all cars" and brand searches become "all ads". Confirm by checking whether the response's `query.chips` contains only a `Cars` chip.
- On UAT/prod (parser OFF), multi-word and brand queries fail on the text path, and lat/lng turns every query into a literal-phrase match.

---

## C. Proposed architecture (tier 1)

### C.1 Core rules

1. The parser **adds** constraints and ranking signals. It never removes words from the query. The normalised original query is always part of retrieval.
2. Parsed **entities** (category, brand, model, variant, location) may constrain. Parsed **attributes** (year, fuel, transmission, colour, remaining words) only rank.
3. Explicit client filters are never relaxed. Parsed constraints may be relaxed once, and the response says so.
4. Structured and text candidates are retrieved and ranked **in one query**. Empty means empty.
5. Retrieval is behind a port. The engine (Mongo-native or Atlas Search) is a deployment choice, not a code path in the use case.

### C.2 Flow

```
USER QUERY
   │ normalize (existing tokenizer)
   ▼
SearchQueryService.parse()
   │  lexicon lookup: exact → SymSpell fuzzy (≤2 edits, length-scaled) → phonetic key
   │  ParsedQuery { original, normalized, remaining,
   │                entities  { category, brands[], models[], variants[], location },
   │                attributes{ year, fuel, transmission, price, bedrooms },
   │                strength, corrections[], conflicts[], chips[] }
   ▼
SearchPlanner.plan(dto, parsed)              pure function, no I/O
   │  filters    (hard): visibility, explicit DTO filters, parsed category, geo bounds
   │  candidates (OR)  : entity keys ∈ searchKeys   |   text(normalized) over searchText/title/description
   │  boosts     (soft): attributes, remaining words, exact year
   │  scoring          : relevance × distanceDecay × freshnessDecay × sellerQuality; seller diversity
   │  relaxation       : at most ONE retry (drop the parsed category), only on zero results
   ▼
SearchIndexPort.search(plan, page)           ONE query → { ids, scores, total?, nearestKm? }
   ├─ MongoNativeAdapter   $match{filters, $or:[searchKeys, $text]} → $addFields score → $sort → page
   └─ AtlasSearchAdapter   $search{compound{filter, should, minimumShouldMatch:1}} + near/boost scores → page
   ▼
ListAdsUc hydrates the page (existing post-pagination lookups), applies isFavorite
   ▼
SearchEventsService.record(plan, result)     fire-and-forget through the outbox
   ▼
response + query{…}
```

The feed (no `search` string) keeps today's `$geoNear` path and radius ladder unchanged.

### C.3 Query strength (replaces the single 34% threshold)

| Strength | Definition | Example |
|---|---|---|
| **STRONG** | Every meaningful word is claimed by a *catalogue* entity (brand, model, variant), a fuzzy-corrected entity, or a numeric/fuel/transmission/location rule, with no ambiguity | `creta`, `hyundai creta`, `cretta`, `swift 2018 petrol` |
| **PARTIAL** | At least one catalogue entity, plus unknown words | `red creta`, `creta top model` |
| **CATEGORY** | Only category, property-type, listing or location words | `cars in kochi`, `2bhk flat for rent`, `nice family car` |
| **WEAK** | Only seed *hints* (`DUAL_HINT_TERMS` with no resolved model), ambiguous or tied fuzzy matches, or a small fraction of the words | `creta` on an unmaterialised lexicon, `car wash service centre` |
| **NONE** | Nothing recognised | `xyzabc` |

- Seed hint terms are marked `hintOnly`. A hint can pick a category but never counts as a catalogue match, so a missing materialisation degrades to **text search within Cars**, never "all cars".
- A fuzzy match counts as a catalogue match only when it is unique at its edit distance. A tie (two entities at the same distance) is WEAK: the text clause (fuzzy on Atlas) handles it.

### C.4 What constrains and what ranks

| Signal | Role | Rule |
|---|---|---|
| Explicit DTO filters (category, brand, model, price, year, fuel, location, radius…) | **hard** | Present in every query, never relaxed. Brand/model/year move to `searchKeys`/`vehicleYear` behind `SEARCH_KEYS_FILTERS`. |
| Parsed category (CATEGORY/STRONG, or implied by a resolved entity) | **hard** | Relaxed once if the result is empty and the client sent no category. |
| Parsed model / brand / variant | **candidate clause** (`searchKeys`), boost 10 | Model beats brand (the brand is implied). Several entities are a **union**. Brand-only: `mfr:<id>` for every manufacturer document sharing that name, across every category the brand's models belong to, unless the client sent a category. |
| Normalised original query | **candidate clause** (text) | `$text` on Mongo; `text` with `fuzzy` on Atlas. Always present when a search string exists, even for STRONG queries (catches custom titles). |
| Parsed year | boost | Exact year +3, ±1 year +1. **No hard filter.** |
| Parsed fuel / transmission / variant | boost +2 each | Two petrol Cretas rank above thirty diesel ones; the diesel ones still show. |
| Remaining words (`red`, `top`) | boost +1 per word matched in `searchText`/`title` | Never a hard filter. |
| Parsed location | **hard** `geoWithin(centroid, radiusKmHint)` and the decay centre | Typed location beats device lat/lng; an explicit `location`/lat/lng from the filter sheet beats both. If the gazetteer entry can't be applied, the word stays in the text clause. |
| Device lat/lng | decay centre | Hard `geoWithin` only when the client sends `maxDistance`. |

**Conflict:** an explicit category that differs from the resolved entity's category (Bikes + "creta"): the entity clause is dropped, the text clause runs inside the explicit category, and `query.conflicts=[{parsed:'model:Creta', category:'private_vehicle'}]` is returned so the app can offer "Search Creta in Cars". Empty is allowed; silent is not.

**How the listed queries resolve**

| Query | Hard filters | Candidates (OR) | Boosts / notes |
|---|---|---|---|
| `creta`, `swift`, `i20`, `verna` | cars | `model:<id>` \| text | — |
| `cretta`, `swfit` | cars | `model:<id>` \| text (fuzzy) | `corrections:[{from:'cretta',to:'creta'}]`, chip "Showing Creta" |
| `hyundai creta`, `maruti swift` | cars | `model:<id>` \| text | brand implied |
| `hyundai`, `maruti`, `tata`, `honda` | category ∈ brand's categories | `mfr:<ids>` \| text | Honda resolves to both the car and bike manufacturer docs |
| `creta 2020` | cars | `model` \| text | +3 year 2020, +1 for 2019/2021 |
| `creta petrol`, `creta automatic` | cars | `model` \| text | +2 fuel / transmission |
| `creta swift` | cars | `model ∈ {C,S}` \| text | union, ranked by score |
| `red creta` | cars | `model` \| text | +1 if "red" in searchText/title |
| `creta kollam`, `hyundai in kollam` | cars, geoWithin(Kollam) | as above | decay centre = Kollam centroid |
| `cars in kochi` | cars, geoWithin(Kochi) | none (category-only, cacheable) | as today, but the location is applied |
| cat=`two_wheeler` + `creta` | bikes | text only | `conflicts[]` populated |
| `nice family car` | cars | text | CATEGORY strength: "car" gives the category, the rest is text |
| `xyzabc` | — | text | empty, one query |

### C.5 Denormalised search document on `Ad`

| Field | Content | Example |
|---|---|---|
| `searchText` (string) | Normalised brand name, displayName and aliases, model, variant, fuel, transmission, year, colour, commercialVehicleType, bodyType (vehicles); propertyType, listingType, `Nbhk` (property); city, district. | `hyundai creta sx 2022 petrol manual white kollam` |
| `searchKeys` (string[]) | Exact-match keys | `["cat:private_vehicle","mfr:<id>","model:<id>","variant:<id>","fuel:<id>","tx:<id>"]`, `["cvt:truck"]`, `["ptype:apartment","listing:rent"]` |
| `vehicleYear`, `bedrooms`, `areaSqft` (number) | Copied from the detail row so no `$lookup` is needed before pagination | `2022` |
| `imageCount`, `sellerVerified` | Inputs to `sellerQuality`, copied at build time | `4`, `true` |
| `searchDocVersion`, `searchDocBuiltAt` | Backfill idempotency and stale detection | `1` |

- Built by `AdSearchDocBuilder` in the **same transaction** as the ad write (inventory names are already resolved there for `buildTitle`).
- Write paths: v2 create/update; v1 `create*FromUnified` (×4), `update`, `update*Validated`; `updateAdApproval` (rebuild as a safety net); admin edits.
- Catalogue renames (`updateManufacturer`, `updateVehicleModel`, `updateVehicleVariant`) enqueue `search.rebuild` for the affected ads through the outbox.
- Property filters (`propertyTypes`, `listingType`, bedrooms, area) also move onto the ad document, removing the second pre-pagination `$lookup`.

### C.6 Scoring

```
relevance      Mongo : structuredHit ? 10 + boosts : min(textScore, 10) × 0.8 + boosts
               Atlas : native compound score (entity clause boost 10, text score, attribute boosts)
distanceDecay  Mongo : max(0.05, exp(-(km / 40)²))        1.0 at 0 km · 0.94 at 10 · 0.53 at 32 · 0.21 at 50 · floor beyond ~70
               Atlas : should-clause `near` on geoLocation, pivot 20 000 m   (reciprocal decay, same shape)
freshnessDecay Mongo : max(0.1, 0.5 ^ (ageDays / 14))
               Atlas : should-clause `near` on createdAt, pivot 14 days
sellerQuality  1.0 · ×1.1 if sellerVerified · ×0.9 if imageCount = 0
score          relevance × distanceDecay × freshnessDecay × sellerQuality
```

- Parameters live in one config object per adapter; tests assert **ordering**, not exact numbers, so the two adapters stay interchangeable.
- **Seller diversity:** on page 1 only, at most 3 ads per seller; demoted ads move to the tail of the page (the adapter fetches `limit + 10` to refill). Later pages are untouched so pagination stays stable.
- **Explicit `sortBy`** (price, year) overrides scoring; the candidates stay the same.
- **Pagination under scoring is offset-based**, capped at page 50 for searches. A cursor sent with a search string gets offset semantics (`nextCursor: null`, `hasNext` from `limit + 1`). Atlas `searchAfter` tokens are tier 2.
- **Counts are capped:** Mongo `$limit 1001 → $count`; Atlas `count: {type:'lowerBound', threshold:1000}`. Response: `total: 1000, totalCapped: true`.
- **Caching:** search responses are cacheable for 60 s in Redis, keyed on normalised query + effective filters + geo bucket + engine + page. Invalidated by the existing `invalidateLists()`. `isFavorite` is applied after the cache read, as today. This also closes the feed-cache collision in §A.3.

### C.7 Retrieval port and the two adapters

```ts
interface SearchIndexPort {
  readonly name: 'mongo' | 'atlas';
  search(plan: SearchPlan, page: PageSpec): Promise<{
    ids: ObjectId[]; scores: Map<string, number>;
    total?: number; totalCapped?: boolean; nearestKm?: number;
  }>;
}
```

The adapter returns ids and scores; `ListAdsUc` hydrates the page with the existing post-pagination lookups, so response mapping is shared. `SEARCH_ENGINE=mongo|atlas` selects the adapter; Atlas falls back to Mongo automatically on an index-not-found error (logged once a minute, like the text-index fallback today).

**MongoNativeAdapter**

```
$match { isActive, isApproved, isDeleted:{$ne:true}, soldOut:{$ne:true},
         category?, geoLocation:{$geoWithin}?, price?, vehicleYear?,
         $or: [ { searchKeys: { $in: entityKeys } }, { $text: { $search: normalized } } ] }
[$limit 3000]                       // candidate cap, NONE/WEAK strength only
$addFields { structuredHit, textScore:{$meta:'textScore'}, distanceKm (haversine $let), ageDays, score }
$sort { score:-1, _id:-1 }  $skip  $limit(+10 on page 1)
$project { _id, score, distanceKm }
```

`$text` inside `$or` is allowed because every other clause (`searchKeys`) is indexed **[VERIFY on the deployed server version]**. `$geoNear` is never used for searches, so the "text can't combine with geo" limitation disappears.

**AtlasSearchAdapter** (`$search` as stage 0)

| Plan element | `$search` |
|---|---|
| Hard filters | `compound.filter`: `equals` (booleans, category token), `in` (searchKeys), `range` (price, vehicleYear), `geoWithin` (circle) |
| Entity candidates | `compound.should`: `in` on `searchKeys` with `score.boost 10` |
| Text candidates | `compound.should`: `text` on `[searchText, title, description]`, `fuzzy: { maxEdits: 1 (word < 6 chars) / 2, prefixLength: 1 }` |
| `minimumShouldMatch: 1` | at least one candidate clause must hit |
| Attribute boosts | `should` clauses (`in` on the fuel/transmission key, `range` on year) with constant boosts |
| Distance | `should`: `near` on `geoLocation`, `pivot: 20000` |
| Freshness | `should`: `near` on `createdAt`, `pivot: 14 days` |
| Count | `count: { type: 'lowerBound', threshold: 1000 }` |
| Paging | `$skip` / `$limit` (searchAfter in tier 2) |
| Debug | `{$meta:'searchScore'}`, `searchScoreDetails` when the debug header is set |

Atlas index definition (kept in the repo, `src/search/atlas/ads-search-index.json`): `dynamic: false`; `searchText`, `title`, `description` as `string` (`lucene.standard`); `searchKeys`, `category` as `token`; `isActive`, `isApproved`, `isDeleted`, `soldOut` as `boolean`; `price`, `vehicleYear` as `number`; `createdAt` as `date`; `geoLocation` as `geo`; `postedBy` as `token`. Created with `createSearchIndex` from the driver (Mongo 7.0+) by `search:atlas-index -- --apply`, verified with `$listSearchIndexes` status `READY`. Local development and CI use the `mongodb/mongodb-atlas-local` Docker image, which runs Atlas Search locally.

### C.8 Geo independent of keywords

| Request | Strategy |
|---|---|
| Search, lat/lng, no `maxDistance` | Candidates by filters + OR clause; distance is a **ranking** term, not a filter. Response reports `radius.nearestResultKm`. One query, no ladder. |
| Search + explicit `maxDistance` | Hard `geoWithin`. |
| Search + typed location | Hard `geoWithin(centroid, radiusKmHint)`; decay centre moves to the centroid. |
| Feed (no search) | Unchanged: `$geoNear` ladder 50 → 200 → 1000 → none. |

On Mongo, selective queries (STRONG/PARTIAL) are matched first and distance is computed on the matched set; broad queries (NONE/WEAK) take the 3 000-candidate cap before scoring. Atlas needs neither, because `near` scores inside the index.

### C.9 Fuzzy lexicon (SymSpell + phonetic)

- Built on every lexicon reload from all term phrases and their single tokens (a few thousand entries; well under 1 MB).
- Lookup order per n-gram: exact → SymSpell (max edits by length: < 5 chars none, 5–7 one, ≥ 8 two; multi-word phrases by token) → phonetic key (custom Indic-Latin key: lowercase, collapse doubled letters, `ph→f`, `v/w`, `ee→i`, `oo→u`, `ck→k`).
- Never fuzzy-matches numbers, stop words, locative separators, or `UNSAFE_STANDALONE_MODELS`.
- A unique hit becomes the entity plus `corrections:[{from, to}]` and a `correction` chip; a tie is left to the text clause.
- Unit-tested against a typo list (`cretta`, `swfit`, `hyndai`, `wagonr`, `enfeild`, `vagonar`, `activa`→ must not become `access`).

### C.10 Lexicon correctness

- Manufacturer payload gains `categories[]`, derived from its models at materialisation.
- `hintOnly: true` on the `DUAL_HINT_TERMS` seed rows.
- `LexiconService.reload()` computes health: MODEL-term count, catalogue max `updatedAt` vs `lastMaterializedAt`. With zero MODEL terms the parser runs in hint-only mode (no entity clauses, text always kept), logs an error once a minute, and `search:validate` reports the same state.
- Materialiser logs catalogue models it could not categorise.

### C.11 Search events

Written through the outbox (never on the request path), 180-day TTL, no PII (hashed userId or anonymous session id, no phone/email).

```
search_events  { ts, sessionId, userHash?, engine, original, normalized, strength, strategy,
                 parsedSummary{category, brands, models, corrections}, explicitFilterKeys[],
                 geoBucket, resultCount, totalCapped, nearestKm, latencyMs, fallbackUsed, page }
search_clicks  { eventId, adId, position, action: 'view' | 'contact' | 'favorite', ts }
```

`POST /v2/ads/search/events` receives clicks from the app (`eventId` is returned in the list response as `query.eventId`). Reports are tier 2; the data is tier 1.

### C.12 Response `query` block

Always present when `search` was sent; safe for clients (no Mongo internals):

```json
"query": {
  "eventId": "…",
  "original": "Hyndai Cretta 2020",
  "normalized": "hyndai cretta 2020",
  "remaining": "",
  "corrections": [{ "from": "hyndai", "to": "hyundai" }, { "from": "cretta", "to": "creta" }],
  "parsed": { "brands": ["Hyundai"], "models": ["Creta"], "year": 2020, "category": "private_vehicle" },
  "strength": "strong",
  "strategy": "hybrid",                 // hybrid | category | text
  "engine": "atlas",
  "fallbackUsed": false,
  "relaxations": [],                    // e.g. [{ "dropped": "category", "reason": "zero_results" }]
  "conflicts": [],
  "radius": { "requestedKm": null, "nearestResultKm": 3.2 },
  "totalCapped": false,
  "chips": [ … ]
}
```

With `NODE_ENV != production` and the header `x-search-debug: 1`, the response adds `debug: { parseMs, engine, queryMs, candidates, scoreDetails: [{id, relevance, distanceDecay, freshnessDecay, sellerQuality}] }`.

### C.13 Query budget

| Request | Today (worst case) | Tier 1 |
|---|---|---|
| `creta` + geo, matches nearby | 1 agg + 1 count | 1 + 1 (capped count) |
| `hyundai creta` + geo, none nearby | 4 aggs + 4 counts | 1 + 1 |
| `xyzabc` + geo | 4 + 4 | 1 + 1 |
| STRONG with 0 results | 1 (empty, wrong) | 2 (one relaxation) |
| Repeated popular query | uncached | Redis hit |

---

## D. Files to modify

**Parser and lexicon** (`src/search/`)
- `services/search-query.service.ts`: keep `normalized`/`remaining`; entities vs attributes; strength; `hintOnly`; model-implies-brand; brand `categories`; conflicts; fuzzy lookup integration.
- **NEW** `services/fuzzy-lexicon.ts`: SymSpell index + phonetic key.
- `dto/parsed-query.ts`: `strength`, `remaining`, `entities`, `attributes`, `corrections`, `conflicts`; `applyAsFilter` kept as a deprecated alias.
- `services/lexicon.service.ts`: builds the fuzzy index on reload; health stats; hint-only mode.
- `services/inventory-lexicon.materializer.ts`: manufacturer `categories[]`; uncategorised-model log; `lastMaterializedAt`.
- `schemas/search-term.schema.ts`: `categories?: string[]`, `hintOnly?: boolean`.
- `constants/lexicon.seed.ts`: `hintOnly` on `DUAL_HINT_TERMS`.

**Planning, scoring, retrieval** (`src/search/`)
- **NEW** `planner/search-planner.ts` (DTO + ParsedQuery → SearchPlan), `planner/search-plan.ts` (types).
- **NEW** `scoring/scoring.config.ts`, `scoring/diversity.ts`.
- **NEW** `ports/search-index.port.ts`.
- **NEW** `adapters/mongo-native.adapter.ts`, `adapters/atlas-search.adapter.ts`, `adapters/search-engine.factory.ts`.
- **NEW** `atlas/ads-search-index.json`.
- **NEW** `services/ad-search-doc.builder.ts`.
- **NEW** `events/search-event.schema.ts`, `events/search-click.schema.ts`, `events/search-events.service.ts`.
- `scripts/search-index-migration.ts`: `searchKeys` index; fix the `districtSlug` supporting indexes; keep `ad_search_v2` for the Mongo adapter.
- **NEW** `scripts/search-backfill.ts`, `scripts/search-validate.ts`, `scripts/search-explain.ts`, `scripts/search-atlas-index.ts`.
- `search.module.ts`: register the above.

**Listing** (`src/ads-v2/`)
- `application/use-cases/list-ads.uc.ts`: remove text deletion in `resolveFilters`; call planner + port; hydrate ids; scoring-aware pagination; search cache key; `query` block; feed path untouched.
- **NEW** `application/use-cases/list-ads.hydrate.ts`: the existing post-pagination lookups, extracted.
- `dto/list-ads-v2.dto.ts`: `search` docstring; `maxLength 120`; `sortBy: 'relevance'` (default for searches).
- `ads.v2.controller.ts`: debug header passthrough; `POST search/events`.
- `application/use-cases/create-ad.uc.ts`, `update-ad.uc.ts`: `AdSearchDocBuilder` inside the transaction.
- `domain/ad.v2.mappers.ts`: expose resolved inventory names to the builder.

**Legacy write paths** (`src/ads/`)
- `schemas/ad.schema.ts`: new fields; text-index declaration aligned with `ad_search_v2` (local autoIndex only).
- `services/ads.service.ts`: `createPropertyAdFromUnified`, `createVehicleAdFromUnified`, `createCommercialVehicleAdFromUnified`, `createTwoWheelerAdFromUnified`, `update`, `updateVehicleAdValidated`, `updateCommercialVehicleAdValidated`, `updatePropertyAd`, `updateAdApproval`.

**Catalogue change propagation** (`src/vehicle-inventory/`)
- `vehicle-inventory.service.ts` (`updateVehicleModel`, `updateVehicleVariant`, `updateManufacturer`), `manufacturers.service.ts` (`updateManufacturer`): enqueue `search.rebuild`.

**Config and tooling**
- `package.json`: `search:backfill`, `search:validate`, `search:explain`, `search:atlas-index`.
- `env.example`: `SEARCH_PARSER_ENABLED`, `SEARCH_ENGINE`, `SEARCH_KEYS_FILTERS`, `SEARCH_V3_RETRIEVAL`, `SEARCH_DEBUG_HEADER`.
- `docker-compose.dev.yml`: `mongodb/mongodb-atlas-local` service for local Atlas Search.

---

## E. Database and index changes

| # | Collection | Change | How | Risk |
|---|---|---|---|---|
| 1 | `ads` | **Verify** which text index exists today | `npm run search:indexes -- --status` on UAT and prod | none |
| 2 | `ads` | New fields: `searchText`, `searchKeys[]`, `vehicleYear`, `bedrooms`, `areaSqft`, `imageCount`, `sellerVerified`, `searchDocVersion`, `searchDocBuiltAt` | code + backfill (row 6) | additive |
| 3 | `ads` | `{ searchKeys: 1, isActive: 1, isApproved: 1, createdAt: -1 }` (multikey) | `search:indexes -- --supporting`, background | additive; build time scales with the collection |
| 4 | `ads` | Text index `ad_search_v2 {searchText:10, title:6, description:1}` replacing `title_text_description_text` (Mongo adapter and fallback) | existing `--swap-text`; the regex fallback covers the gap; run after the backfill in a low-traffic window | brief degraded search during the build |
| 5 | `ads` | **Atlas Search index** `ads_search` (definition in §C.7) | `search:atlas-index -- --apply`; verify `READY` | build time; cluster CPU/RAM (M10+ recommended, dedicated Search Nodes at scale) |
| 6 | `ads` | Backfill: `search:backfill -- [--dry-run] [--only-missing] [--batch 500] [--since <date>]` | resumable `_id` cursor, `safe-bulk.util`, `db-safety` guard, idempotent via `searchDocVersion`; reports ads with missing detail rows or catalogue refs | write load, throttled |
| 7 | `search_terms` | Re-materialise with `categories[]` and `hintOnly` | `npm run search:seed` per environment | none (upserts) |
| 8 | `search_events`, `search_clicks` | New collections; TTL 180 days on `ts`; indexes `{normalized:1, ts:-1}`, `{resultCount:1, ts:-1}`, `{eventId:1}` | code + `--supporting` | small write volume via outbox |
| 9 | `ads` | Fix or drop the `districtSlug` supporting indexes in the migration script | code | none |
| 10 | — | `search:validate` (read-only, CI-safe) and `search:explain` (explain plans and timings for the fixed query set, both engines) | new scripts | read-only |

**`search:validate`** reports: catalogue entities with no lexicon term; terms pointing at deleted or missing ids; models with no derivable category; seed hints with no catalogue match; conflicting phrase mappings; lexicon older than the catalogue; fuzzy-index size and build time; ads missing or with a stale `searchDocVersion`; vehicle ads with no detail row or with refs to missing catalogue docs; the active text index; the Atlas Search index status and whether its definition matches the repo JSON. Non-zero exit on errors.

---

## F. Test plan

**Unit: parser and fuzzy** (`src/search/test/`, stub lexicon extended with creta, swift, i20, verna, Hyundai, Maruti Suzuki, Tata Motors, both Honda docs, and one model without `vehicleType`)
- `original` and `normalized` are always kept; `remaining` is correct; no word is ever lost.
- Strength for each query in the matrix; `hintOnly` on an unmaterialised lexicon gives WEAK with text kept.
- Fuzzy: the typo list resolves with `corrections`; ties are not applied; numbers and unsafe models never fuzzy-match; edit-distance limits by length.
- Brand gives `categories` from the payload; `honda` gives both ids; `hyundai swift` gives model Swift with the brand conflict recorded.

**Unit: planner** (**new** `search-planner.spec.ts`), table-driven over the C.4 query table: hard filters, candidate clauses, boosts, conflict handling, and that explicit filters appear in every plan and are never relaxed.

**Unit: scoring** — decay monotonicity, floors, seller multipliers, page-1 diversity (max 3 per seller, refilled), ordering invariance across the two adapters' parameter sets.

**Adapter contract tests** (**new** `src/search/test/adapters/*.contract.spec.ts`)
- Run the **same** expectations against both adapters on `mongodb/mongodb-atlas-local` (Mongo adapter uses `$text`, Atlas adapter uses `$search`). Seed about 30 ads across cars, bikes, commercial and property with custom and auto titles.
- Cases: the full C.4 table with and without lat/lng; `maxDistance` hard bound; typed location; union of two models; boosts change order but not the set; capped count; page-50 cap; empty result is a single query; relaxation runs once and is reported; Atlas index-missing falls back to Mongo.

**Integration** (**new** `src/ads-v2/test/list-ads.search.spec.ts`)
- Through `ListAdsUc.exec`: result sets, `query.*` fields, `isFavorite`, hydration shape unchanged.
- **Regression:** every existing explicit filter alone and combined with `search` (category, brand, model, price, year, fuel, transmission, location, radius, page and cursor, sorting), and the feed path (no `search`) byte-for-byte unchanged.
- **Cache:** a search is never served from a feed key; a repeated search is served from Redis within 60 s.
- **Events:** one `search_events` row per request; a click posts a `search_clicks` row; no PII stored.

**Builder and backfill** — per-category doc-builder tests; dry-run count equals the ad count; idempotent re-run writes nothing; catalogue rename triggers a rebuild through the outbox.

**Performance** (`search:explain` on UAT, before and after, both engines)
- Fixed query set; record `executionTimeMillis`, `totalDocsExamined`, `totalKeysExamined`, `nReturned`, winning index, queries per request; with and without geo; parser on; fallback.
- Targets: p95 < 150 ms on the category+search path; docsExamined/nReturned < 10 on the structured path (Mongo); Atlas p95 < 100 ms.

---

## G. Risk assessment: behaviour that will change

| Change | Who notices | Mitigation |
|---|---|---|
| Recognised words stay in retrieval | Queries that return "all cars"/"all ads" today return relevant results | intended; release note |
| Brand-only searches start filtering | apps currently getting everything for "hyundai" | intended |
| Attributes rank instead of filter | `creta petrol` shows diesel Cretas below the petrol ones | intended; chips still show "Petrol"; document it |
| Searches are scored, not newest-first, and no longer ladder | result order changes for **searches** only; feed unchanged | `SEARCH_V3_RETRIEVAL` flag; UAT A/B; `sortBy` still honoured |
| Parsed location is applied | "creta kollam" typed in Kochi shows Kollam | intended |
| Fuzzy corrections | a rare model could be "corrected" to a common one (`vento` vs `venue` are 2 edits apart) | length-scaled edit limits, ties never applied, correction chip is undoable, corrections logged |
| Score-based pagination | offset only, page cap 50, cursor ignored for searches | documented in the DTO |
| Capped `total` | app shows "1000+" | additive `totalCapped` field |
| Atlas Search | eventual consistency (seconds), index build time, cluster resources, Atlas-only | ads are pending on create anyway; Mongo adapter fallback; `SEARCH_ENGINE` flag; `search:validate` checks index status |
| Local dev needs Atlas Search | plain `mongo` image no longer enough for search tests | `mongodb-atlas-local` in `docker-compose.dev.yml`; Mongo adapter still works on plain Mongo |
| Text-index swap | short degraded window (regex fallback exists) | run after the backfill, low-traffic window, `--rollback` available |
| Backfill write load | DB IO | batched, throttled, resumable, off-peak |
| v1 write paths must maintain the search doc | any missed path means stale search | `search:validate` flags stale docs; nightly `--only-missing` run |
| Explicit filters moving to `searchKeys` | wrong if the backfill is incomplete | `SEARCH_KEYS_FILTERS` only when validate reports 100% |
| Search event volume and privacy | new collections | TTL 180 d, hashed user id, no contact data |
| Decay parameters are guesses | ordering may feel off in some areas | tier 2 tuning from logs; parameters are config, not code |

**Rollout order**
1. Baseline with `search:explain` (current code, both environments).
2. Deploy with all flags off (`SEARCH_ENGINE=mongo`, `SEARCH_V3_RETRIEVAL=false`).
3. `search:seed` → `search:backfill` → `search:validate` until green.
4. `search:indexes -- --supporting`, then `--swap-text` in a low-traffic window.
5. `search:atlas-index -- --apply`; wait for `READY`; `search:validate` green.
6. UAT: `SEARCH_PARSER_ENABLED=true`, `SEARCH_V3_RETRIEVAL=true`, `SEARCH_ENGINE=mongo`; run the matrix and `search:explain`.
7. UAT: `SEARCH_ENGINE=atlas`; rerun; compare.
8. Prod: same two steps, one flag at a time.
9. `SEARCH_KEYS_FILTERS=true` once validate reports 100%.
10. `search:explain` again; record before/after in this document.

---

## H. Must verify before implementation (needs DB access)

| Item | Command / query |
|---|---|
| Atlas cluster tier and MongoDB server version | Atlas UI; `db.version()`. `createSearchIndex` from the driver needs 7.0+ (otherwise create via the Atlas UI/Admin API once). |
| Is Atlas Search enabled on the tier? | Atlas UI → Search |
| Is the parser on in UAT/prod? | server env / ECS task env for `SEARCH_PARSER_ENABLED` |
| Which text index is live | `npm run search:indexes -- --status` |
| Is `search_terms` materialised per environment? | `db.search_terms.countDocuments({type:'model'})`, `db.search_terms.findOne({term:'creta'})` |
| Duplicate catalogue models or brands | `db.vehiclemodels.aggregate([{$group:{_id:{$toLower:'$name'},n:{$sum:1}}},{$match:{n:{$gt:1}}}])` |
| Models without `vehicleType` | `db.vehiclemodels.countDocuments({vehicleType:{$exists:false}})` |
| Do Creta ads reference the lexicon's Creta id? | compare `vehicleads.distinct('modelId', …)` with the term payload |
| Custom-title share | vehicle ads whose `title` does not start with the model name |
| Do `ads.district` values align with gazetteer names? | `db.ads.distinct('district')` vs `location_terms` |
| `$text` inside `$or` on the deployed version | run the Mongo adapter's query once against UAT |
| Flutter request shape for search | does the app send `category`, lat/lng, `maxDistance`, `cursor` with `search`? Where will click events be sent from? |

---

## I. Decisions

Resolved by the tier-1 design (say so if you disagree):
- **D1** radius for searches → distance is a ranking decay, not a cap; explicit `maxDistance` stays hard.
- **D2** `creta swift` → union.
- **D3** typed location beats device lat/lng; the filter sheet beats both.
- **D4** `creta 2020` → exact year boosted, ±1 lightly, no hard filter.
- **D5** integration tests → `mongodb/mongodb-atlas-local`, both adapters.
- **D6** default order for searches → scored (relevance × distance × freshness); `sortBy` overrides.
- **D7** typos → SymSpell in the parser plus Atlas fuzzy text; tier 1.

Answered 22 Sep 2026:
- **D8** Production is **Atlas M10 (General), MongoDB 8.0.32, AWS ap-south-2 (Hyderabad), 3-node replica set, ~2.3 GB of 10 GB used, ~2 ops/s**, no Atlas Search index yet. Atlas Search is available on M10; `createSearchIndex` from the driver works on 8.0; index builds at this data size take minutes. Search (`mongot`) shares the M10 nodes' CPU/RAM; watch it after enabling and move to Search Nodes only if it competes with the database.
- **D9** Scoring defaults accepted: distance σ = 40 km, freshness half-life 14 days, max 3 ads per seller on page 1. All three are config, tuned in tier 2.
- **D10** Clicks and contacts go to a new `POST /v2/ads/search/events` with `{eventId, adId, position, action}`.

---

## J. Roadmap after tier 1

| Tier | Adds | Trigger |
|---|---|---|
| **2** (after 4–6 weeks of logs) | Zero-result report and lexicon gap list; popularity-weighted suggestions (`GET /v2/ads/search/suggest`, Atlas `autocomplete` on `searchText` plus top queries with results); query rewrites learned from retries; golden query set (~150 real queries) as a regression test; offline tuning of boosts and decay against click-through; Atlas synonym mappings; `searchAfter` pagination; facet counts via `$searchMeta` | logs exist |
| **3** (when the numbers justify it) | Semantic candidates: embed the search document and the query, Atlas Vector Search (`$vectorSearch`) as a second candidate source, fused with reciprocal rank fusion (`Σ 1/(k + rank)`); later learning-to-rank (LambdaMART) on click/contact features | NONE-strength queries > 10–15 % of searches, or ~1M searches/month |

Nothing in tiers 2 and 3 is blocked by tier 1's design: the port accepts a second candidate source, the search document is the embedding input, and the events are the training data.

---

## K. Effort (tier 1)

| Work | Days |
|---|---|
| Parser changes + fuzzy lexicon + tests | 1.5 |
| Planner + scoring + diversity + tests | 1.5 |
| Search document, builder, all write paths, backfill | 2 |
| Mongo adapter + `list-ads.uc.ts` refactor + hydration split | 2 |
| Atlas adapter + index definition + local Atlas in compose | 1.5 |
| Search events + endpoint | 0.5 |
| validate / explain / atlas-index scripts | 1 |
| Contract + integration tests, UAT runs, explain before/after | 1.5 |
| **Total** | **~11.5** |

---

## L. Implementation status (23 Sep 2026, branch `feat/search-v3-hybrid`, not committed)

All of tier 1 is implemented and unit-tested. Everything that touches a database is written but **not yet run**, because no database was reachable from the implementation session.

### What was built

| Area | Files | Notes |
|---|---|---|
| Parser | `search/services/search-query.service.ts`, `dto/parsed-query.ts`, `services/fuzzy-lexicon.ts`, `services/lexicon.service.ts`, `services/inventory-lexicon.materializer.ts`, `constants/lexicon.seed.ts`, `schemas/search-term.schema.ts` | Never deletes words (`normalized`, `textQuery`, `freeText`); `strength` classes; SymSpell + phonetic corrections with chips; `hintOnly` seeds; brand `categories[]` and merged `manufacturerIds` (Honda cars + bikes); `exactYear`; lexicon `mode`/`health()`. Legacy `applyAsFilter` kept for the old path and made safer. |
| Planner + scoring | `search/planner/search-plan.ts`, `planner/search-planner.ts`, `scoring/scoring.config.ts`, `scoring/diversity.ts` | Pure. Explicit filters > parsed entities > text > boosts; one relaxation step (drop parsed category); conflicts; typed place beats device location; `SearchKey` vocabulary shared with the doc builder; env-tunable scoring; page-1 seller diversity. |
| Search document | `search/services/ad-search-doc.builder.ts`, `services/search-doc-sync.service.ts`, `ads/schemas/ad.schema.ts` | `searchText`, `searchKeys`, `vehicleYear`, `bedrooms`, `areaSqft`, `imageCount`, `sellerVerified`, `searchDocVersion`. Built inside the v2 create/update transaction; rebuilt after every v1 create/update/approval (`AdsService.syncSearchDoc`) and after a brand/model/variant rename (in-process, best-effort, not via the outbox: there is no outbox consumer in the codebase). |
| Retrieval | `search/ports/search-index.port.ts`, `adapters/mongo-native.adapter.ts`, `adapters/atlas-search.adapter.ts`, `adapters/search-engine.factory.ts`, `atlas/ads-search-index.json` | One scored query per step; Mongo: `$or` of `searchKeys`/`$text`, `$geoWithin`, haversine, Gaussian decays, capped count; Atlas: `compound` with candidates in `must{should,minimumShouldMatch:1}`, boosts/`near` in `should`, `$searchMeta` count; plans that still need legacy `$lookup` filters are routed to Mongo; Atlas errors fall back to Mongo. |
| Use case + API | `ads-v2/application/use-cases/list-ads.search.ts`, `list-ads.uc.ts`, `ads.v2.controller.ts`, `dto/list-ads-v2.dto.ts`, `dto/search-event.dto.ts` | `SEARCH_V3_RETRIEVAL=true` routes requests with `search` to the new path; feed unchanged. `query` block per §C.12 (`eventId`, `strength`, `strategy`, `engine`, `corrections`, `relaxations`, `conflicts`, `radius`, `totalCapped`, legacy fields). 60 s Redis cache. `x-session-id` and `x-search-debug` headers. `POST /v2/ads/search/events`. `sortBy` gains `relevance`/`newest`/`year`/`distance`; `search` max 120 chars. |
| Events | `search/events/search-event.schema.ts`, `events/search-events.service.ts` | `search_events` + `search_clicks`, 180-day TTL, hashed user id, fire-and-forget. |
| Scripts | `search:backfill`, `search:validate`, `search:explain`, `search:atlas-index`, `search:indexes` (supporting index fixed) | All use the existing `db-safety` guard (`--apply`, `--prod --confirm <db>`, `ALLOW_PROD_WRITE`). |
| Tests | `search/test/*.spec.ts`, `adapters.contract.spec.ts`, `docker-compose.search.yml` | 206 unit tests green (parser, fuzzy, planner, scoring, doc builder, v2 create/update). The adapter contract suite (20 cases × 2 engines) runs against `MONGO_TEST_URI` and is skipped otherwise. |

### Not done in this pass

- Nothing has been executed against a database: `search:seed`, `search:backfill`, `search:validate`, `search:indexes`, `search:atlas-index`, `search:explain` and the contract tests are all still to be run (no Docker on the implementation machine).
- `updatedAt` on `search_terms` is relied on for staleness; if the collection was created before `timestamps: true`, re-run `search:seed` once.
- Cursor pagination is not offered on scored searches (offset, page cap 50). Atlas `searchAfter` is tier 2.
- The pre-existing failing suites `get-ad-by-id.uc.spec.ts` (jest cannot resolve `src/utils/...` absolute imports) and `create-ad.e2e.spec.ts` (wrong relative imports) were not touched.

### Next steps, in order

1. Review the diff on `feat/search-v3-hybrid` and commit it.
2. `docker compose -f docker-compose.search.yml up -d` then `MONGO_TEST_URI=... npm run search:test:contract` — 20 cases on both engines.
3. On UAT: `npm run search:seed`, `npm run search:backfill -- --apply`, `npm run search:validate` until green, `npm run search:indexes -- --supporting --apply`, `npm run search:indexes -- --swap-text --apply`, `npm run search:atlas-index -- --apply --wait`.
4. `npm run search:explain -- --legacy` for the before/after table; keep the JSON in `reports/`.
5. Flip `SEARCH_PARSER_ENABLED=true` and `SEARCH_V3_RETRIEVAL=true` (engine `mongo`), run the query matrix through the app, then `SEARCH_ENGINE=atlas`, then production the same way, then `SEARCH_KEYS_FILTERS=true` once validate reports 0 missing docs.
6. App: send `x-session-id`, post clicks to `/v2/ads/search/events` with `query.eventId`, render `correction` chips, use `sortBy: 'newest'` where newest-first is wanted on a search.
