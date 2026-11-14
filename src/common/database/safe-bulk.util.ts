/**
 * Throttled batch writer for maintenance scripts that touch large live
 * collections.
 *
 * A plain `bulkWrite` of 200k operations against production will saturate the
 * write path, inflate replication lag and can stall ordinary API traffic. This
 * helper keeps a backfill boring: small batches, a deliberate pause between
 * them, a ceiling on failures, and an abort that leaves the collection in a
 * partially-migrated-but-consistent state rather than half-broken.
 *
 * It is deliberately generic — S3's backfill and any future repair script use
 * the same path, so throttling is never re-invented under time pressure.
 */

export interface SafeBulkOptions {
  /** Shown in progress output. */
  label: string;
  /** Operations per bulkWrite call. */
  batchSize?: number;
  /** Milliseconds to sleep between batches — the throttle. */
  pauseMs?: number;
  /** Abort after this many failed batches. */
  maxFailedBatches?: number;
  /** When false, nothing is sent to the database. */
  writesEnabled: boolean;
  /** Called after every batch. */
  onProgress?: (progress: SafeBulkProgress) => void;
  /**
   * Called before each batch. Returning false stops the run cleanly — used to
   * watch replication lag or a kill switch.
   */
  beforeBatch?: (batchIndex: number) => Promise<boolean> | boolean;
}

export interface SafeBulkProgress {
  label: string;
  batchIndex: number;
  batchCount: number;
  processed: number;
  total: number;
  matched: number;
  modified: number;
  upserted: number;
  failedBatches: number;
  elapsedMs: number;
}

export interface SafeBulkResult extends SafeBulkProgress {
  aborted: boolean;
  abortReason?: string;
  dryRun: boolean;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal shape of what this helper needs — keeps it testable without Mongo. */
export interface BulkCapableModel {
  bulkWrite(
    ops: any[],
    options?: Record<string, unknown>,
  ): Promise<{
    matchedCount?: number;
    modifiedCount?: number;
    upsertedCount?: number;
  }>;
}

export async function safeBulkWrite(
  model: BulkCapableModel,
  ops: any[],
  options: SafeBulkOptions,
): Promise<SafeBulkResult> {
  const {
    label,
    batchSize = 200,
    pauseMs = 250,
    maxFailedBatches = 3,
    writesEnabled,
    onProgress,
    beforeBatch,
  } = options;

  const startedAt = Date.now();
  const batchCount = Math.ceil(ops.length / batchSize);

  const state: SafeBulkResult = {
    label,
    batchIndex: 0,
    batchCount,
    processed: 0,
    total: ops.length,
    matched: 0,
    modified: 0,
    upserted: 0,
    failedBatches: 0,
    elapsedMs: 0,
    aborted: false,
    dryRun: !writesEnabled,
  };

  if (ops.length === 0) return state;

  for (let i = 0; i < ops.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize) + 1;
    state.batchIndex = batchIndex;

    if (beforeBatch) {
      const proceed = await beforeBatch(batchIndex);
      if (!proceed) {
        state.aborted = true;
        state.abortReason = 'halted by beforeBatch check';
        break;
      }
    }

    const batch = ops.slice(i, i + batchSize);

    if (writesEnabled) {
      try {
        // ordered:false so one bad document cannot stop the rest of the batch.
        const res = await model.bulkWrite(batch, { ordered: false });
        state.matched += res.matchedCount ?? 0;
        state.modified += res.modifiedCount ?? 0;
        state.upserted += res.upsertedCount ?? 0;
      } catch (err) {
        state.failedBatches += 1;
        // eslint-disable-next-line no-console
        console.error(
          `[${label}] batch ${batchIndex}/${batchCount} failed: ${(err as Error).message}`,
        );
        if (state.failedBatches >= maxFailedBatches) {
          state.aborted = true;
          state.abortReason = `${state.failedBatches} batches failed — aborting before making it worse`;
          state.processed += batch.length;
          break;
        }
      }
    }

    state.processed += batch.length;
    state.elapsedMs = Date.now() - startedAt;
    onProgress?.({ ...state });

    // Do not pause after the final batch.
    if (writesEnabled && pauseMs > 0 && i + batchSize < ops.length) {
      await sleep(pauseMs);
    }
  }

  state.elapsedMs = Date.now() - startedAt;
  return state;
}

/** One-line progress reporter suitable for a script's stdout. */
export function logProgress(p: SafeBulkProgress): void {
  const pct = p.total === 0 ? 100 : Math.round((p.processed / p.total) * 100);
  const rate = p.elapsedMs > 0 ? Math.round((p.processed / p.elapsedMs) * 1000) : 0;
  // eslint-disable-next-line no-console
  console.log(
    `[${p.label}] batch ${p.batchIndex}/${p.batchCount}  ${p.processed}/${p.total} (${pct}%)  ` +
      `modified=${p.modified} upserted=${p.upserted} failed=${p.failedBatches}  ~${rate}/s`,
  );
}
