import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { Ad } from '../../ads/schemas/ad.schema';
import { describeTarget, withResolvedDatabase } from '../../common/database/db-safety.util';
import { applyLocalDnsWorkaround } from '../../common/database/dns-bootstrap';
import { LexiconService } from '../services/lexicon.service';
import { SEARCH_DOC_VERSION } from '../services/ad-search-doc.builder';
import { SearchTermType } from '../schemas/search-term.schema';
import { DUAL_HINT_TERMS } from '../constants/lexicon.seed';
import { normalizePhrase } from '../services/text-normalizer';

/**
 * Read-only health check for the search stack (audit §E, `search:validate`).
 * Exit code 1 on any ERROR, 0 otherwise, so it can gate a deploy.
 *
 *   npm run search:validate            human-readable report
 *   npm run search:validate -- --json  machine-readable
 *   npm run search:validate -- --sample 2000   rows to sample for ref checks (default 1000)
 *
 * Checks, in order:
 *   lexicon   mode, counts by type, catalogue entities with no term, terms
 *             pointing at deleted ids, models with no derivable category, seed
 *             hints with no catalogue model, lexicon older than the catalogue
 *   ads       live ads, missing/stale search docs, vehicle ads with no detail
 *             row, detail rows with broken catalogue refs
 *   indexes   text index (name, weights), searchKeys index, Atlas Search index
 *   flags     SEARCH_PARSER_ENABLED, SEARCH_V3_RETRIEVAL, SEARCH_ENGINE,
 *             SEARCH_KEYS_FILTERS, and whether the data supports them
 */

type Level = 'ok' | 'warn' | 'error' | 'info';
interface Finding {
  section: string;
  level: Level;
  message: string;
  detail?: unknown;
}

applyLocalDnsWorkaround();

