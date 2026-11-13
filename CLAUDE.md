# ado-dad backend — agent guide

NestJS + MongoDB (Atlas M10, ap-south-2) marketplace API for the AdoDad classifieds app (Flutter client: `ado_dad_mobile`). Admin panel: admin.adodad.com.

## Read first
- `BACKEND_WORKFLOW_PROMPT.md` — the 4-phase gated workflow. Follow it for every task. One micro-task per session; STOP for confirmation between steps.
- Fix ledger: project doc `claude/BACKEND_FIX_CHECKLIST.md` (claude.ai Project "Adodad Node"). Tick items with evidence; respect coordination gates C1–C5 (frontend-first items must not ship unilaterally).
- `docs/search_v2_audit.md` — search v3 design and pending rollout steps.

## DANGER — production database
Local `.env` may point `MONGO_URI` at the **production Atlas cluster** (db `test`, ~23k live ads). Never run seeds/scripts/tests against it without the db-safety prod flags; prefer the `*:safe` npm scripts. Never read or print `.env*` contents or the Firebase admin JSON.

## Deploys
Push to `develop` **auto-deploys** (GitHub Actions → SSH → PM2 `dist/main.js`). Push to `main` deploys the main environment. Treat every push as a deploy.

## Architecture rules
- New/refactored ad work goes in `src/ads-v2` (use-cases / domain / infrastructure). `src/ads` is legacy — do not extend it; it is being retired (checklist P2-5).
- Search lives behind the retrieval port in `src/search` — swap adapters, don't bypass the port. Ops scripts: `npm run search:preflight|atlas-index|backfill|validate|explain`.
- Legacy modules `src/model`, `src/vehicle-company`, vehicle-variant-in-`src/vehicles` are deleted — superseded by `src/vehicle-inventory`. Do not resurrect them.
- `src/common/` CSV core (csv-upload.service, csv-parser.helper, …) is intentionally **unwired** — reuse it when building vehicle-inventory CSV admin endpoints.
- Redis caching must fail open. No response-shape changes without a checklist §Coordination entry — the Flutter client parses strictly.

## Commands
- Build/check: `npm run build` · `npx tsc -p tsconfig.build.json --noEmit`
- Tests: `npm run test` · `npm run test:e2e` · contract: `npm run search:test:contract`
- Lint/format: `npm run lint` · `npm run format`
