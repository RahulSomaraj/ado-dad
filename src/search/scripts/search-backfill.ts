import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { SearchDocSyncService } from '../services/search-doc-sync.service';
import { SEARCH_DOC_VERSION } from '../services/ad-search-doc.builder';

/**
 * Backfill the denormalised search document onto existing ads (audit §E row 6).
 *
 *   npm run search:backfill                       dry run: count + first batch preview
 *   npm run search:backfill -- --apply            rebuild every non-deleted ad
 *   npm run search:backfill -- --apply --only-missing
 *                                                 only ads with no doc or an older version
 *   npm run search:backfill -- --apply --since 2026-09-01
 *   npm run search:backfill -- --apply --batch 500 --pause 200
 *   npm run search:backfill -- --apply --resume-after <lastId>
 *
 * Production additionally needs --prod, --confirm <db> and ALLOW_PROD_WRITE=yes
 * (db-safety.util). Idempotent: rerunning rewrites identical documents.
 * Resumable: every batch logs the last _id; pass it back with --resume-after.
 * Interruptible: Ctrl-C finishes the current batch and stops.
 */

applyLocalDnsWorkaround();

async function bootstrap() {
  const flags = parseFlags();
  const script = 'search:backfill';

  const onlyMissing = flags.values['only-missing'] === true;
  const since = typeof flags.values.since === 'string' ? new Date(flags.values.since) : undefined;
  if (since && Number.isNaN(since.getTime())) {
    console.error('--since must be an ISO date');
    process.exitCode = 1;
    return;
  }
  const batchSize = Number(flags.values.batch ?? 500) || 500;
  const pauseMs = Number(flags.values.pause ?? 200) || 0;
  const resumeAfter =
    typeof flags.values['resume-after'] === 'string' ? flags.values['resume-after'] : undefined;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  let stop = false;
  const onSignal = () => {
    if (stop) return;
    stop = true;
    console.log('\n⏹  stopping after the current batch…');
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    const adModel = app.get<Model<any>>(getModelToken(Ad.name));
    const target = withResolvedDatabase(describeTarget(), adModel.db?.name);
    const guard = guardWrites({
      script,
      apply: flags.apply,
      confirm: flags.confirm,
      prodFlag: flags.prodFlag,
      target,
    });
    console.log(formatBanner(script, guard));

    const sync = app.get(SearchDocSyncService);
    const stale = await sync.countStale({ onlyMissing, since });
    const all = await sync.countStale({});
    console.log(
      `search doc version ${SEARCH_DOC_VERSION}; ${all} live ads, ${stale} selected` +
        `${onlyMissing ? ' (missing or outdated)' : ''}${since ? ` (updated since ${since.toISOString()})` : ''}.`,
    );
    if (stale === 0) {
      console.log('Nothing to do.');
      return;
    }
    const dryRun = !guard.writesEnabled;
    if (dryRun) {
      console.log('\nDRY RUN — composing one preview batch without writing (add --apply to write):');
    }
    let batchesAllowed = dryRun ? 1 : Number.POSITIVE_INFINITY;

    const progress = await sync.backfill({
      writesEnabled: !dryRun,
      onlyMissing,
      since,
      batchSize: dryRun ? Math.min(batchSize, 25) : batchSize,
      pauseMs,
      resumeAfter,
      shouldContinue: () => !stop && batchesAllowed-- > 0,
      onBatch: (p) => {
        console.log(
          `  batch ${p.batch}: ${p.processed}/${p.total} processed, ${p.modified} modified, ` +
            `${p.missingDetail} without detail row, ${p.brokenRefs} broken catalogue refs, ` +
            `${(p.elapsedMs / 1000).toFixed(1)}s, last _id ${p.lastId}`,
        );
      },
    });

    if (dryRun) {
      console.log(`\nDry run complete (${progress.processed} previewed, nothing written).`);
      return;
    }

    console.log(
      `\n✅ ${progress.processed} ads processed, ${progress.modified} modified in ` +
        `${(progress.elapsedMs / 1000).toFixed(1)}s.` +
        (progress.missingDetail ? ` ${progress.missingDetail} ads have no detail row.` : '') +
        (progress.brokenRefs ? ` ${progress.brokenRefs} detail rows reference missing catalogue docs.` : '') +
        (stop ? ` Stopped early; resume with --resume-after ${progress.lastId}` : ''),
    );
    if (progress.missingDetail || progress.brokenRefs) {
      console.log('Run `npm run search:validate` for the list.');
    }
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
