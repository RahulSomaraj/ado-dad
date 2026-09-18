# AdoDad Search — Implementation Checklist

Living checklist for the search redesign. Plan: `docs/search_redesign_plan.md`.
Open work is checkboxes; finished work moves to the **Done log** at the bottom.

**Current state:** S0, S1, S2 implemented and committed to `C:\pendrive` (uncompiled
against the full app — type-checked in isolation, 53/53 unit tests green).
Nothing in the live search path has changed behaviour yet except the S0 fixes.

---

## Phase status

| Phase | What | Status |
|---|---|---|
| S0 | Hotfix: escape `$regex`, restore the 50 km rung, correct the DTO docstring | ✅ done |
| S1 | Lexicon + Kerala gazetteer + inventory materializer | ✅ done |
| S2 | `SearchQueryService` parser + unit tests | ✅ done |
| S3 | `searchText` / `searchTags` / `*Slug` on `Ad`, builder, backfill, index migration | ⬜ next |
| S4 | Retrieval rewrite: structured-first match, `$geoWithin`, relevance, relaxation ladder | ⬜ |
| S5 | `GET /search/suggest`, facets, `query` block in the list response | ⬜ |
| S6 | `search_events` analytics + synonym mining | ⬜ |
| S7 | Flutter search UI: chips, suggest sheet, relaxation banner | ⬜ |

---

## How to run what exists

```bash
npm run search:seed            # build the lexicon (idempotent; safe to re-run)
npm run search:seed:derive     # also mine city/district names off live ads
npm run search:test            # 53 unit tests, no DB needed
npm run search:seed -- --probe "cars in kollam"   # parse one query and print it
```

`search:seed` ends by printing four parse probes, so a bad seed is visible
immediately rather than at the next search.

---

## Open work

### S3 — denormalised search fields

- [ ] **S3-1** Add to `Ad`: `searchText`, `searchTags[]`, `citySlug`, `districtSlug`,
      `stateSlug`, `searchDocBuiltAt`.
- [ ] **S3-2** `AdSearchDocBuilder.build(adId)` — joins vehicle/property/CV detail +
      inventory names + gazetteer slug, writes the bag of words and the namespaced tags.
- [ ] **S3-3** Call it from `create-ad.uc`, `update-ad.uc`, media-attach completion and
      moderation approve — via the existing outbox, so ad creation never blocks on it.
- [ ] **S3-4** `scripts/backfill-search-doc.ts`, batched, `searchDocBuiltAt` as the cursor,
      resumable.
- [ ] **S3-5** Index migration **in this order**: create `ad_search_v2`
      (`title`/`searchText`/`description` weighted 12/6/1) → verify with `$indexStats` →
      drop `title_text_description_text`. Mongo allows one text index per collection, so
      the reverse order leaves search dead during the rebuild.
- [ ] **S3-6** Add `{ searchTags: 1 }` and the two district+category compounds.

### S4 — retrieval

- [ ] **S4-1** Inject `SearchQueryService` into `ListAdsUc`; merge parsed filters **under**
      explicit request filters (explicit always wins).
- [ ] **S4-2** A parsed location replaces the geo radius entirely — "in kollam" must not
      run the distance ladder.
- [ ] **S4-3** Replace `$geoNear` with `$geoWithin: $centerSphere` whenever there is free
      text, so `$text` and geo coexist and the regex branch dies.
- [ ] **S4-4** Candidate cap (500) → relevance `$addFields` → sort → page. Lookups only on
      the page slice.
- [ ] **S4-5** Relevance formula per the plan §3.7; add `sortBy=relevance` to the DTO and
      make it the default when `q` is present.
- [ ] **S4-6** Relaxation ladder with a reported `relaxations[]`; remove the silent
      200→1000 km widening once the ladder covers it.
- [ ] **S4-7** Cache on the parsed key so "cars in kollam" / "kollam cars" share an entry
      (today any `search` value disables the cache outright).

### S5 — endpoints

- [ ] **S5-1** `query` block (interpreted + chips + confidence + relaxations) on the list
      response.
- [ ] **S5-2** `GET /v2/ads/search/suggest` using `LexiconService.prefixMatch` (already
      built) + recent + trending.
