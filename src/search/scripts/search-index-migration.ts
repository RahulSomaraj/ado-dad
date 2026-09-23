import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { Ad } from '../../ads/schemas/ad.schema';
import { SearchTerm } from '../schemas/search-term.schema';
import { LocationTerm } from '../schemas/location-term.schema';
import {
  describeTarget,
  formatBanner,
  guardWrites,
  parseFlags,
  withResolvedDatabase,
} from '../../common/database/db-safety.util';
import { sleep } from '../../common/database/safe-bulk.util';
import { applyLocalDnsWorkaround } from '../../common/database/dns-bootstrap';

/**
 * Index migration for the search rebuild, in explicit phases.
 *
 * Why this exists rather than a schema edit: MongoDB permits exactly ONE text
 * index per collection. The new index cannot be built alongside the old one, so
 * the swap is drop-then-create, and between those two steps every `$text` query
 * against `ads` fails with error 27. That window is unavoidable — what IS
 * avoidable is discovering it at 9am on a Monday because Mongoose decided to
 * reconcile the schema on boot.
 *
 * Phases, each run separately and each reversible:
 *
 *   npm run search:indexes -- --status       read-only; what exists now
 *   npm run search:indexes -- --lexicon      create indexes on the two NEW collections only
 *   npm run search:indexes -- --swap-text    the drop-then-create window
 *   npm run search:indexes -- --rollback     restore the previous text index
 *
 * Nothing runs without --apply, and production additionally needs --prod,
 * --confirm <db> and ALLOW_PROD_WRITE=yes.
 */

const NEW_TEXT_INDEX_NAME = 'ad_search_v2';
const NEW_TEXT_INDEX_SPEC: Record<string, any> = {
  title: 'text',
  searchText: 'text',
  description: 'text',
};
const NEW_TEXT_INDEX_OPTIONS = {
  name: NEW_TEXT_INDEX_NAME,
  // searchText is curated (brand, model, variant, fuel, year, place) so it
  // outweighs the free-form title; the description is a weak tie-breaker.
  weights: { searchText: 10, title: 6, description: 1 },
  default_language: 'english',
  background: true,
};

/**
 * Supporting indexes for the hybrid search. Additive, no swap risk. Must match
 * the declarations in ads/schemas/ad.schema.ts (which only autoIndex locally).
 */
const SUPPORTING_INDEXES: Array<{ key: Record<string, any>; options: Record<string, any> }> = [
  {
    key: { searchKeys: 1, isActive: 1, isApproved: 1, createdAt: -1 },
    options: { name: 'ad_searchKeys_visible_createdAt', background: true },
  },
];

const BACKUP_DIR = join(process.cwd(), '.migration-backups');
const BACKUP_FILE = join(BACKUP_DIR, 'ads-text-index.json');

// Must run before the Nest context is created: Mongoose connects during
// module initialisation, and the SRV lookup happens there.
applyLocalDnsWorkaround();

