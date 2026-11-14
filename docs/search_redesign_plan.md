# AdoDad — Global Search Redesign (OLX-style intent search)

**Status:** design only — no code written yet
**Date:** 17 Sep 2026
**Scope:** `ado-dad` backend, `ads-v2` list/search path. Mobile UI is a follow-up pass.
**Decision taken:** stay on MongoDB (no Meilisearch/Typesense/Atlas Search for now).

---

## 1. The complaint, stated precisely

> Searching "cars", "bikes" or "property in kollam" returns everything that *contains* those
> keywords instead of the category + location the user meant.

That is exactly what the code does today. Search is a **string match**. It is not a **query
understanding** problem yet, and every large marketplace treats it as one.

### 1.1 What happens today

All paths live in `src/ads-v2/application/use-cases/list-ads.uc.ts`.

| Situation | Code | Behaviour |
|---|---|---|
| `search` set, **no** coordinates | `:382-391` | `$match: { $text: { $search: term }, ...baseMatch }` |
| `search` set, **with** coordinates | `:466-476` | `$geoNear` first, then `$match` with unanchored `$regex` on `title`/`description` |
| `location` set | `:448-454`, `:493-497` | `location: { $regex: location, $options: 'i' }` — free-text column, unanchored |
| `category` set | `:441-445` | hard `$match` — but nothing ever *derives* it from the query |
| Sorting | `:361`, sort stage | `createdAt DESC` (or `$geoNear` order). **Text score is never used.** |

The text index is `{ title: 'text', description: 'text' }` (`src/ads/schemas/ad.schema.ts:173`).
Nothing else is searchable.

### 1.2 Why "cars in kollam" fails, token by token

1. **`cars`** — `$text` stems to `car`. It matches *any* ad whose title/description contains
   "car": a bike ad saying "no scratches, kept in car porch", a flat ad saying "car parking
   available", a truck ad. Category is never inferred, so `category` stays `undefined` and the
   `$match` at `:441` never runs.
2. **`in`** — stop word, dropped.
3. **`kollam`** — treated as another search token. It matches ads whose *description* mentions
   Kollam, and **misses** every Kollam ad that doesn't spell the word in the text. Meanwhile
   `Ad.city`, `Ad.district`, `Ad.state` exist and are indexed (`ad.schema.ts:62-72`, `:179-189`)
   and are **never touched by search**.
4. If the app also sent coordinates (home feed and category pages do), `$geoNear` runs with a
   50/200/1000 km ladder (`:281`) — so a Kollam query silently returns Kochi and Coimbatore ads
   ranked by *recency*, not relevance.

So: a keyword soup, ranked by newest-first, over a radius the user never asked for.

### 1.3 Other defects found in the same path (fix regardless of this redesign)

| # | Issue | Location |
|---|---|---|
| S-1 | **Regex injection / ReDoS.** `searchTrimmed` and `location` go into `$regex` unescaped. A query of `(a+)+$` or `.*` is a server-side CPU bomb. `src/common/security/regex.util.ts` already exists and is not used here. | `:451, :471-472, :495, :508-509` |
| S-2 | **Any `search` disables the list cache entirely** (`:194`) — the most repeated queries in the product ("bikes", "cars in kollam") have a 0% hit rate. | `:193-214` |
| S-3 | **DTO documentation is false.** `list-ads-v2.dto.ts:28-35` claims search covers "manufacturer names, model names, variant names, fuel types, transmission types". It covers `title` + `description` only. | `list-ads-v2.dto.ts:30` |
| S-4 | **Two different search semantics** depending on whether coordinates were sent (`$text` vs `$regex`). Same query, different result set — untestable and unexplainable to users. | `:376-391` vs `:466-476` |
| S-5 | Unanchored `$regex` on `location` cannot use any index → collection scan on every located query. | `:451` |

---

## 2. How OLX and the large marketplaces actually do it

The mental model to copy is **not** "better text matching". It is a four-stage pipeline:

```
raw query  →  ① QUERY UNDERSTANDING  →  ② STRUCTURED RETRIEVAL  →  ③ RANKING  →  ④ RELAXATION
"cars in       category=private_vehicle    hard filters on          relevance      widen only
 kollam"       location=Kollam(district)   indexed fields           + distance     if empty,
               freeText=""                                         + recency      and say so
```

Four properties that make their search feel "right", all of which AdoDad lacks:

1. **Location is a filter, never a search token.** OLX has a dedicated location picker; if you
   *type* a place name it is lifted out of the text and becomes a filter. You never see ads
   matched because the word "Kollam" happened to be in a description.
2. **Category is inferred and shown back as a removable chip.** "cars" resolves to the Cars
   category; the results header reads *Cars in Kollam* with an ✕ on each chip. The user can
   see and undo the interpretation — that is what makes aggressive inference safe.
3. **Brand / model / attributes are structured.** "swift dzire vdi 2018 under 5 lakh" becomes
   `model=Swift Dzire`, `variant=VDI`, `minYear=2018`, `maxPrice=500000` — not five text tokens.
4. **Zero results are relaxed in a stated ladder**, never silently. "No cars in Kollam —
   showing results in Kerala" beats returning Coimbatore ads with no explanation.

Everything below is that pipeline, mapped onto the current Mongo schema.

---

## 3. Target architecture

```
                       ┌──────────────────────────────────────────┐
POST /v2/ads/list  ───▶│ SearchQueryService                       │
  { q, lat, lng, … }   │  ├─ normalize (lowercase, punctuation,   │
                       │  │   Malayalam/roman transliteration)    │
                       │  ├─ n-gram longest-match vs LEXICON      │──┐
                       │  ├─ numeric rules (5 lakh, 2bhk, 2018)   │  │
                       │  └─ ParsedQuery + chips + confidence     │  │
                       └───────────────┬──────────────────────────┘  │
                                       ▼                             │
                       ┌──────────────────────────────────────────┐  │  Redis-cached,
                       │ ListAdsUseCase (rewritten retrieval)     │  │  rebuilt on
                       │  hard filters  →  $text on searchText    │  │  inventory change
                       │  → candidate cap → score → page          │  │
                       └───────────────┬──────────────────────────┘  │
                                       ▼                             │
                       ┌──────────────────────────────────────────┐  │
                       │ RelaxationLadder (only when empty)       │  │
                       └───────────────┬──────────────────────────┘  │
                                       ▼                             │
              { data, interpretation, chips, relaxations, facets }   │
                                                                     │
  ┌──────────────────────────────────────────────────────────────┐   │
  │ LEXICON (Mongo `search_terms` + `locations`, Redis-cached)   │◀──┘
  │  category synonyms · brands · models · variants · fuel ·     │
  │  transmission · property types · Kerala gazetteer · units    │
  └──────────────────────────────────────────────────────────────┘
```

### 3.1 The lexicon — collection `search_terms`

One flat, indexed collection. Seeded from constants + materialized from `vehicle-inventory`.

```ts
// src/search/schemas/search-term.schema.ts
@Schema({ timestamps: true })
export class SearchTerm {
  @Prop({ required: true, index: true }) term: string;      // normalized, e.g. "two wheeler"
  @Prop({ required: true }) tokenCount: number;             // 2 — drives n-gram scan
  @Prop({ required: true, enum: SearchTermType }) type: SearchTermType;
  @Prop({ type: Object, required: true }) payload: Record<string, any>;
  @Prop({ default: 50 }) weight: number;                    // tie-breaker; higher wins
  @Prop({ default: true }) isActive: boolean;
}

export enum SearchTermType {
  CATEGORY = 'category',      // payload: { category: 'private_vehicle' }
  PROPERTY_TYPE = 'property_type',
  LISTING_TYPE = 'listing_type',
  MANUFACTURER = 'manufacturer',
  MODEL = 'model',
  VARIANT = 'variant',
  FUEL_TYPE = 'fuel_type',
  TRANSMISSION = 'transmission',
  CV_TYPE = 'commercial_vehicle_type',
  ATTRIBUTE = 'attribute',    // owner count, insurance, furnished…
}
```