- [ ] **S5-3** Facet counts behind `includeFacets=true`.
- [ ] **S5-4** `q` as the new param name; keep `search` as a deprecated alias for one
      release.

### S6 — analytics

- [ ] **S6-1** `search_events`: raw query, parsed result, result count, clicked ad + position.
- [ ] **S6-2** Weekly zero-result and unmatched-token report → proposed synonyms and
      gazetteer rows.

---

## Verification

Checks that already pass in `npm run search:test`:

| ID | Check | Status |
|---|---|---|
| V-S1 | `"cars"` → `private_vehicle`, no free text, confidence 1 | ✅ |
| V-S2 | `"bikes in kollam"` → `two_wheeler` + Kollam district | ✅ |
| V-S3 | `"property in kollam"` → `property` + Kollam | ✅ |
| V-S4 | `"2bhk flat for rent kollam"` → property + apartment + rent + 2 BHK + Kollam | ✅ |
| V-S5 | `"swift dzire vdi 2018 under 5 lakh"` → variant + model + brand + year + price | ✅ |
| V-S6 | `"red sofa"` → pure free text, no category forced | ✅ |
| V-S8 | `"(a+)+$ .*"` → literal, no filter, no metacharacters in free text | ✅ |
| V-S11 | `"activa quilon"` ≡ `"activa kollam"` | ✅ |
| — | 8 district aliases (Trivandrum/Cochin/EKM/Calicut/Trichur/Alleppey/Palghat/Cannanore) | ✅ |
| — | Malayalam script: `"കാർ കൊല്ലം"` → cars + Kollam | ✅ |
| — | Chip `sourceSpan` indexes the raw query through punctuation and case | ✅ |
| — | Safety rail: `"car wash service center"` confidence < 0.34 → boost, not filter | ✅ |

Still to verify (needs S3/S4 and a device):

| ID | Check | Status |
|---|---|---|
| V-S7 | Same `q` with and without coordinates → same result **set**, different order | ⬜ |
| V-S9 | `q="cars in kollam"` + explicit `category=two_wheeler` → body wins, chip dropped | ⬜ |
| V-S10 | `"cars in punalur"` with no Punalur ads → non-empty + `relaxations[]` populated | ⬜ |
| V-S12 | Repeat query served from Redis; `explain()` shows `ad_search_v2` in use | ⬜ |
| V-S13 | p95 < 150 ms at 100k ads for a category+district query | ⬜ |
| V-S14 | Backfill: every approved ad has `searchDocBuiltAt` and a `districtSlug` where `district` exists | ⬜ |
| V-S15 | 50 km is the first radius rung again — a Kollam feed shows Kollam ads before Kochi ones | ⬜ |

---

## Decisions taken

- **Mongo-only.** No Meilisearch/Typesense/Atlas Search. The lexicon and parser (S1/S2) are
  engine-independent, so only S4 would be rewritten if that ceiling is ever hit.
- **Lexicon lives in Mongo**, seeded from constants in the repo. Editable from an admin tool
  later without a deploy; the repo file stays the source of truth.
- **In-process lexicon cache, not Redis.** ~4–7k small entries, 15-minute TTL, reloaded on
  demand. Removes a DB round trip from every search; a few minutes of staleness only means a
  brand added moments ago is treated as free text.
- **Bare amounts are budgets.** "5 lakh car" sets `maxPrice`, flagged `inferred: true` and
  costing confidence, with a removable chip. `TREAT_BARE_AMOUNT_AS_BUDGET` in
  `numeric-rules.ts` turns it off.
- **Bare years are floors.** "2018" means 2018-or-newer, not exactly 2018 — an exact-year
  filter almost always returns too little.
- **Unsafe standalone models are not materialised.** `city`, `classic`, `access`, `shine`…
  are ordinary words; they only match brand-qualified ("honda city"). List in
  `inventory-lexicon.materializer.ts`.
- **50 km restored as the first distance rung.** P3-5 had trimmed the ladder to [200, 1000]
  on the argument that `$geoNear` is nearest-first anyway. True for ordering, wrong for what
  the user sees: a 200 km first rung fills a Kollam feed with Kochi ads. Now [50, 200, 1000].

