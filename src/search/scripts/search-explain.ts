import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { Ad } from '../../ads/schemas/ad.schema';
import { describeTarget, withResolvedDatabase } from '../../common/database/db-safety.util';
import { applyLocalDnsWorkaround } from '../../common/database/dns-bootstrap';
import { ListAdsUc } from '../../ads-v2/application/use-cases/list-ads.uc';
import { ListAdsV2Dto } from '../../ads-v2/dto/list-ads-v2.dto';
import { SearchQueryService } from '../services/search-query.service';
import { SearchPlanner } from '../planner/search-planner';
import { MongoNativeAdapter } from '../adapters/mongo-native.adapter';
import { AtlasSearchAdapter } from '../adapters/atlas-search.adapter';
import { loadScoringConfig } from '../scoring/scoring.config';

/**
 * Before/after performance evidence for the search rebuild (audit §F,
 * "Performance"). Read-only.
 *
 *   npm run search:explain                     the fixed query set, both engines if available
 *   npm run search:explain -- --legacy         also time the legacy list path (flag off)
 *   npm run search:explain -- --q "creta" --q "hyundai creta"
 *   npm run search:explain -- --no-geo         skip the lat/lng variants
 *
 * For the Mongo adapter every step's aggregation is explained with
 * executionStats: executionTimeMillis, totalDocsExamined, totalKeysExamined,
 * nReturned, and the winning index. Atlas `$search` cannot be explained the
 * same way, so it is timed. Results go to reports/search-explain-<ts>.json and
 * a markdown table is printed.
 */

const DEFAULT_QUERIES = [
  'creta', 'swift', 'i20', 'verna', 'hyundai', 'honda', 'tata', 'hyundai creta', 'maruti swift',
  'creta 2020', 'creta petrol', 'creta automatic', 'creta swift', 'red creta', 'creta kollam',
  'cars in kochi', '2bhk flat for rent kollam', 'nice family car', 'xyzabc', 'cretta', 'hyndai creta',
];
const KOLLAM = { latitude: 8.8932, longitude: 76.6141 };

applyLocalDnsWorkaround();