Index: `{ tokenCount: 1, term: 1 }`, plus `{ term: 1 }`.

**Category seed (the part that fixes the reported bug).** Weight 100 — a category word always
beats a coincidental brand/text match.

| Canonical | Synonyms to seed |
|---|---|
| `private_vehicle` | car, cars, kar, carr, used car, second hand car, secondhand car, four wheeler, 4 wheeler, fourwheeler, sedan, hatchback, suv, muv |
| `two_wheeler` | bike, bikes, byke, bikeu, two wheeler, 2 wheeler, twowheeler, motorcycle, motor cycle, scooter, scooty, scootie, moped, activa*, bullet* |
| `commercial_vehicle` | truck, lorry, tipper, tempo, pickup, mini truck, van, bus, trailer, goods vehicle |
| `property` | property, properties, real estate, house, houses, home, homes, flat, flats, apartment, villa, plot, plots, land, site, shop, office, godown, warehouse, building |

`*` = also emits a brand/model hint (`activa` → Honda Activa, `bullet` → Royal Enfield) —
a term may carry **two** payloads (category + model); both are applied.

**Property type sub-terms** — emit `category=property` *and* `propertyTypes`:
`flat|apartment → apartment` · `house|home → house` · `villa → villa` · `plot|land|site → plot` ·
`shop → shop` · `office → office` · `godown|warehouse → warehouse` · `commercial → commercial`

**Listing type:** `rent|for rent|rental|lease|വാടക → listingType=rent` ·
`sale|for sale|buy|resale → listingType=sell`

**Brands/models/variants/fuel/transmission** are *generated*, not hand-written:
a boot-time + nightly job walks `manufacturers`, `vehiclemodels`, `vehiclevariants`,
`fueltypes`, `transmissiontypes` and upserts a `SearchTerm` per name + per known alias
(`maruti` = `maruti suzuki`, `vw` = `volkswagen`, `RE` = `royal enfield`). This is what makes
the DTO's promise (S-3) actually true.

### 3.2 The gazetteer — collection `locations`

This is the piece that makes "in kollam" mean Kollam.

```ts
@Schema({ timestamps: true })
export class LocationTerm {
  @Prop({ required: true, index: true }) term: string;        // "kollam", "quilon"
  @Prop({ required: true }) slug: string;                     // "kollam"
  @Prop({ required: true, enum: ['city','district','state','country'] }) kind: string;
  @Prop() displayName: string;                                // "Kollam"
  @Prop() district?: string; @Prop() state?: string; @Prop() country?: string;
  @Prop({ type: [Number] }) centroid?: [number, number];      // [lng, lat]
  @Prop() radiusKmHint?: number;                              // district ≈ 35, city ≈ 10
  @Prop({ default: 60 }) weight: number;
}
```

**Kerala aliases must be seeded** — this is where a generic solution would fail locally:

| Canonical | Aliases to seed |
|---|---|
| Thiruvananthapuram | trivandrum, tvm, tvpm, anantapuri |
| Kollam | quilon, kollam town, chinnakada |
| Alappuzha | alleppey, allepey |
| Ernakulam | kochi, cochin, ernakulam, ekm, kakkanad |
| Thrissur | trichur, thrissoor |
| Kozhikode | calicut, kozhikkode |
| Kannur | cannanore |
| Kasaragod | kasargod, kasaragode |
| Palakkad | palghat |

Plus the taluk/town layer (Karunagappally, Punalur, Paravur, Kottarakkara, Chavara… under
Kollam), so "bikes in punalur" narrows to a town inside the district.

Seed source: the existing reverse-geocoding output already writes `city` / `district` /
`state` onto ads — build the first gazetteer from a `distinct()` over live ads, then curate.

### 3.3 The parser — `SearchQueryService`

