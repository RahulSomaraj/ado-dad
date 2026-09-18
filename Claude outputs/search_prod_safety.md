# Search migration — production safety runbook

This checkout is routinely pointed at **production**: `.env`, `.env.prod` and
`.env.uat` sit side by side and `.env` is whichever one was last copied over.
Every procedure below assumes the target is prod until proven otherwise.

---

## 1. The three things that could have broken prod

### S-PROD-1 — Mongoose was building indexes on boot, unattended

`MongooseModule.forRootAsync` did not set `autoIndex`, and Mongoose's default is
`true`. Every `schema.index()` declaration in the codebase is therefore
reconciled against the live database **on every application start**.

That means phase S3 — which adds a text index to `ad.schema.ts` — would have
started an index build on the production `ads` collection the moment the app
restarted. No script, no review, no choice of window. And because MongoDB allows
only one text index per collection, it would not even have succeeded: it would
have failed on boot, repeatedly, while `title_text_description_text` still
existed.

**Fixed.** `autoIndex` and `autoCreate` are now off unless the target is local or
`MONGO_AUTO_INDEX=true` is set explicitly. The startup log states which mode is
active and why. Indexes are created deliberately, by `npm run search:indexes`.

> Consequence to be aware of: any *other* schema index added from now on also
> will not appear automatically. That is the intended trade — index creation is
> now a decision, not a side effect.

### S-PROD-2 — the text index swap has an unavoidable outage window

MongoDB permits exactly one text index per collection, so the new index cannot be
built alongside the old one. The swap is drop-then-create, and in between every
`$text` query on `ads` fails with **error 27** (`text index required for $text
query`) — on the busiest endpoint in the product.

**Mitigated two ways.** `ListAdsUc.aggregateWithTextFallback` catches error 27 and
retries with an escaped regex on title/description, so the window degrades result
quality instead of returning 500s, and logs it at most once a minute. The
migration script measures and prints how long the gap actually lasted.

### S-PROD-3 — maintenance scripts wrote wherever `.env` happened to point

`search:seed` called `deleteMany` and `bulkWrite` with no idea which database it
was attached to.

**Fixed.** All write scripts now go through `src/common/database/db-safety.util.ts`.

---

## 2. The write fuse

| Rule | Behaviour |
|---|---|
| Unknown environment | Classified as **production**. A guard that fails open is not a guard. |
| Default mode | **Dry run.** `--apply` is required every time. |
| Non-production write | `--apply` alone. |
| Production write | `--apply` **and** `--prod` **and** `--confirm <exact-db-name>` **and** `ALLOW_PROD_WRITE=yes`. |
| Forbidden scripts | Can declare `allowProduction: false` — then no flag combination works. |
| Credentials | Redacted before anything is printed. Greedy to the last `@`, so a password containing `@` or `/` still cannot leak. |

Classification order: `DB_ENVIRONMENT` → `PROD_DB_HOSTS`/`NONPROD_DB_HOSTS`
allow-lists → name markers (`prod`, `live` / `uat`, `staging`, `qa`) →
localhost → **production**.

### Do this first

Add to each env file so nothing is ever left to a heuristic:

```ini
# .env.prod
DB_ENVIRONMENT=production
# .env.uat
DB_ENVIRONMENT=uat
# local
DB_ENVIRONMENT=local
MONGO_AUTO_INDEX=true      # local only
```

Verify it took effect — this is read-only and safe on prod:

```bash
npm run search:preflight
```

The banner states the target, the classification and the reason. **If it does not
say `production` when you are on prod, stop and fix the classification before
anything else.**

---

## 3. Order of operations

Run each step on **UAT first**, then production. Never batch two steps together.

### Step 0 — back up (production only)

```bash
mongodump --uri "$MONGO_URI" --collection ads --out ./backup-$(date +%F)
```

Confirm the dump is non-empty before continuing. A VM/Atlas snapshot is a fine
substitute; a snapshot you have not verified is not.

### Step 1 — preflight (read-only)

```bash
npm run search:preflight
```

Records ad counts, index inventory, index sizes, how many ads carry a district,
and an estimate of the backfill duration. **Save this output** — it is the
before-picture for every later comparison.

### Step 2 — lexicon collections

Lowest-risk write in the whole migration: two brand-new collections.

```bash
npm run search:indexes -- --lexicon                    # dry run
npm run search:indexes -- --lexicon --apply --prod --confirm <db>
npm run search:seed                                    # dry run
ALLOW_PROD_WRITE=yes npm run search:seed -- --apply --prod --confirm <db>
```

`search:seed` writes only to `search_terms` and `location_terms`. It never
modifies `ads` — `--derive` reads ad locations and writes nothing back.

Verify: the probe lines at the end show `cars` → `private_vehicle` and
`bikes in kollam` → `two_wheeler` + `kollam`.

