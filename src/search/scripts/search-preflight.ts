import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import { Ad } from '../../ads/schemas/ad.schema';
import { SearchTerm } from '../schemas/search-term.schema';
import { LocationTerm } from '../schemas/location-term.schema';
import {
  describeTarget,
  formatBanner,
  guardWrites,
  withResolvedDatabase,
} from '../../common/database/db-safety.util';
import { ALL_SEED_LOCATIONS, SeedLocation } from '../constants/gazetteer.seed';
import { normalizePhrase } from '../services/text-normalizer';
import { applyLocalDnsWorkaround } from '../../common/database/dns-bootstrap';

/**
 * READ-ONLY inspection of what the search migration is about to touch.
 *
 * Run this first, on every environment, before any other search script. It
 * issues no writes of any kind — not even an index creation — so it is safe to
 * point at production, and its output is what decides whether the migration is
 * a five-second job or a maintenance window.
 *
 *   npm run search:preflight
 */
// Must run before the Nest context is created: Mongoose connects during
// module initialisation, and the SRV lookup happens there.
applyLocalDnsWorkaround();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // The URI may carry no database name; the live connection always knows it.
    const adModelEarly = app.get<Model<any>>(getModelToken(Ad.name));
    const target = withResolvedDatabase(describeTarget(), adModelEarly.db?.name);

    // apply:false — this script can never be told to write.
    const guard = guardWrites({ script: 'search:preflight', apply: false, target });
    console.log(formatBanner('search:preflight', guard));
    console.log('This script issues NO writes.\n');

    const adModel = adModelEarly;
    const termModel = app.get<Model<any>>(getModelToken(SearchTerm.name));
    const locationModel = app.get<Model<any>>(getModelToken(LocationTerm.name));

    // ---- ads collection ---------------------------------------------------
    const collection = adModel.collection;
    const stats: any = await collection
      .aggregate([{ $collStats: { storageStats: {} } }])
      .next()
      .catch(() => null);

    const indexes = await collection.indexes();
    const textIndexes = indexes.filter((ix: any) =>
      Object.values(ix.key ?? {}).includes('text'),
    );

    const totalAds = await collection.estimatedDocumentCount();
    const visibleAds = await collection.countDocuments({
      isDeleted: { $ne: true },
      isActive: true,
      isApproved: true,
    });

    console.log('── ads collection ─────────────────────────────────────────');
    console.log(`  documents (estimated) : ${totalAds.toLocaleString()}`);
    console.log(`  visible ads           : ${visibleAds.toLocaleString()}`);
    if (stats?.storageStats) {
      const s = stats.storageStats;
      console.log(`  data size             : ${mb(s.size)} MB`);
      console.log(`  total index size      : ${mb(s.totalIndexSize)} MB`);
    }
    console.log(`  index count           : ${indexes.length}`);

    console.log('\n── text indexes (only ONE is allowed per collection) ──────');
    if (textIndexes.length === 0) {
      console.log('  none — a new text index can be created without dropping anything.');
    } else {
      for (const ix of textIndexes) {
        const size = ix.name
          ? stats?.storageStats?.indexSizes?.[ix.name]
          : undefined;
        console.log(`  ${ix.name}`);
        console.log(`    fields  : ${JSON.stringify(ix.weights ?? ix.key)}`);
        if (ix.weights) console.log(`    weights : ${JSON.stringify(ix.weights)}`);
        if (size !== undefined) console.log(`    size    : ${mb(size)} MB`);
      }
      console.log(
        '\n  ⚠  The swap must DROP the existing text index before creating the new one.',
      );
      console.log('     Between those two steps every $text query fails with error 27.');
    }

    // ---- fields S3 will add ----------------------------------------------
    console.log('\n── S3 field readiness ────────────────────────────────────');
    const withDistrict = await collection.countDocuments({ district: { $nin: [null, ''] } });
    const withCity = await collection.countDocuments({ city: { $nin: [null, ''] } });
    const withGeo = await collection.countDocuments({ geoLocation: { $ne: null } });
    const alreadyBuilt = await collection.countDocuments({ searchDocBuiltAt: { $ne: null } });

    console.log(`  ads with district     : ${pct(withDistrict, totalAds)}`);
    console.log(`  ads with city         : ${pct(withCity, totalAds)}`);
    console.log(`  ads with geoLocation  : ${pct(withGeo, totalAds)}`);
    console.log(`  already backfilled    : ${pct(alreadyBuilt, totalAds)}`);
    if (withDistrict / Math.max(totalAds, 1) < 0.8) {
      console.log(
        '\n  ⚠  district/city/state are placeholders — do NOT backfill slugs from them.',
      );
      console.log(
        '     The real vocabulary lives in Ad.location ("City, State, Country");',
      );
      console.log('     see the location census below.');
    }

    // ---- location census ----------------------------------------------------
    // `city`/`state`/`country` are placeholders ("Unknown"). The field that
    // actually carries location is `Ad.location`, a "City, State, Country"
    // string written by the place picker. The backfill parses THAT, so this
    // census measures gazetteer coverage against the real vocabulary.
    console.log('\n── location census vs gazetteer ──────────────────────────');

    const locRows = (await collection
      .aggregate([
        { $match: { isDeleted: { $ne: true }, location: { $nin: [null, ''] } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray()) as Array<{ _id: string; count: number }>;

    // Built from the repo constants, not the database: the gazetteer collection
    // may not be seeded yet, and this script must stay read-only.
    const gazetteer = new Map<string, SeedLocation>();
    for (const loc of ALL_SEED_LOCATIONS) {
      for (const alias of loc.aliases) {
        const key = normalizePhrase(alias);
        if (key) gazetteer.set(key, loc);
      }
    }

    interface PlaceTally {
      name: string;
      count: number;
      hit?: SeedLocation;
    }
    const byCity = new Map<string, PlaceTally>();
    const countryTally = new Map<string, number>();
    let locatedAds = 0;

    for (const row of locRows) {
      const parts = row._id.split(',').map((p) => p.trim()).filter(Boolean);
      const cityName = parts[0] ?? '';
      const country = parts[parts.length - 1] ?? '(none)';
      const slug = normalizePhrase(cityName);
      if (!slug) continue;

      locatedAds += row.count;
      countryTally.set(country, (countryTally.get(country) ?? 0) + row.count);

      const existing = byCity.get(slug);
      if (existing) existing.count += row.count;
      else byCity.set(slug, { name: cityName, count: row.count, hit: gazetteer.get(slug) });
    }

    const places = [...byCity.values()].sort((a, b) => b.count - a.count);
    const matched = places.filter((p) => p.hit);
    const unmatched = places.filter((p) => !p.hit);
    const matchedAds = matched.reduce((s2, p) => s2 + p.count, 0);
    const unmatchedAds = unmatched.reduce((s2, p) => s2 + p.count, 0);

    console.log(`  ads with a location   : ${locatedAds.toLocaleString()}`);
    console.log(`  distinct place names  : ${places.length}`);
    console.log(`  recognised            : ${matched.length} names`);
    console.log(`  → ads covered         : ${pct(matchedAds, locatedAds)}`);

    console.log('\n  Countries seen:');
    for (const [c, n] of [...countryTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`    ${String(n).padStart(6)}  ${c}`);
    }

    const districtTally = new Map<string, number>();
    for (const p of matched) {
      const d = p.hit!.district ?? p.hit!.slug;
      districtTally.set(d, (districtTally.get(d) ?? 0) + p.count);
    }
    if (districtTally.size > 0) {
      console.log('\n  Ads per district (resolved through the gazetteer):');
      for (const [d, n] of [...districtTally.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${d.padEnd(22)} ${String(n).padStart(6)}`);
      }
    }

    if (unmatched.length > 0) {
      console.log(
        `\n  UNRECOGNISED places: ${unmatched.length} names / ${unmatchedAds.toLocaleString()} ads ` +
          `(${Math.round((unmatchedAds / Math.max(locatedAds, 1)) * 100)}%)`,
      );
      console.log('  Highest-volume ones to add to gazetteer.seed.ts:');
      for (const p of unmatched.slice(0, 40)) {
        console.log(`    ${String(p.count).padStart(6)}  ${p.name}`);
      }
      if (unmatched.length > 40) {
        console.log(`    ... and ${unmatched.length - 40} more (long tail)`);
      }
    }

    const coverage = locatedAds === 0 ? 0 : matchedAds / locatedAds;
    console.log(
      `\n  ${coverage >= 0.9 ? '✓' : '⚠'}  Gazetteer covers ${Math.round(coverage * 100)}% of located ads.`,
    );
    if (coverage < 0.9) {
      console.log('     Expand gazetteer.seed.ts from the list above and re-run this preflight');
      console.log('     BEFORE the backfill — the backfill is what freezes these slugs in.');
    }

    // ---- location data reality check ---------------------------------------
    // The city census showed `city` is a placeholder. Before any design leans on
    // geoLocation instead, prove the coordinates are real: spread across Kerala
    // rather than a single default point.
    console.log('\n── location data reality check ───────────────────────────');

    for (const field of ['location', 'state', 'country', 'district'] as const) {
      const rows = (await collection
        .aggregate([
          { $match: { isDeleted: { $ne: true }, [field]: { $nin: [null, ''] } } },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 6 },
        ])
        .toArray()) as Array<{ _id: string; count: number }>;
      const distinct = (await collection.distinct(field, {
        isDeleted: { $ne: true },
        [field]: { $nin: [null, ''] },
      })) as string[];
      console.log(
        `  ${field.padEnd(9)} : ${distinct.length} distinct — ` +
          rows.map((r) => `"${r._id}"×${r.count}`).join(', '),
      );
    }

    const geoStats: any = await collection
      .aggregate([
        { $match: { isDeleted: { $ne: true }, 'geoLocation.coordinates.0': { $exists: true } } },
        {
          $group: {
            _id: null,
            n: { $sum: 1 },
            minLng: { $min: { $arrayElemAt: ['$geoLocation.coordinates', 0] } },
            maxLng: { $max: { $arrayElemAt: ['$geoLocation.coordinates', 0] } },
            minLat: { $min: { $arrayElemAt: ['$geoLocation.coordinates', 1] } },
            maxLat: { $max: { $arrayElemAt: ['$geoLocation.coordinates', 1] } },
          },
        },
      ])
      .next();

    const topCoords = (await collection
      .aggregate([
        { $match: { isDeleted: { $ne: true }, 'geoLocation.coordinates.0': { $exists: true } } },
        { $group: { _id: '$geoLocation.coordinates', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray()) as Array<{ _id: [number, number]; count: number }>;

    const distinctCoords = (await collection
      .aggregate([
        { $match: { isDeleted: { $ne: true }, 'geoLocation.coordinates.0': { $exists: true } } },
        { $group: { _id: '$geoLocation.coordinates' } },
        { $count: 'n' },
      ])
      .next()) as any;

    if (geoStats) {
      console.log(`\n  geoLocation points    : ${geoStats.n.toLocaleString()}`);
      console.log(`  distinct coordinates  : ${(distinctCoords?.n ?? 0).toLocaleString()}`);
      console.log(
        `  longitude range       : ${geoStats.minLng?.toFixed(4)} … ${geoStats.maxLng?.toFixed(4)}`,
      );
      console.log(
        `  latitude range        : ${geoStats.minLat?.toFixed(4)} … ${geoStats.maxLat?.toFixed(4)}`,
      );
      // Kerala is roughly lng 74.8–77.4, lat 8.2–12.8.
      const inKerala =
        geoStats.minLng > 74 && geoStats.maxLng < 78 && geoStats.minLat > 8 && geoStats.maxLat < 13;
      console.log(
        `  plausible for Kerala  : ${inKerala ? 'yes' : 'NO — range extends outside the state'}`,
      );

      console.log('\n  Most common exact points:');
      for (const c of topCoords) {
        const share = Math.round((c.count / geoStats.n) * 100);
        console.log(
          `    ${String(c.count).padStart(6)} (${share}%)  [${c._id?.[0]}, ${c._id?.[1]}]`,
        );
      }

      const topShare = topCoords[0] ? topCoords[0].count / geoStats.n : 0;
      if (topShare > 0.2) {
        console.log(
          `\n  ⚠  ${Math.round(topShare * 100)}% of ads sit on ONE coordinate — that is a default,`,
        );
        console.log('     not a real location. Geo filtering cannot separate those ads.');
      } else if ((distinctCoords?.n ?? 0) > geoStats.n * 0.5) {
        console.log('\n  ✓ Coordinates look genuinely per-ad — geo filtering is viable.');
      }
    }

    // ---- lexicon ----------------------------------------------------------
    console.log('\n── lexicon collections ───────────────────────────────────');
    for (const [name, model] of [
      ['search_terms', termModel],
      ['location_terms', locationModel],
    ] as const) {
      const count = await model.collection.estimatedDocumentCount().catch(() => 0);
      const ix = await model.collection.indexes().catch(() => []);
      console.log(`  ${name.padEnd(16)} : ${count} docs, ${ix.length} indexes`);
    }

    // ---- estimate ---------------------------------------------------------
    console.log('\n── migration estimate ────────────────────────────────────');
    const backfillBatches = Math.ceil(totalAds / 200);
    const backfillSeconds = Math.round((backfillBatches * 250) / 1000);
    console.log(`  backfill batches (200/batch) : ${backfillBatches}`);
    console.log(
      `  backfill wall clock @250ms   : ~${fmtDuration(backfillSeconds)} (throttle only, excludes query time)`,
    );
    console.log(
      `  text index rebuild           : minutes on ${mb(stats?.storageStats?.size ?? 0)} MB — ` +
        'run it in a low-traffic window',
    );

    console.log('\n✅ Preflight complete. Nothing was modified.');
    if (guard.target.isProduction) {
      console.log(
        '\n⚠  This is PRODUCTION. Take a backup of the `ads` collection before the migration:',
      );
      console.log(
        '     mongodump --uri "$MONGO_URI" --collection ads --out ./backup-$(date +%F)',
      );
    }
  } catch (err) {
    console.error('❌ Preflight failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
const pct = (n: number, total: number) =>
  `${n.toLocaleString()} (${total === 0 ? 0 : Math.round((n / total) * 100)}%)`;
const fmtDuration = (seconds: number) =>
  seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;

// Exported for the runbook's reference; the guard is what keeps this read-only.
export { describeTarget };

bootstrap();