```ts
// src/search/services/search-query.service.ts
export interface ParsedQuery {
  raw: string;
  normalized: string;
  category?: AdCategoryV2;
  propertyTypes?: string[];
  listingType?: AdListingType;
  manufacturerIds?: string[];  manufacturerNames?: string[];
  modelIds?: string[];         modelNames?: string[];
  variantIds?: string[];
  fuelTypeIds?: string[];      transmissionTypeIds?: string[];
  commercialVehicleTypes?: string[];
  location?: { kind: 'city'|'district'|'state'; slug: string; displayName: string;
               district?: string; state?: string; centroid?: [number, number]; };
  minPrice?: number; maxPrice?: number;
  minYear?: number;  maxYear?: number;
  bedrooms?: number;
  freeText: string;               // everything the lexicon did not claim
  chips: SearchChip[];            // what the UI renders, in query order
  confidence: number;             // 0..1
  ambiguities: Ambiguity[];       // for "did you mean"
}

export interface SearchChip {
  kind: 'category'|'location'|'brand'|'model'|'price'|'year'|'listing'|'property_type'|'text';
  label: string;                  // "Cars", "Kollam", "under ₹5L"
  filterKey: string;              // "category", "location", "maxPrice"
  filterValue: unknown;
  sourceSpan: [number, number];   // char span in raw query — lets the UI strike it out
}
```

**Algorithm**

1. **Normalize** — lowercase, NFKC, strip punctuation except `₹ . -`, collapse whitespace,
   map Malayalam script tokens through a transliteration table for the seeded terms
   (കാർ → car, ബൈക്ക് → bike, വാടക → rent). Deliberately small: only seeded words.
2. **Split on locative prepositions** — ` in `, ` at `, ` near `, ` around `, `-ൽ`. Everything
   to the right is scanned against the **gazetteer first**; everything to the left against the
   **lexicon first**. This is what disambiguates a place that is also a brand word.
3. **Longest-match n-gram scan** — for n = 4 → 1, slide over unconsumed tokens, look up
   `{ tokenCount: n, term: gram }`. On a hit, consume those tokens and push the payload.
   `second hand car` is consumed as one term before `car` is ever considered.
4. **Numeric rules** (regex, run after step 3 on the remainder — high value in India):
   - `under|below|less than|upto X (lakh|lac|l|crore|cr|k|thousand)?` → `maxPrice`
   - `above|over|more than|from X …` → `minPrice`
   - `X to Y …` → `minPrice` + `maxPrice`
   - `N bhk|N-bhk|N bedroom` → `bedrooms` (+ `category=property`)
   - `YYYY model|after YYYY|YYYY+` → `minYear`; bare 4-digit 1980–next year → `minYear=maxYear`
   - `X km|kms driven` → mileage ceiling
5. **Consistency pass** — if a model was matched, its manufacturer and category are implied and
   backfilled. If `propertyTypes` matched, `category=property`. If both a vehicle and a property
   signal are present, keep the higher-weighted one and record an `Ambiguity`.
6. **Remainder = `freeText`** (used for `$text` scoring, never as a hard filter).
7. **Confidence** = `consumedTokens / totalTokens`, penalized by ambiguity count.

**Worked parses**

