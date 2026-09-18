import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EJSON } from 'bson';
import { createWriteStream, mkdirSync, statSync } from 'fs';
import { createGzip } from 'zlib';
import { join, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { AppModule } from '../../../app.module';
import { Ad } from '../../../ads/schemas/ad.schema';
import {
  describeTarget,
  formatBanner,
  guardWrites,
  parseFlags,
  withResolvedDatabase,
} from '../db-safety.util';
import { applyLocalDnsWorkaround } from '../dns-bootstrap';

/**
 * Point-in-time backup of a single collection, written locally.
 *
 * Why this exists rather than "just run mongodump": mongodump ships in the
 * MongoDB Database Tools, a separate download from the server and from Node, and
 * it is frequently absent on a Windows dev box. A backup you cannot take is not
 * a backup. This needs nothing beyond what the app already depends on.
 *
 * Output is newline-delimited **canonical Extended JSON**, which is exactly what
 * `mongoimport` consumes — so the restore path does not depend on this script
 * still existing. Index definitions are captured alongside the documents,
 * because the migration this protects against drops an index, and documents
 * without their indexes are only half a restore.
 *
 * READ-ONLY with respect to the database. It writes only to the local disk.
 *
 *   npm run db:backup                              # ads, ./backups
 *   npm run db:backup -- --collection ads --out D:\backups
 *   npm run db:backup -- --no-gzip
 */

// Must run before the Nest context is created: Mongoose connects during
// module initialisation, and the SRV lookup happens there.
applyLocalDnsWorkaround();

async function bootstrap() {
  const flags = parseFlags();
  const script = 'db:backup';
  const collectionName =
    typeof flags.values.collection === 'string' ? flags.values.collection : 'ads';
  const outDir = resolve(
    typeof flags.values.out === 'string' ? flags.values.out : './backups',
  );
  const gzip = flags.values['no-gzip'] !== true;
  const batchSize = Number(flags.values.batch ?? 500);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const db = adModel.db;

    // The URI may carry no database name; the live connection always knows it.
    const target = withResolvedDatabase(describeTarget(), db?.name);

    // apply:false — this script never writes to the database, only to disk.
    const guard = guardWrites({ script, apply: false, target });
    console.log(formatBanner(script, guard));
    console.log('Reads from the database; writes ONLY to local disk.\n');

    const collection = db.collection(collectionName);

    const count = await collection.countDocuments();
    const indexes = await collection.indexes();
    if (count === 0) {
      console.log(`⚠  ${collectionName} is empty — nothing to back up. Stopping.`);
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `${target.database || 'db'}.${collectionName}.${stamp}`;
    mkdirSync(outDir, { recursive: true });
    const dataPath = join(outDir, `${base}.jsonl${gzip ? '.gz' : ''}`);
    const manifestPath = join(outDir, `${base}.manifest.json`);

    console.log(`  database    : ${target.database || '(driver default)'}`);
    console.log(`  collection  : ${collectionName}`);
    console.log(`  documents   : ${count.toLocaleString()}`);
    console.log(`  indexes     : ${indexes.length}`);
    console.log(`  destination : ${dataPath}\n`);

    // ---- stream the documents ---------------------------------------------
    const cursor = collection.find({}, { batchSize }).stream();
    let written = 0;
    let lastReport = Date.now();

    async function* toEjsonLines() {
      for await (const doc of cursor) {
        // Canonical EJSON preserves ObjectId, Date, Decimal128 and friends, so a
        // restore reproduces the original BSON types rather than strings.
        yield EJSON.stringify(doc as any, { relaxed: false }) + '\n';
        written += 1;
        if (Date.now() - lastReport > 2000) {
          lastReport = Date.now();
          const pct = Math.round((written / count) * 100);
          process.stdout.write(`\r  writing… ${written}/${count} (${pct}%)   `);
        }
      }
    }

    const sink = createWriteStream(dataPath);
    await (gzip
      ? pipeline(toEjsonLines(), createGzip({ level: 6 }), sink)
      : pipeline(toEjsonLines(), sink));

    process.stdout.write('\r'.padEnd(60) + '\r');

    // ---- verify -------------------------------------------------------------
    const bytes = statSync(dataPath).size;
    const countAfter = await collection.countDocuments();

    const manifest = {
      takenAt: new Date().toISOString(),
      host: target.host,
      database: target.database,
      environment: target.environment,
      collection: collectionName,
      documentsExpected: count,
      documentsWritten: written,
      documentsAtFinish: countAfter,
      bytesOnDisk: bytes,
      gzip,
      format: 'newline-delimited canonical Extended JSON',
      dataFile: dataPath,
      indexes,
      restore: {
        documents:
          `mongoimport --uri "<MONGO_URI>" --collection ${collectionName} ` +
          `--type json --file "${gzip ? dataPath.replace(/\.gz$/, '') : dataPath}"` +
          (gzip ? '   (gunzip the file first)' : ''),
        indexes:
          'Index definitions are in the "indexes" array above; recreate with ' +
          'db.<collection>.createIndex(key, options) for any that are missing.',
      },
    };
    require('fs').writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✓ wrote ${written.toLocaleString()} documents`);
    console.log(`✓ ${(bytes / 1024 / 1024).toFixed(1)} MB → ${dataPath}`);
    console.log(`✓ manifest (incl. ${indexes.length} index definitions) → ${manifestPath}`);

    // A backup that silently lost documents is worse than none, so say so loudly.
    if (written !== count) {
      console.error(
        `\n❌ MISMATCH: expected ${count} documents, wrote ${written}. DO NOT rely on this backup.`,
      );
      process.exitCode = 1;
      return;
    }
    if (countAfter !== count) {
      console.log(
        `\n⚠  The collection changed while the backup ran (${count} → ${countAfter}). ` +
          'That is normal on a live system: this is a point-in-time snapshot, not a frozen one.',
      );
    }
    console.log('\n✅ Backup complete and verified.');
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