async function bootstrap() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const sampleIdx = args.indexOf('--sample');
  const sample = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) || 1000 : 1000;

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const findings: Finding[] = [];
  const add = (section: string, level: Level, message: string, detail?: unknown) =>
    findings.push({ section, level, message, detail });

  try {
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const target = withResolvedDatabase(describeTarget(), adModel.db?.name);
    add('target', 'info', `${target.environment} ${target.host}/${target.database}`);

    const db = adModel.db;
    const col = (name: string) => db.collection(name);

    // ------------------------------------------------------------------ lexicon
    const lexicon = app.get(LexiconService);
    await lexicon.reload();
    const health = lexicon.health();
    add('lexicon', health.mode === 'full' ? 'ok' : 'error', `mode=${health.mode}`, health);

    const terms = await col('search_terms').find({ isActive: true }).project({ term: 1, type: 1, payload: 1, source: 1, updatedAt: 1 }).toArray();
    const termsByType = new Map<string, any[]>();
    for (const t of terms) {
      const b = termsByType.get(t.type) ?? [];
      b.push(t);
      termsByType.set(t.type, b);
    }
    add('lexicon', 'info', `terms: ${[...termsByType.entries()].map(([k, v]) => `${k}=${v.length}`).join(', ') || 'none'}`);

    const [manufacturers, models, variants] = await Promise.all([
      col('manufacturers').find({ isDeleted: { $ne: true }, isActive: { $ne: false } }).project({ name: 1, displayName: 1 }).toArray(),
      col('vehiclemodels').find({ isDeleted: { $ne: true } }).project({ name: 1, displayName: 1, manufacturer: 1, vehicleType: 1, isCommercialVehicle: 1, commercialVehicleType: 1, updatedAt: 1 }).toArray(),
      col('vehiclevariants').find({ isDeleted: { $ne: true } }).project({ name: 1, displayName: 1, vehicleModel: 1 }).toArray(),
    ]);
    const idsOf = (type: string, key: string) =>
      new Set(
        (termsByType.get(type) ?? [])
          .flatMap((t) => [t.payload?.[key], ...(t.payload?.[`${key}s`] ?? [])])
          .filter(Boolean)
          .map(String),
      );
    const mfrIdsInLexicon = idsOf(SearchTermType.MANUFACTURER, 'manufacturerId');
    const modelIdsInLexicon = idsOf(SearchTermType.MODEL, 'modelId');
    const variantIdsInLexicon = idsOf(SearchTermType.VARIANT, 'variantId');

    const missingMfr = manufacturers.filter((m) => !mfrIdsInLexicon.has(String(m._id)));
    const missingModels = models.filter((m) => !modelIdsInLexicon.has(String(m._id)));
    const missingVariants = variants.filter((v) => !variantIdsInLexicon.has(String(v._id)));
    const report = (label: string, list: any[], lvl: Level) =>
      add('lexicon', list.length ? lvl : 'ok', `${label}: ${list.length}`, list.slice(0, 15).map((x) => `${x.displayName || x.name} (${x._id})`));
    report('catalogue manufacturers with no lexicon term', missingMfr, 'error');
    report('catalogue models with no lexicon term', missingModels, missingModels.length > 0 && health.mode === 'full' ? 'warn' : 'error');
    report('catalogue variants with no lexicon term', missingVariants, 'warn');

    const catalogueIds = new Set([...manufacturers, ...models, ...variants].map((d) => String(d._id)));
    const dangling = terms.filter((t) => {
      const p = t.payload ?? {};
      return [p.manufacturerId, p.modelId, p.variantId, ...(p.manufacturerIds ?? []), ...(p.modelIds ?? []), ...(p.variantIds ?? [])]
        .filter(Boolean)
        .some((id: string) => !catalogueIds.has(String(id)));
    });
    add('lexicon', dangling.length ? 'error' : 'ok', `terms pointing at deleted/missing catalogue ids: ${dangling.length}`, dangling.slice(0, 15).map((t) => t.term));

    const uncategorised = models.filter((m) => m.isCommercialVehicle !== true && m.vehicleType !== 'Truck' && !m.vehicleType);
    add('lexicon', uncategorised.length ? 'warn' : 'ok', `catalogue models with no derivable category: ${uncategorised.length}`, uncategorised.slice(0, 15).map((m) => `${m.displayName || m.name} (${m._id})`));

    // The catalogue import writes a body class ("passenger") into
    // commercialVehicleType on ordinary cars. Harmless now that the materializer
    // keys off isCommercialVehicle, but worth knowing about.
    const bodyClassOnCars = models.filter((m) => m.commercialVehicleType && m.isCommercialVehicle !== true && m.vehicleType !== 'Truck');
    add('lexicon', 'info', `non-commercial models carrying a commercialVehicleType body class: ${bodyClassOnCars.length}` + (bodyClassOnCars.length ? ` (e.g. ${bodyClassOnCars.slice(0, 3).map((m) => `${m.displayName || m.name}=${m.commercialVehicleType}`).join(', ')})` : ''));

    const modelTerms = new Set((termsByType.get(SearchTermType.MODEL) ?? []).map((t) => t.term));
    const hintsWithoutModel = DUAL_HINT_TERMS.flatMap((s) => s.terms).map(normalizePhrase).filter((t) => !modelTerms.has(t));
    add('lexicon', hintsWithoutModel.length ? 'warn' : 'ok', `seed hints with no catalogue model behind them: ${hintsWithoutModel.length}`, hintsWithoutModel);

    const catTerms = termsByType.get(SearchTermType.CATEGORY) ?? [];
    const byPhrase = new Map<string, Set<string>>();
    for (const t of catTerms) {
      const s = byPhrase.get(t.term) ?? new Set();
      if (t.payload?.category) s.add(t.payload.category);
      byPhrase.set(t.term, s);
    }
    const conflicting = [...byPhrase.entries()].filter(([, s]) => s.size > 1).map(([p, s]) => `${p} → ${[...s].join('|')}`);
    add('lexicon', conflicting.length ? 'warn' : 'ok', `phrases mapped to conflicting categories: ${conflicting.length}`, conflicting);

    const newestCatalogue = models.reduce<Date | null>((acc, m) => (m.updatedAt && (!acc || m.updatedAt > acc) ? m.updatedAt : acc), null);
    const newestInventoryTerm = terms.filter((t) => t.source === 'inventory').reduce<Date | null>((acc, t) => (t.updatedAt && (!acc || t.updatedAt > acc) ? t.updatedAt : acc), null);
    if (newestCatalogue && newestInventoryTerm && newestCatalogue > newestInventoryTerm) {
      add('lexicon', 'warn', `lexicon older than the catalogue (catalogue ${newestCatalogue.toISOString()}, lexicon ${newestInventoryTerm.toISOString()}) — run npm run search:seed`);
    } else {
      add('lexicon', 'ok', 'lexicon is at least as new as the catalogue');
    }
    add('lexicon', 'info', `fuzzy vocabulary: ${health.fuzzyVocabulary} tokens`);

    // ---------------------------------------------------------------------- ads
    const live = { isDeleted: { $ne: true } };
    const [liveCount, missingDoc, staleDoc, visible] = await Promise.all([
      adModel.countDocuments(live),
      adModel.countDocuments({ ...live, searchDocVersion: { $exists: false } }),
      adModel.countDocuments({ ...live, searchDocVersion: { $exists: true, $lt: SEARCH_DOC_VERSION } }),
      adModel.countDocuments({ ...live, isActive: true, isApproved: true, soldOut: { $ne: true } }),
    ]);
    add('ads', 'info', `live ads: ${liveCount} (visible in search: ${visible})`);
    add('ads', missingDoc ? 'error' : 'ok', `ads with no search document: ${missingDoc}`);
    add('ads', staleDoc ? 'warn' : 'ok', `ads with a stale search document (< v${SEARCH_DOC_VERSION}): ${staleDoc}`);
    const noCatKey = await adModel.countDocuments({ ...live, searchKeys: { $exists: true, $not: { $elemMatch: { $regex: '^cat:' } } } });
    add('ads', noCatKey ? 'error' : 'ok', `search documents without a category key: ${noCatKey}`);

    const vehicleAds = await adModel.find({ ...live, category: { $in: ['private_vehicle', 'two_wheeler'] } }).select('_id').limit(sample).lean();
    const cvAds = await adModel.find({ ...live, category: 'commercial_vehicle' }).select('_id').limit(sample).lean();
    const propAds = await adModel.find({ ...live, category: 'property' }).select('_id').limit(sample).lean();
    const detailCheck = async (ads: any[], collection: string) => {
      if (ads.length === 0) return { missing: [] as string[], broken: [] as string[] };
      const ids = ads.map((a) => a._id);
      const rows = await col(collection).find({ ad: { $in: ids } }).project({ ad: 1, manufacturerId: 1, modelId: 1, variantId: 1 }).toArray();
      const have = new Set(rows.map((r) => String(r.ad)));
      const missing = ids.map(String).filter((id) => !have.has(id));
      const broken: string[] = [];
      for (const r of rows) {
        for (const [k, v] of [['manufacturer', r.manufacturerId], ['model', r.modelId], ['variant', r.variantId]] as const) {
          if (v && !catalogueIds.has(String(v))) broken.push(`${r.ad}:${k}:${v}`);
        }
      }
      return { missing, broken };
    };
    const [v, c, p] = await Promise.all([detailCheck(vehicleAds, 'vehicleads'), detailCheck(cvAds, 'commercialvehicleads'), detailCheck(propAds, 'propertyads')]);
    const missingDetail = [...v.missing, ...c.missing, ...p.missing];
    const brokenRefs = [...v.broken, ...c.broken];
    add('ads', missingDetail.length ? 'error' : 'ok', `ads with no detail row (sample of ${sample}/category): ${missingDetail.length}`, missingDetail.slice(0, 15));
    // A handful of dangling refs is a data-cleanup item, not a deploy blocker;
    // more than 1 % of the sample means the catalogue and the ads have diverged.
    const sampled = vehicleAds.length + cvAds.length;
    add('ads', brokenRefs.length === 0 ? 'ok' : brokenRefs.length > sampled * 0.01 ? 'error' : 'warn', `detail rows with broken catalogue refs (sample of ${sampled}): ${brokenRefs.length}`, brokenRefs.slice(0, 15));

    // ------------------------------------------------------------------ indexes
    const indexes = await adModel.collection.indexes();
    const textIx = indexes.find((ix: any) => Object.values(ix.key ?? {}).includes('text'));
    if (!textIx) add('indexes', 'error', 'no text index on ads — $text queries fail (regex fallback in use)');
    else if (textIx.name === 'ad_search_v2' && (textIx.weights as any)?.searchText) add('indexes', 'ok', `text index ${textIx.name} weights=${JSON.stringify(textIx.weights)}`);
    else add('indexes', 'warn', `text index is ${textIx.name} (${JSON.stringify(textIx.weights)}) — searchText not covered; run search:indexes -- --swap-text after the backfill`);
    const keysIx = indexes.find((ix: any) => ix.name === 'ad_searchKeys_visible_createdAt' || Object.keys(ix.key ?? {})[0] === 'searchKeys');
    add('indexes', keysIx ? 'ok' : 'warn', keysIx ? `searchKeys index ${keysIx.name}` : 'no searchKeys index — run search:indexes -- --supporting');

    let atlasReady = false;
    try {
      const wanted = process.env.SEARCH_ATLAS_INDEX || 'ads_search';
      const list: any[] = await (adModel.collection as any).listSearchIndexes().toArray();
      const ix = list.find((x) => x.name === wanted);
      if (!ix) add('indexes', process.env.SEARCH_ENGINE === 'atlas' ? 'error' : 'info', `Atlas Search index "${wanted}" not present`);
      else {
        atlasReady = ix.status === 'READY' && ix.queryable;
        add('indexes', atlasReady ? 'ok' : 'warn', `Atlas Search index "${wanted}" status=${ix.status} queryable=${ix.queryable}`);
        try {
          const spec = JSON.parse(readFileSync(join(__dirname, '..', 'atlas', 'ads-search-index.json'), 'utf8'));
          const same = JSON.stringify(ix.latestDefinition ?? {}) === JSON.stringify(spec.definition);
          add('indexes', same ? 'ok' : 'warn', same ? 'Atlas index matches the repo definition' : 'Atlas index definition differs from the repo — run search:atlas-index -- --apply');
        } catch { /* definition file missing: nothing to compare */ }
      }
    } catch (err) {
      add('indexes', process.env.SEARCH_ENGINE === 'atlas' ? 'error' : 'info', `Atlas Search not available here (${(err as Error).message.split('\n')[0]})`);
    }

    // -------------------------------------------------------------------- flags
    const flag = (k: string) => (process.env[k] ?? '').toLowerCase() === 'true';
    const engine = (process.env.SEARCH_ENGINE ?? 'mongo').toLowerCase();
    add('flags', 'info', `SEARCH_PARSER_ENABLED=${flag('SEARCH_PARSER_ENABLED')} SEARCH_V3_RETRIEVAL=${flag('SEARCH_V3_RETRIEVAL')} SEARCH_ENGINE=${engine} SEARCH_KEYS_FILTERS=${flag('SEARCH_KEYS_FILTERS')} SEARCH_FUZZY_ENABLED=${(process.env.SEARCH_FUZZY_ENABLED ?? 'true')}`);
    if (flag('SEARCH_PARSER_ENABLED') && health.mode !== 'full') add('flags', 'error', 'parser is on but the lexicon has no catalogue terms — run npm run search:seed');
    if (flag('SEARCH_KEYS_FILTERS') && (missingDoc > 0 || staleDoc > 0)) add('flags', 'error', 'SEARCH_KEYS_FILTERS is on but the search-document backfill is incomplete — explicit brand/model filters will miss ads');
    if (flag('SEARCH_V3_RETRIEVAL') && missingDoc > 0) add('flags', 'warn', `SEARCH_V3_RETRIEVAL is on with ${missingDoc} ads lacking a search document — they are only reachable through title/description text`);
    if (engine === 'atlas' && !atlasReady) add('flags', 'error', 'SEARCH_ENGINE=atlas but the Atlas index is not READY — requests fall back to the Mongo adapter');
  } catch (err) {
    add('run', 'error', (err as Error).message);
  } finally {
    await app.close();
  }

  const errors = findings.filter((f) => f.level === 'error').length;
  const warns = findings.filter((f) => f.level === 'warn').length;
  if (json) {
    console.log(JSON.stringify({ ok: errors === 0, errors, warnings: warns, findings }, null, 2));
  } else {
    const icon: Record<Level, string> = { ok: '✓', warn: '!', error: '✗', info: '·' };
    let section = '';
    for (const f of findings) {
      if (f.section !== section) {
        section = f.section;
        console.log(`\n[${section}]`);
      }
      console.log(`  ${icon[f.level]} ${f.message}`);
      if (f.detail && f.level !== 'ok' && f.level !== 'info') {
        const d = Array.isArray(f.detail) ? f.detail : [f.detail];
        for (const line of d.slice(0, 15)) console.log(`      - ${typeof line === 'string' ? line : JSON.stringify(line)}`);
      }
    }
    console.log(`\n${errors === 0 ? '✅' : '❌'} ${errors} error(s), ${warns} warning(s)`);
  }
  process.exitCode = errors === 0 ? 0 : 1;
}

bootstrap();