| Query | Parsed |
|---|---|
| `cars` | `category=private_vehicle`, freeText=`""` |
| `bikes in kollam` | `category=two_wheeler`, `location={district, kollam}`, freeText=`""` |
| `property in kollam` | `category=property`, `location={district, kollam}` |
| `2bhk flat for rent kollam` | `category=property`, `propertyTypes=[apartment]`, `listingType=rent`, `bedrooms=2`, `location={district,kollam}` |
| `swift dzire vdi 2018 under 5 lakh` | `category=private_vehicle`, `manufacturer=Maruti Suzuki`, `model=Swift Dzire`, `variant=VDI`, `minYear=2018`, `maxPrice=500000` |
| `activa quilon` | `category=two_wheeler`, `model=Honda Activa`, `location={district,kollam}` |
| `red sofa` | nothing matched → `freeText="red sofa"`, confidence 0 → pure text search (today's behaviour, correctly preserved) |

**Safety rail:** if `confidence < 0.34` and only *one* weak term matched, do **not** hard-filter
on it — pass it as a ranking boost instead. Prevents "carpenter tools" from being forced into
the Cars category.

### 3.4 Denormalized search fields on `Ad`

Structured filters need the facts on the `Ad` document — today brand/model live in
`vehicleads` and need a `$lookup`, which cannot be combined with `$text` cheaply.

```ts
// src/ads/schemas/ad.schema.ts — additions
@Prop({ type: String, required: false }) searchText?: string;
@Prop({ type: [String], required: false, index: true }) searchTags?: string[];
@Prop({ type: String, required: false, index: true }) citySlug?: string;
@Prop({ type: String, required: false, index: true }) districtSlug?: string;
@Prop({ type: String, required: false, index: true }) stateSlug?: string;
@Prop({ type: Date, required: false }) searchDocBuiltAt?: Date;
```

- **`searchText`** — space-joined bag of words: title, description, manufacturer name, model
  name, variant name, fuel, transmission, body/CV type, property type, listing type, amenities,
  city, district, state. This is what makes the DTO's claim true.
- **`searchTags`** — namespaced slugs for exact, index-backed filtering without lookups:
  `['cat:private_vehicle','brand:maruti-suzuki','model:swift-dzire','variant:vdi','fuel:diesel','trans:manual','year:2018','district:kollam','city:kollam','state:kerala']`

**Maintenance:** `AdSearchDocBuilder.build(adId)` called from `create-ad.uc.ts`,
`update-ad.uc.ts`, the media-attach completion and the moderation approve path — plus a
`scripts/backfill-search-doc.ts` for existing rows (batched, `searchDocBuiltAt` as the cursor).
Reuse the existing outbox (`ads-v2/infrastructure/services/outbox.service.ts`) so the rebuild
is async and never blocks ad creation.

### 3.5 Index changes

```ts
// REPLACES the current single text index (ad.schema.ts:173) — Mongo allows only ONE
// text index per collection, so the migration must drop `title_text_description_text` first.
AdSchema.index(
  { title: 'text', searchText: 'text', description: 'text' },
  { name: 'ad_search_v2',
    weights: { title: 12, searchText: 6, description: 1 },
    default_language: 'english',
    background: true },
);

AdSchema.index({ searchTags: 1 }, { background: true });                       // multikey
AdSchema.index({ isDeleted:1, isActive:1, isApproved:1, soldOut:1,
                 districtSlug:1, category:1, createdAt:-1 }, { background:true });
AdSchema.index({ isDeleted:1, isActive:1, isApproved:1, soldOut:1,
                 districtSlug:1, category:1, price:1 }, { background:true });
```

Migration script must: `createIndex` the new text index under a new name → verify → `dropIndex`
the old one. Doing it in the other order leaves search dead during the rebuild.

### 3.6 Retrieval — the rewritten pipeline

Two structural changes to `list-ads.uc.ts`:

**(a) A parsed location replaces the geo radius.** "in kollam" is an explicit location intent;
the 50/200/1000 km ladder (`:281`) must not run. Geo coordinates are then used only for
*ranking* (nearest first within Kollam), not for filtering.

**(b) When free text and geo must coexist, drop `$geoNear` for `$geoWithin: $centerSphere`.**
`$geoNear` must be the first stage, which is why the current code falls back to regex
(`:466-476`). `$geoWithin` is an ordinary `$match` predicate and *can* sit alongside `$text`.
This kills defect S-4 — one search semantic everywhere — and removes the full-radius regex scan.

```ts
const hard: FilterQuery<Ad> = {
  isDeleted: { $ne: true }, isActive: true, isApproved: true, soldOut: { $ne: true },
};

// 1. structured filters from the parse (+ any explicit filters the user set in the UI,
//    which always WIN over the parse)
if (f.category)        hard.category = f.category;
if (f.districtSlug)    hard.districtSlug = f.districtSlug;
if (f.citySlug)        hard.citySlug = f.citySlug;
if (tagFilters.length) hard.searchTags = { $all: tagFilters };   // brand/model/fuel/…
if (f.minPrice || f.maxPrice) hard.price = { ...$gte, ...$lte };

// 2. free text — ONE semantic, geo or not
if (freeText) hard.$text = { $search: freeText };

// 3. geo as a predicate, not a stage
if (hasGeo && !f.districtSlug) {
  hard.geoLocation = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
}

const pipeline = [
  { $match: hard },
  ...(freeText ? [{ $addFields: { textScore: { $meta: 'textScore' } } }] : []),
  { $limit: CANDIDATE_CAP },            // 500 — bound the scoring work
  { $addFields: { relevance: SCORE_EXPR } },
  { $sort: { relevance: -1, createdAt: -1, _id: -1 } },
  { $skip: skip }, { $limit: limit },
  // lookups ONLY on the page slice, never before $limit
];
```

`CANDIDATE_CAP` keeps the scoring stage cheap; with a category + district filter the candidate
set is small anyway.

### 3.7 Ranking

```
relevance =  4.0 · normalizedTextScore          // $meta textScore / 3, capped at 1
          +  3.0 · exactModelMatch              // parsed model == ad's model
          +  2.0 · exactBrandMatch
          +  2.0 · categoryMatch                // parsed category == ad category
          +  1.5 · locationExactness            // city 1.0 · district 0.6 · state 0.2
          +  1.5 · proximity                    // max(0, 1 - distanceKm / radiusKm)
          +  1.0 · freshness                    // exp(-ageDays / 14)
          +  0.8 · completeness                 // has images, price, ≥3 attributes
          +  boost                              // promoted / featured, reserved for later
```

Rules that matter more than the weights:

- **Never rank a non-matching category above a matching one.** Category is a hard filter when
  confidence ≥ 0.34; below that it is a `+2.0` boost only.
- Explicit sort (`sortBy=price`) **overrides relevance entirely** — a user who picks
  "Price: low to high" gets exactly that.
- Default `sortBy` should become `relevance` when `q` is present, `createdAt` otherwise. That
  needs a new enum value in `list-ads-v2.dto.ts:144`.

### 3.8 Relaxation ladder (zero results)

Run **only** when the strict result set is empty, one rung at a time, stopping at the first
non-empty rung. Every rung taken is reported in `relaxations[]` so the UI can state it.

| Rung | Action | UI line |
|---|---|---|
| 0 | strict | — |
| 1 | drop `freeText` remainder, keep all structured filters | "No exact matches — showing all Cars in Kollam" |
| 2 | widen city → district | "Nothing in Punalur — showing Kollam district" |
| 3 | widen district → state | "No cars in Kollam — showing Kerala" |
| 4 | drop variant, then model, keep brand | "No Swift Dzire VDI — showing Swift Dzire" |
| 5 | drop brand, keep category + location | "No Maruti in Kollam — showing all cars in Kollam" |
| 6 | category only, nationwide | "Showing all cars" |

This replaces the current silent 200 km → 1000 km expansion, which is the reason Kollam
searches surface Coimbatore ads with no explanation.

---

## 4. API contract

### 4.1 `POST /v2/ads/list` — additions

**Request** (`ListAdsV2Dto`): add `q?: string`. Keep `search` as a deprecated alias mapping to
`q` for one release so existing app builds keep working. Add
`sortBy: 'relevance' | 'createdAt' | 'updatedAt' | 'price' | 'title'`.

**Response** — new `query` block alongside the existing envelope:

```jsonc
{
  "data": [ /* unchanged ad list */ ],
  "hasNext": true,
  "query": {
    "raw": "cars in kollam",
    "interpreted": {
      "category": "private_vehicle",
      "location": { "kind": "district", "slug": "kollam", "displayName": "Kollam" },
      "freeText": ""
    },
    "chips": [
      { "kind": "category", "label": "Cars",   "filterKey": "category", "filterValue": "private_vehicle", "sourceSpan": [0, 4] },
      { "kind": "location", "label": "Kollam", "filterKey": "location", "filterValue": "kollam",          "sourceSpan": [8, 14] }
    ],
    "confidence": 0.94,
    "relaxations": [],
    "ambiguities": []
  },
  "facets": {
    "category":  [ { "value": "private_vehicle", "label": "Cars", "count": 412 } ],
    "brand":     [ { "value": "maruti-suzuki", "label": "Maruti Suzuki", "count": 96 } ],
    "priceBuckets": [ { "min": 0, "max": 200000, "count": 88 } ]
  }
}
```

**Precedence rule, non-negotiable:** an explicit filter in the request body always beats the
parsed one. If the user typed "cars in kollam" and then tapped the Bikes chip, `category` from
the body wins and the category chip is dropped from `chips`.

### 4.2 `GET /v2/ads/search/suggest?q=&lat=&lng=&limit=10` — new

Mixed, typed suggestions — the OLX dropdown. Served from Redis; p95 target < 60 ms.

```jsonc
{ "suggestions": [
  { "type": "recent",   "label": "bikes in kollam",   "filters": { "q": "bikes in kollam" } },
  { "type": "category", "label": "Cars in Kollam",    "filters": { "category": "private_vehicle", "location": "kollam" }, "count": 412 },
  { "type": "model",    "label": "Maruti Swift",      "filters": { "modelIds": ["..."] }, "count": 37 },
  { "type": "location", "label": "Kollam, Kerala",    "filters": { "location": "kollam" } },
  { "type": "ad",       "label": "Swift VDI 2019 …",  "adId": "..." }
] }
```

Order: recent (user) → category×location combos → brand/model → locations → trending →
matching ad titles. Prefix-match against the lexicon + gazetteer (both fit in Redis), never a
Mongo regex per keystroke.

### 4.3 `GET /v2/ads/search/facets` — new (or `facets` inline as above)

Counts per category / brand / price bucket / property type for the **current** filter set,
computed with a `$facet` on the already-filtered candidate set. Only when `includeFacets=true`
so infinite-scroll pages don't pay for it.

### 4.4 Caching (fixes S-2)

Cache on the **parsed** key, not the raw string:

```
ads:v2:search:cat=private_vehicle&district=kollam&tags=&price=&geo=none&sort=relevance&page=1&limit=20
```

"cars in kollam", "kollam cars", "car kollam" and "cars kollam" all collapse onto one entry.
Free text remains uncacheable only when `freeText` is non-empty *and* long-tail; a short
`freeText` with a high-confidence structured parse is cacheable with a 60 s TTL.

---

## 5. Search UI behaviour (for the follow-up mobile pass)

```
┌──────────────────────────────────────────────┐
│ ←  cars in kollam                        ✕  │   search bar keeps the raw text
├──────────────────────────────────────────────┤
│  [ Cars ✕ ]  [ Kollam ✕ ]        Filters ⚙  │   chips = the interpretation, removable
├──────────────────────────────────────────────┤
│  412 results · Sort: Relevance ▾             │
├──────────────────────────────────────────────┤
│  ▓▓▓  Maruti Swift VDI 2019  · Kollam  2 km │
│  ▓▓▓  Hyundai i20 2021       · Kollam  5 km │
└──────────────────────────────────────────────┘
```

Relaxed result state:

```
├──────────────────────────────────────────────┤
│ ⓘ No cars in Punalur — showing Kollam        │
│   district.               [Search Punalur ↺] │
```

Suggest dropdown while typing (`koll`):

```
  🕘  bikes in kollam                 recent
  🚗  Cars in Kollam                  412 ads
  🏠  Property in Kollam              233 ads
  📍  Kollam, Kerala
  📍  Kollamkode, Palakkad
```

Rules: chips are the **only** way the user learns what was inferred — never hide them. Removing
a chip re-runs the search with that filter explicitly cleared (and `q` untouched, so the raw
text stays visible but struck through for that span).

---

## 6. Phased plan

| Phase | Work | Est. | Depends on |
|---|---|---|---|
| **S0** | Hotfix: escape all `$regex` inputs via `common/security/regex.util.ts` (`:451, :471, :495, :508`); correct the false DTO docstring | 0.5 d | — |
| **S1** | `search_terms` + `locations` schemas, seed constants (categories, property types, listing types), Kerala gazetteer seed + aliases, inventory materializer job, Redis cache loader | 2 d | S0 |
| **S2** | `SearchQueryService` parser + numeric rules + transliteration table; unit tests over a fixture table of ~120 real queries | 2 d | S1 |
| **S3** | `searchText`/`searchTags`/`*Slug` fields, `AdSearchDocBuilder`, wire into create/update/approve, `backfill-search-doc.ts`, index migration (create → verify → drop old) | 2 d | S1 |
| **S4** | Rewrite retrieval in `list-ads.uc.ts`: structured-first match, `$geoWithin` replacing `$geoNear` on text queries, candidate cap, relevance scoring, relaxation ladder, parsed-key caching | 3 d | S2, S3 |
| **S5** | `GET /search/suggest`, facets, response `query` block, `sortBy=relevance` | 2 d | S4 |
| **S6** | `search_events` collection + zero-result and click-through reporting; weekly synonym-mining query | 1 d | S4 |
| **S7** | Flutter search UI: chips, suggest sheet, recent searches, relaxation banner, filter-sheet sync | separate pass | S5 |

Total backend ≈ **12.5 days**. S0–S2 alone already fix the reported bug for the common queries;
S3–S4 is what makes it fast and correct at scale.

---

## 7. Verification checklist

| ID | Check | Expected |
|---|---|---|
| V-S1 | `q="cars"` | only `category=private_vehicle` ads; zero property/bike ads |
| V-S2 | `q="bikes in kollam"` | only `two_wheeler` + `districtSlug=kollam`; no radius expansion |
| V-S3 | `q="property in kollam"` | only `category=property` in Kollam |
| V-S4 | `q="2bhk flat for rent kollam"` | `property` + `apartment` + `rent` + `bedrooms=2` + Kollam |
| V-S5 | `q="swift dzire vdi 2018 under 5 lakh"` | brand/model/variant/year/price all structured; chips show all five |
| V-S6 | `q="red sofa"` (no lexicon hit) | pure `$text`, no category forced, confidence 0 |
| V-S7 | Same `q` with and without `lat/lng` | identical result **set**, differing only in order |
| V-S8 | `q=".*"` / `q="(a+)+$"` | no CPU spike; treated as literal text |
| V-S9 | `q="cars in kollam"` + explicit `category=two_wheeler` | body wins; category chip absent |
| V-S10 | `q="cars in punalur"` with no Punalur ads | non-empty, `relaxations:[{from:'city:punalur',to:'district:kollam'}]` |
| V-S11 | `q="activa quilon"` | Honda Activa, Kollam district — alias resolution works both sides |
| V-S12 | Repeat `q="cars in kollam"` | second call served from Redis; `explain()` shows the new text index in use |
| V-S13 | p95 latency, 100k ads, category+district query | < 150 ms |
| V-S14 | Backfill on a copy of prod | 100% of approved ads have `searchDocBuiltAt`, `districtSlug` populated where `district` exists |

---

## 8. Decisions still open

1. **Lexicon storage** — Mongo collection + Redis cache (recommended: editable from admin without
   a deploy) vs. TypeScript constants (simpler, needs a release per synonym). Recommendation:
   Mongo, with the seed file in the repo as the source of truth.
2. **Malayalam script** — seed transliterations for the ~60 core terms only, or skip for v1 and
   rely on romanized input? Recommendation: seed the 60, it is cheap.
3. **`search` → `q` rename** — keep both for one release, or force an app update via the existing
   `app-version` gate? Recommendation: keep both; drop `search` after the next forced update.
4. **Facet counts** — inline in `/list` (one extra `$facet`) vs. a separate endpoint the UI calls
   in parallel. Recommendation: inline behind `includeFacets=true`.
5. **Exit path to a real search engine** — this design stays Mongo-only, but S1/S2 (lexicon +
   parser) are engine-independent. If/when relevance ceilings out, only S4 is rewritten against
   Meilisearch or Typesense. Worth keeping the retrieval behind a `SearchProvider` interface for
   that reason alone — costs nothing now.

---

*Next step after review: S0 hotfix + S1 lexicon, or jump straight to implementing S1–S4 as one
block.*