async function bootstrap() {
  const flags = parseFlags();
  const script = 'search:indexes';

  const wantStatus = flags.values.status === true;
  const wantLexicon = flags.values.lexicon === true;
  const wantSwap = flags.values['swap-text'] === true;
  const wantRollback = flags.values.rollback === true;
  const wantSupporting = flags.values.supporting === true;

  const selected = [wantStatus, wantLexicon, wantSwap, wantRollback, wantSupporting].filter(Boolean);
  if (selected.length !== 1) {
    console.error(
      'Choose exactly one phase: --status | --lexicon | --supporting | --swap-text | --rollback',
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // The URI may carry no database name; the live connection always knows it,
    // and --confirm has to be matchable against something real.
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const target = withResolvedDatabase(describeTarget(), adModel.db?.name);

    const guard = guardWrites({
      script,
      // --status never writes, so it never needs to clear the fuse.
      apply: wantStatus ? false : flags.apply,
      confirm: flags.confirm,
      prodFlag: flags.prodFlag,
      target,
    });
    console.log(formatBanner(script, guard));

    const collection = adModel.collection;

    if (wantStatus) {
      await printStatus(collection);
      return;
    }

    if (!guard.writesEnabled) {
      console.log('DRY RUN — the plan below would be executed with --apply:\n');
    }

    if (wantLexicon) {
      await ensureLexiconIndexes(app, guard.writesEnabled);
      return;
    }
    if (wantSupporting) {
      await createSupportingIndexes(collection, guard.writesEnabled);
      return;
    }
    if (wantSwap) {
      await swapTextIndex(collection, guard.writesEnabled);
      return;
    }
    if (wantRollback) {
      await rollbackTextIndex(collection, guard.writesEnabled);
      return;
    }
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

// ---------------------------------------------------------------------------

async function printStatus(collection: any): Promise<void> {
  const indexes = await collection.indexes();
  const textIndexes = indexes.filter((ix: any) =>
    Object.values(ix.key ?? {}).includes('text'),
  );

  console.log(`ads has ${indexes.length} indexes.\n`);
  console.log('Text index:');
  if (textIndexes.length === 0) {
    console.log('  (none)');
  } else {
    for (const ix of textIndexes) {
      const isNew = ix.name === NEW_TEXT_INDEX_NAME;
      console.log(`  ${ix.name}${isNew ? '   ← already the new one' : ''}`);
      console.log(`    weights: ${JSON.stringify(ix.weights ?? {})}`);
    }
  }

  console.log('\nSupporting indexes:');
  for (const target of SUPPORTING_INDEXES) {
    const present = indexes.some((ix: any) => ix.name === target.options.name);
    console.log(`  ${present ? '✓' : '·'} ${target.options.name}`);
  }

  console.log(`\nBackup of the previous text index: ${existsSync(BACKUP_FILE) ? BACKUP_FILE : '(none yet)'}`);
}

/**
 * Indexes for `search_terms` and `location_terms`. These collections are new and
 * small, so this is the one index operation with no production risk — but it
 * still goes through the fuse, because "small" is an assumption and assumptions
 * are what break databases.
 */
async function ensureLexiconIndexes(app: any, writesEnabled: boolean): Promise<void> {
  for (const schemaClass of [SearchTerm, LocationTerm]) {
    const model: Model<any> = app.get(getModelToken(schemaClass.name));
    const name = model.collection.collectionName;
    const declared = model.schema.indexes();

    console.log(`${name}: ${declared.length} declared indexes`);
    for (const [key, options] of declared as any[]) {
      console.log(`  ${JSON.stringify(key)} ${options?.unique ? '(unique)' : ''}`);
    }

    if (writesEnabled) {
      // syncIndexes is safe HERE and only here: these collections are owned
      // entirely by the search feature. It must never be called on `ads`,
      // where it would drop indexes that other code paths rely on.
      await model.syncIndexes();
      console.log(`  ✓ synced\n`);
    } else {
      console.log('  (dry run — not created)\n');
    }
  }
}

async function createSupportingIndexes(collection: any, writesEnabled: boolean): Promise<void> {
  const existing = await collection.indexes();

  for (const target of SUPPORTING_INDEXES) {
    const present = existing.some((ix: any) => ix.name === target.options.name);
    if (present) {
      console.log(`· ${target.options.name} already exists — skipping`);
      continue;
    }
    console.log(`+ ${target.options.name}`);
    console.log(`  key: ${JSON.stringify(target.key)}`);
    if (!writesEnabled) continue;

    const started = Date.now();
    await collection.createIndex(target.key, target.options);
    console.log(`  ✓ built in ${Math.round((Date.now() - started) / 1000)}s`);

    // Breathe between builds so several large index creations do not stack up
    // on a live primary.
    await sleep(2000);
  }
}

/**
 * The one genuinely dangerous phase.
 *
 * Order matters and cannot be improved: Mongo rejects a second text index, so
 * the old one must go first. Everything here exists to make that window short,
 * observable and reversible.
 */
async function swapTextIndex(collection: any, writesEnabled: boolean): Promise<void> {
  const indexes = await collection.indexes();
  const existingText = indexes.filter((ix: any) =>
    Object.values(ix.key ?? {}).includes('text'),
  );

  const already = existingText.find((ix: any) => ix.name === NEW_TEXT_INDEX_NAME);
  if (already) {
    console.log(`${NEW_TEXT_INDEX_NAME} already exists — nothing to do.`);
    return;
  }

  console.log('Plan:');
  if (existingText.length > 0) {
    console.log(`  1. back up the spec of : ${existingText.map((i: any) => i.name).join(', ')}`);
    console.log(`  2. DROP                : ${existingText.map((i: any) => i.name).join(', ')}`);
    console.log(`  3. CREATE              : ${NEW_TEXT_INDEX_NAME}`);
    console.log(`     weights             : ${JSON.stringify(NEW_TEXT_INDEX_OPTIONS.weights)}`);
    console.log('\n  ⚠  Between steps 2 and 3 every $text query on ads fails (error 27).');
    console.log('     ListAdsUc degrades to an escaped regex during that window rather than');
    console.log('     returning a 500, but results will be worse until the build finishes.');
  } else {
    console.log(`  1. CREATE ${NEW_TEXT_INDEX_NAME} (no existing text index — no gap)`);
  }

  if (!writesEnabled) return;

  // ---- 1. backup -----------------------------------------------------------
  if (existingText.length > 0) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    writeFileSync(
      BACKUP_FILE,
      JSON.stringify({ savedAt: new Date().toISOString(), indexes: existingText }, null, 2),
    );
    console.log(`\n✓ spec backed up to ${BACKUP_FILE}`);
  }

  // ---- 2. drop -------------------------------------------------------------
  const gapStarted = Date.now();
  for (const ix of existingText) {
    await collection.dropIndex(ix.name);
    console.log(`✓ dropped ${ix.name}`);
  }

  // ---- 3. create -----------------------------------------------------------
  try {
    await collection.createIndex(NEW_TEXT_INDEX_SPEC, NEW_TEXT_INDEX_OPTIONS);
  } catch (err) {
    console.error(`\n❌ CREATE FAILED: ${(err as Error).message}`);
    console.error('   The collection currently has NO text index.');
    console.error(`   Restore the previous one now:  npm run search:indexes -- --rollback --apply`);
    throw err;
  }

  const gapMs = Date.now() - gapStarted;
  console.log(`✓ created ${NEW_TEXT_INDEX_NAME}`);
  console.log(`\n$text was unavailable for ${Math.round(gapMs / 1000)}s.`);

  // ---- 4. verify -----------------------------------------------------------
  const after = await collection.indexes();
  const verified = after.find((ix: any) => ix.name === NEW_TEXT_INDEX_NAME);
  if (!verified) {
    throw new Error(
      `${NEW_TEXT_INDEX_NAME} is not present after creation — roll back immediately.`,
    );
  }
  console.log(`✓ verified: ${JSON.stringify(verified.weights ?? verified.key)}`);

  const probe = await collection
    .find({ $text: { $search: 'car' } })
    .limit(1)
    .toArray()
    .catch((e: Error) => {
      throw new Error(`Post-swap $text probe failed: ${e.message}`);
    });
  console.log(`✓ $text probe returned ${probe.length} document(s) — search is live again.`);
}

async function rollbackTextIndex(collection: any, writesEnabled: boolean): Promise<void> {
  if (!existsSync(BACKUP_FILE)) {
    throw new Error(
      `No backup at ${BACKUP_FILE}. Recreate the original by hand:\n` +
        `  db.ads.createIndex({ title: "text", description: "text" }, { background: true })`,
    );
  }

  const backup = JSON.parse(readFileSync(BACKUP_FILE, 'utf8'));
  console.log(`Restoring the text index saved at ${backup.savedAt}:`);
  for (const ix of backup.indexes) {
    console.log(`  ${ix.name}: ${JSON.stringify(ix.weights ?? ix.key)}`);
  }

  if (!writesEnabled) return;

  const current = await collection.indexes();
  for (const ix of current.filter((i: any) => Object.values(i.key ?? {}).includes('text'))) {
    await collection.dropIndex(ix.name);
    console.log(`✓ dropped ${ix.name}`);
  }

  for (const ix of backup.indexes) {
    const { key, name, weights, default_language } = ix;
    // `weights` is how Mongo reports a text index; rebuild the spec from it so
    // field order and per-field weights come back exactly as they were.
    const spec: Record<string, any> = weights
      ? Object.fromEntries(Object.keys(weights).map((f) => [f, 'text']))
      : key;
    await collection.createIndex(spec, {
      name,
      weights,
      default_language: default_language ?? 'english',
      background: true,
    });
    console.log(`✓ restored ${name}`);
  }
}

bootstrap();