async function bootstrap() {
  const args = process.argv.slice(2);
  const queries: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '--q' && args[i + 1]) queries.push(args[++i]);
  const withLegacy = args.includes('--legacy');
  const withGeo = !args.includes('--no-geo');
  const set = queries.length ? queries : DEFAULT_QUERIES;

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const rows: any[] = [];
  try {
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const target = withResolvedDatabase(describeTarget(), adModel.db?.name);
    console.log(`search:explain against ${target.environment} ${target.host}/${target.database}\n`);

    const parser = app.get(SearchQueryService);
    const planner = app.get(SearchPlanner);
    const mongo = app.get(MongoNativeAdapter);
    const atlas = app.get(AtlasSearchAdapter);
    const listUc = app.get(ListAdsUc);
    const scoring = loadScoringConfig();
    const keysFilters = (process.env.SEARCH_KEYS_FILTERS ?? '').toLowerCase() === 'true';

    let atlasAvailable = true;
    try {
      const list: any[] = await (adModel.collection as any).listSearchIndexes().toArray();
      atlasAvailable = list.some((x) => x.status === 'READY' && x.queryable);
    } catch {
      atlasAvailable = false;
    }

    const variants: { label: string; geo?: typeof KOLLAM }[] = [{ label: 'no-geo' }];
    if (withGeo) variants.push({ label: 'geo', geo: KOLLAM });

    for (const q of set) {
      for (const v of variants) {
        const dto: Partial<ListAdsV2Dto> = { search: q, limit: 20, page: 1, ...(v.geo ?? {}) };
        const parsed = await parser.parse(q);
        const plan = planner.plan(dto as any, parsed, { keysFilters, scoring });
        const row: any = {
          query: q,
          variant: v.label,
          strength: parsed.strength,
          strategy: plan.strategy,
          steps: plan.steps.length,
          mongo: null,
          atlas: null,
          legacyMs: null,
        };

        // ---- Mongo adapter: explain + timing of step 0 (and the full run) ----
        try {
          const { pipeline } = mongo.buildPipelines(plan, plan.steps[0]);
          const explain: any = await adModel.aggregate(pipeline).explain('executionStats');
          const stats = extractStats(explain);
          const t = Date.now();
          const r = await mongo.search(plan, plan.steps[0]);
          row.mongo = { ...stats, wallMs: Date.now() - t, returned: r.hits.length, total: r.total, capped: r.totalCapped };
        } catch (err) {
          row.mongo = { error: (err as Error).message.split('\n')[0] };
        }

        // ---- Atlas adapter: timing only ----
        if (atlasAvailable) {
          try {
            const t = Date.now();
            const r = await atlas.search(plan, plan.steps[0]);
            row.atlas = { wallMs: Date.now() - t, returned: r.hits.length, total: r.total, capped: r.totalCapped };
          } catch (err) {
            row.atlas = { error: (err as Error).message.split('\n')[0] };
          }
        }

        // ---- Legacy list path (whole request) ----
        if (withLegacy) {
          const prev = process.env.SEARCH_V3_RETRIEVAL;
          process.env.SEARCH_V3_RETRIEVAL = 'false';
          try {
            const t = Date.now();
            const res = await listUc.exec(dto as any);
            row.legacyMs = Date.now() - t;
            row.legacyReturned = res.data.length;
          } catch (err) {
            row.legacyError = (err as Error).message.split('\n')[0];
          } finally {
            if (prev === undefined) delete process.env.SEARCH_V3_RETRIEVAL;
            else process.env.SEARCH_V3_RETRIEVAL = prev;
          }
        }
        rows.push(row);
      }
    }

    // ---- report ----
    const fmt = (x: any) => (x === null || x === undefined ? '' : String(x));
    console.log('| query | variant | strength | strategy | mongo ms | docsExamined | keysExamined | returned | index | atlas ms | legacy ms |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      const m = r.mongo ?? {};
      console.log(
        `| ${r.query} | ${r.variant} | ${r.strength} | ${r.strategy} | ${fmt(m.executionTimeMillis ?? m.wallMs)} | ` +
          `${fmt(m.totalDocsExamined)} | ${fmt(m.totalKeysExamined)} | ${fmt(m.returned)} | ${fmt(m.indexes)} | ` +
          `${fmt(r.atlas?.wallMs ?? r.atlas?.error)} | ${fmt(r.legacyMs ?? r.legacyError)} |`,
      );
    }
    const dir = join(process.cwd(), 'reports');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `search-explain-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    writeFileSync(file, JSON.stringify({ target: `${target.environment} ${target.database}`, atlasAvailable, keysFilters, rows }, null, 2));
    console.log(`\nSaved ${file}`);
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

/** Pull the numbers that matter out of an aggregate explain, whichever shape the server returns. */
function extractStats(explain: any): Record<string, unknown> {
  const stagesRoot = explain?.stages ?? explain?.shards?.[Object.keys(explain?.shards ?? {})[0]]?.stages ?? [];
  const cursorStage = Array.isArray(stagesRoot) ? stagesRoot.find((s: any) => s.$cursor) : undefined;
  const es = cursorStage?.$cursor?.executionStats ?? explain?.executionStats ?? {};
  const winning = cursorStage?.$cursor?.queryPlanner?.winningPlan ?? explain?.queryPlanner?.winningPlan ?? {};
  const indexes = new Set<string>();
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.indexName) indexes.add(node.indexName);
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(winning);
  return {
    executionTimeMillis: es.executionTimeMillis,
    totalDocsExamined: es.totalDocsExamined,
    totalKeysExamined: es.totalKeysExamined,
    nReturnedCursor: es.nReturned,
    indexes: [...indexes].join('+') || 'COLLSCAN?',
  };
}

bootstrap();