### Step 3 — S3 schema fields (not yet written)

Adding optional fields to `ad.schema.ts` changes nothing on disk — Mongo is
schemaless and absent fields simply read as `undefined`. Safe to deploy ahead of
the backfill. With `autoIndex` off it will not try to build the text index.

### Step 4 — supporting indexes

Additive, no swap, no outage. Built one at a time with a pause between.

```bash
npm run search:indexes -- --supporting --apply --prod --confirm <db>
```

### Step 5 — backfill (S3)

Not yet written. It will use `safeBulkWrite`: 200 ops per batch, 250 ms pause,
abort after 3 failed batches, `$set` only — never a document replacement, never
`$unset`. Dry run first; `--limit 1000` on a slice before the full run.

Watch while it runs: replication lag, primary CPU, and p95 on `POST /v2/ads/list`.
The backfill can be stopped at any point and resumed — `searchDocBuiltAt` is the
cursor, and a partially backfilled collection is consistent, just partially
covered.

### Step 6 — the text index swap ⚠️

**The only step with a user-visible outage window.** Low-traffic hours only
(for Kerala traffic, roughly 02:00–05:00 IST).

```bash
npm run search:indexes -- --status                     # confirm what exists
npm run search:indexes -- --swap-text                  # dry run: prints the plan
npm run search:indexes -- --swap-text --apply --prod --confirm <db>
```

What it does, in order: backs the old index spec up to
`.migration-backups/ads-text-index.json` → drops it → creates `ad_search_v2` →
verifies it is present → runs a live `$text` probe → prints how long the gap was.

During the gap, search degrades to regex rather than erroring. Expect worse
results, not broken ones.

**If the create fails**, the collection is left with no text index. Roll back
immediately:

```bash
npm run search:indexes -- --rollback --apply --prod --confirm <db>
```

### Step 7 — S4 retrieval

Code-only. Deploy behind the usual process; no database change.

---

## 4. Rollback per step

| Step | To undo |
|---|---|
| 2 — lexicon | `db.search_terms.drop()`, `db.location_terms.drop()`. Nothing else reads them. |
| 3 — schema fields | Deploy the previous build. The extra fields on documents are inert. |
| 4 — supporting indexes | `db.ads.dropIndex("ad_searchTags")` etc. Names are printed when created. |
| 5 — backfill | `db.ads.updateMany({}, { $unset: { searchText:"", searchTags:"", citySlug:"", districtSlug:"", stateSlug:"", searchDocBuiltAt:"" } })` — but only if something is actually wrong; the fields are inert while nothing queries them. |
| 6 — text swap | `npm run search:indexes -- --rollback --apply --prod --confirm <db>` |
| 7 — retrieval | Deploy the previous build. |

Steps 1–5 and 7 are all reversible without data loss. **Step 6 is the only one
where the rollback itself has a gap**, since restoring the old index is also a
create.

---

## 5. What to watch

During and for an hour after each write step:

- **Replication lag** — the single best early warning. Stop the backfill if it climbs.
- **p95 on `POST /v2/ads/list`** — the endpoint carrying the risk.
- **Error 27 in the logs** — expected only during step 6. Appearing at any other
  time means the text index is missing when it should not be; run
  `npm run search:indexes -- --status`.
- **`No text index on 'ads'`** warnings from `ListAdsUc` — same signal, from the
  application side, rate-limited to one a minute.
- **Primary CPU and IO** during index builds.

---

## 6. Standing rules

1. **Never call `syncIndexes()` on `ads`.** It drops indexes not declared in the
   schema. The migration script calls it only on the two lexicon collections, and
   the comment there says why.
2. **Never run a script against prod without a preflight in the same session.**
   The banner is cheap; assuming the target is not.
3. **UAT first, always** — ideally against a restore of prod, so row counts and
   index sizes are representative.
4. **One step per window.** If two things change and something breaks, you have
   two suspects and no time.
5. **`--dry-run` output is a plan, not a formality.** Read it. The plan for the
   text swap tells you exactly which index is about to be dropped.

---

## 7. Current status

| Item | State |
|---|---|
| `autoIndex` disabled outside local | ✅ done |
| Write fuse + 35 unit tests | ✅ done |
| Throttled bulk writer + tests | ✅ done |
| `search:preflight` (read-only) | ✅ done |
| `search:indexes` (phased, reversible) | ✅ done |
| `search:seed` dry-run by default | ✅ done |
| `$text` fallback in `ListAdsUc` | ✅ done |
| `DB_ENVIRONMENT` set in the env files | ⬜ **you need to do this** |
| Preflight run against prod | ⬜ |
| S3 backfill | ⬜ not written yet |

Nothing in this batch has been run against a database. It is all guard rails —
the first real exercise is `npm run search:preflight`, which cannot write.