---

## Done log

### 18 Sep 2026 — S0 hotfix

- `list-ads.uc.ts`: added `literalRegex()` wrapping `escapeRegExp`; all four unescaped
  `$regex` sites (search under geo ×2, location filter ×2) now treat user input as a literal.
  Closes the ReDoS / injection hole.
- `list-ads.uc.ts`: `distanceThresholds` back to `[50, 200, 1000]`.
- `list-ads-v2.dto.ts`: `search` docstring corrected — it matched title + description only,
  never manufacturer/model/variant/fuel/transmission as it claimed. Points at S3.

### 18 Sep 2026 — S1 lexicon + gazetteer

- `search/schemas/search-term.schema.ts` — `search_terms`, typed payloads, weights by type,
  `source` separating curated rows from materialised ones so a rebuild never clobbers an
  alias added by hand.
- `search/schemas/location-term.schema.ts` — `location_terms`; one row per *spelling*,
  aliases sharing a `slug`, which is the field S3 writes onto ads.
- `search/constants/lexicon.seed.ts` — category synonyms (car/cars/kar/four wheeler…,
  bike/byke/scooty/two wheeler…), property types, listing types, CV types, dual category+model
  hints.
- `search/constants/gazetteer.seed.ts` — all 14 Kerala districts with colonial and short-form
  aliases, 7 Kollam towns, 18 high-volume towns elsewhere, centroids and radius hints.
- `search/services/lexicon.service.ts` — in-process cache, TTL refresh, `prefixMatch` ready
  for S5, never blocks boot.
- `search/services/inventory-lexicon.materializer.ts` — brands/models/variants/fuel/
  transmission from vehicle-inventory, hand aliases (maruti, vw, RE…), brand-qualified phrases
  outranking bare model names, unsafe standalone words skipped.
- `search/services/search-seed.service.ts` — idempotent seeding, collision warnings,
  `deriveLocationsFromAds()` to bootstrap the gazetteer from live reverse-geocoded ads.
- `search/seed/run-search-seed.ts` + `npm run search:seed`.

### 18 Sep 2026 — S2 parser

- `search/services/text-normalizer.ts` — token-local normalisation preserving exact raw
  offsets (so chips can carry `sourceSpan`), Malayalam transliteration for the seeded
  vocabulary, Indian digit grouping.
- `search/services/numeric-rules.ts` — lakh/crore/k multipliers, comparators, BHK, model year.
- `search/services/search-query.service.ts` — locative split, longest-match n-gram scan,
  multi-payload application, category/location conflict resolution, cross-category clash
  resolution, chips, confidence, `applyAsFilter` rail.
- `search/dto/parsed-query.ts` — the contract S4/S5 consume.
- `search/test/` — 53 tests against the real seed data via a lexicon stub.
- `app.module.ts` — `SearchModule` registered (no routes; cannot affect existing behaviour).
- `package.json` — `search:seed`, `search:seed:derive`, `search:test`.

**Two bugs the tests caught and that are fixed:**

1. The tokenizer used `\p{L}\p{N}` only. Malayalam vowel signs and the virama are combining
   *marks*, so `കാർ` shattered into three tokens and no transliteration could ever match.
   Class now includes `\p{M}`, with the number branch separated so `civic,vti` is still two
   tokens while `5,00,000` stays one.
2. Locative prepositions were not in the ignore set, so "in" survived into `freeText` (a
   meaningless token in the `$text` query) and dragged confidence on "cars in kollam" down to
   0.67. Added `IGNORED_TOKENS = STOP_WORDS ∪ LOCATIVE_SEPARATORS`.

### Not yet verified on device

- `npm run search:test` was run in the cloud sandbox against an isolated dependency set, not
  on rahul-pc. Type-checking covered `src/search/**` and the two edited `ads-v2` files with
  zero errors; the full-project `nest build` has not been run.
- `npm run search:seed` has never been run against a real database — the materializer's
  assumptions about `isDeleted` / `isActive` on the inventory collections are from the schemas,
  not from live data.
