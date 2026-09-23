import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { Ad } from '../../ads/schemas/ad.schema';
import {
  describeTarget,
  formatBanner,
  guardWrites,
  parseFlags,
  withResolvedDatabase,
} from '../../common/database/db-safety.util';
import { applyLocalDnsWorkaround } from '../../common/database/dns-bootstrap';

/**
 * Atlas Search index for the `ads` collection (audit §E row 5).
 *
 *   npm run search:atlas-index -- --status        list search indexes and their state
 *   npm run search:atlas-index -- --apply         create the index (or update it if the
 *                                                 definition in the repo changed)
 *   npm run search:atlas-index -- --drop --apply  drop it
 *   npm run search:atlas-index -- --wait --apply  block until the index is READY
 *
 * The definition lives in src/search/atlas/ads-search-index.json and is the
 * single source of truth; `search:validate` compares the live index to it.
 * Needs MongoDB 7.0+ on Atlas (or the mongodb/mongodb-atlas-local image). On
 * plain MongoDB the commands fail with "Unrecognized command"; that is expected,
 * the Mongo adapter does not need this index.
 *
 * Production additionally needs --prod, --confirm <db> and ALLOW_PROD_WRITE=yes.
 */

const DEFINITION_FILE = join(__dirname, '..', 'atlas', 'ads-search-index.json');

applyLocalDnsWorkaround();

async function bootstrap() {
  const flags = parseFlags();
  const script = 'search:atlas-index';
  const wantStatus = flags.values.status === true;
  const wantDrop = flags.values.drop === true;
  const wantWait = flags.values.wait === true;

  const spec = JSON.parse(readFileSync(DEFINITION_FILE, 'utf8')) as {
    name: string;
    definition: Record<string, unknown>;
  };
  const indexName = process.env.SEARCH_ATLAS_INDEX || spec.name;

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const collection: any = adModel.collection;
    const target = withResolvedDatabase(describeTarget(), adModel.db?.name);
    const guard = guardWrites({
      script,
      apply: wantStatus ? false : flags.apply,
      confirm: flags.confirm,
      prodFlag: flags.prodFlag,
      target,
    });
    console.log(formatBanner(script, guard));

    const existing = await listSearchIndexes(collection);
    printStatus(existing, indexName);
    if (wantStatus) return;

    const current = existing.find((ix) => ix.name === indexName);

    if (wantDrop) {
      if (!current) {
        console.log(`\nNothing to drop: "${indexName}" does not exist.`);
        return;
      }
      if (!guard.writesEnabled) {
        console.log(`\nDRY RUN — would drop search index "${indexName}". Add --apply.`);
        return;
      }
      await collection.dropSearchIndex(indexName);
      console.log(`\n✅ dropped search index "${indexName}".`);
      return;
    }

    const same = current && JSON.stringify(current.latestDefinition ?? {}) === JSON.stringify(spec.definition);
    if (current && same) {
      console.log(`\n"${indexName}" already matches the repo definition (status ${current.status}).`);
    } else if (!guard.writesEnabled) {
      console.log(
        `\nDRY RUN — would ${current ? 'update' : 'create'} search index "${indexName}" with:\n` +
          JSON.stringify(spec.definition, null, 2) +
          '\nAdd --apply to do it.',
      );
      return;
    } else if (current) {
      await collection.updateSearchIndex(indexName, spec.definition);
      console.log(`\n✅ update submitted for "${indexName}"; it rebuilds in the background.`);
    } else {
      await collection.createSearchIndex({ name: indexName, definition: spec.definition });
      console.log(`\n✅ create submitted for "${indexName}"; it builds in the background.`);
    }

    if (wantWait) {
      process.stdout.write('Waiting for READY');
      for (let i = 0; i < 360; i++) {
        const ix = (await listSearchIndexes(collection)).find((x) => x.name === indexName);
        if (ix?.status === 'READY' && ix.queryable) {
          console.log(`\n✅ "${indexName}" is READY and queryable.`);
          return;
        }
        if (ix?.status === 'FAILED') {
          console.error(`\n❌ index build FAILED: ${JSON.stringify(ix)}`);
          process.exitCode = 1;
          return;
        }
        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, 5000));
      }
      console.log('\nStill building after 30 minutes; check the Atlas UI.');
    } else {
      console.log('Check progress with: npm run search:atlas-index -- --status');
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if (/Unrecognized command|no such command|not supported/i.test(msg)) {
      console.error(
        `\n❌ ${msg}\nThis deployment does not support Atlas Search index commands (plain MongoDB?). ` +
          'The Mongo adapter (SEARCH_ENGINE=mongo) needs no search index.',
      );
    } else {
      console.error(`\n❌ ${msg}`);
    }
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

async function listSearchIndexes(collection: any): Promise<any[]> {
  try {
    return await collection.listSearchIndexes().toArray();
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (/Unrecognized|not supported|no such command|SearchNotEnabled/i.test(msg)) return [];
    throw err;
  }
}

function printStatus(indexes: any[], wanted: string): void {
  console.log(`\nSearch indexes on ads: ${indexes.length === 0 ? '(none)' : ''}`);
  for (const ix of indexes) {
    const mark = ix.name === wanted ? '←' : ' ';
    console.log(
      `  ${mark} ${ix.name}  status=${ix.status}  queryable=${ix.queryable}` +
        (ix.latestDefinition?.mappings ? `  fields=${Object.keys(ix.latestDefinition.mappings.fields ?? {}).length}` : ''),
    );
  }
}

bootstrap();
