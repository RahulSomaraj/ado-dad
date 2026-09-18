import { BulkCapableModel, safeBulkWrite } from './safe-bulk.util';

const makeModel = (
  impl?: (ops: any[], call: number) => Promise<any> | any,
): BulkCapableModel & { calls: any[][] } => {
  const calls: any[][] = [];
  return {
    calls,
    async bulkWrite(ops: any[]) {
      calls.push(ops);
      if (impl) return await impl(ops, calls.length);
      return { matchedCount: ops.length, modifiedCount: ops.length, upsertedCount: 0 };
    },
  };
};

const ops = (n: number) => Array.from({ length: n }, (_, i) => ({ updateOne: { filter: { i } } }));

describe('safeBulkWrite', () => {
  it('writes nothing when writes are disabled', async () => {
    const model = makeModel();
    const res = await safeBulkWrite(model, ops(500), {
      label: 'test',
      writesEnabled: false,
      pauseMs: 0,
    });
    expect(model.calls).toHaveLength(0);
    expect(res.dryRun).toBe(true);
    expect(res.processed).toBe(500);
    expect(res.modified).toBe(0);
  });

  it('splits into batches of the configured size', async () => {
    const model = makeModel();
    const res = await safeBulkWrite(model, ops(450), {
      label: 'test',
      writesEnabled: true,
      batchSize: 200,
      pauseMs: 0,
    });
    expect(model.calls.map((c) => c.length)).toEqual([200, 200, 50]);
    expect(res.batchCount).toBe(3);
    expect(res.modified).toBe(450);
    expect(res.aborted).toBe(false);
  });

  it('aborts once the failure ceiling is reached', async () => {
    const model = makeModel(() => {
      throw new Error('write conflict');
    });
    const res = await safeBulkWrite(model, ops(1000), {
      label: 'test',
      writesEnabled: true,
      batchSize: 100,
      pauseMs: 0,
      maxFailedBatches: 3,
    });
    expect(res.aborted).toBe(true);
    expect(res.failedBatches).toBe(3);
    // Stops at the ceiling instead of grinding through all ten batches.
    expect(model.calls).toHaveLength(3);
    expect(res.abortReason).toMatch(/aborting/);
  });

  it('survives failures below the ceiling', async () => {
    const model = makeModel((o, call) => {
      if (call === 2) throw new Error('transient');
      return { matchedCount: o.length, modifiedCount: o.length, upsertedCount: 0 };
    });
    const res = await safeBulkWrite(model, ops(300), {
      label: 'test',
      writesEnabled: true,
      batchSize: 100,
      pauseMs: 0,
      maxFailedBatches: 3,
    });
    expect(res.aborted).toBe(false);
    expect(res.failedBatches).toBe(1);
    expect(res.modified).toBe(200);
  });

  it('stops cleanly when beforeBatch says to halt', async () => {
    const model = makeModel();
    const res = await safeBulkWrite(model, ops(500), {
      label: 'test',
      writesEnabled: true,
      batchSize: 100,
      pauseMs: 0,
      beforeBatch: (i) => i < 3,
    });
    expect(model.calls).toHaveLength(2);
    expect(res.aborted).toBe(true);
    expect(res.abortReason).toMatch(/beforeBatch/);
  });

  it('reports progress once per batch', async () => {
    const model = makeModel();
    const seen: number[] = [];
    await safeBulkWrite(model, ops(300), {
      label: 'test',
      writesEnabled: true,
      batchSize: 100,
      pauseMs: 0,
      onProgress: (p) => seen.push(p.batchIndex),
    });
    expect(seen).toEqual([1, 2, 3]);
  });

  it('handles an empty operation list', async () => {
    const model = makeModel();
    const res = await safeBulkWrite(model, [], { label: 'test', writesEnabled: true });
    expect(model.calls).toHaveLength(0);
    expect(res.total).toBe(0);
    expect(res.aborted).toBe(false);
  });

  it('throttles between batches but not after the last one', async () => {
    const model = makeModel();
    const started = Date.now();
    await safeBulkWrite(model, ops(300), {
      label: 'test',
      writesEnabled: true,
      batchSize: 100,
      pauseMs: 40,
    });
    const elapsed = Date.now() - started;
    // Two pauses between three batches, not three.
    expect(elapsed).toBeGreaterThanOrEqual(70);
    expect(elapsed).toBeLessThan(200);
  });
});
