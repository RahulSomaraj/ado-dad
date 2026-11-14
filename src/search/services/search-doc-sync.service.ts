import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  AdSearchDocBuilder,
  SEARCH_DOC_VERSION,
  SearchDocInput,
  composeSearchDoc,
  searchDocToUpdate,
} from './ad-search-doc.builder';

export interface RebuildResult {
  requested: number;
  found: number;
  modified: number;
  /** Ad ids that exist but have no detail row for their category. */
  missingDetail: string[];
  /** Detail rows that point at catalogue ids that no longer exist. */
  brokenRefs: string[];
}

export interface BackfillOptions {
  writesEnabled: boolean;
  /** Only ads with no search doc, or one older than SEARCH_DOC_VERSION. */
  onlyMissing?: boolean;
  /** Only ads updated after this date. */
  since?: Date;
  batchSize?: number;
  pauseMs?: number;
  onBatch?: (progress: BackfillProgress) => void;
  /** Return false to stop between batches (Ctrl-C handling in the script). */
  shouldContinue?: () => boolean;
}

export interface BackfillProgress {
  batch: number;
  processed: number;
  total: number;
  modified: number;
  missingDetail: number;
  brokenRefs: number;
  elapsedMs: number;
  lastId?: string;
}

export interface CatalogueRef {
  manufacturerId?: string;
  modelId?: string;
  variantId?: string;
  fuelTypeId?: string;
  transmissionTypeId?: string;
}

/**
 * Rebuilds search documents from what is in the database.
 *
 * Three callers:
 *  - the v1 write paths in ads.service.ts (post-save, best-effort);
 *  - the vehicle-inventory services when a brand/model/variant is renamed;
 *  - `npm run search:backfill`.
 *
 * The v2 use cases do NOT come through here: they build the document inside
 * their transaction from the DTO (AdSearchDocBuilder.build), so a v2 ad is
 * never observable without its search document.
 */
@Injectable()
export class SearchDocSyncService {
  private readonly logger = new Logger(SearchDocSyncService.name);

  constructor(
    @InjectModel('Ad') private readonly adModel: Model<any>,
    @InjectModel('VehicleAd') private readonly vehicleAdModel: Model<any>,
    @InjectModel('CommercialVehicleAd') private readonly commercialAdModel: Model<any>,
    @InjectModel('PropertyAd') private readonly propertyAdModel: Model<any>,
    private readonly builder: AdSearchDocBuilder,
  ) {}

  /** Best-effort single rebuild for the legacy write paths. Never throws. */
  async rebuildAdSafe(adId: Types.ObjectId | string, why: string): Promise<void> {
    try {
      const r = await this.rebuildMany([adId]);
      if (r.found === 0) this.logger.warn(`search doc rebuild (${why}): ad ${adId} not found`);
    } catch (err) {
      this.logger.warn(`search doc rebuild (${why}) failed for ${adId}: ${(err as Error).message}`);
    }
  }

  async rebuildMany(
    adIds: (Types.ObjectId | string)[],
    opts: { session?: ClientSession; writesEnabled?: boolean } = {},
  ): Promise<RebuildResult> {
    const writesEnabled = opts.writesEnabled !== false;
    const ids = adIds
      .map((v) => String(v))
      .filter((s) => Types.ObjectId.isValid(s))
      .map((s) => new Types.ObjectId(s));
    const result: RebuildResult = {
      requested: adIds.length,
      found: 0,
      modified: 0,
      missingDetail: [],
      brokenRefs: [],
    };
    if (ids.length === 0) return result;

    const q = (model: Model<any>) => {
      const query = model.find({ ad: { $in: ids } }).lean();
      return opts.session ? query.session(opts.session).exec() : query.exec();
    };
    const adQuery = this.adModel
      .find({ _id: { $in: ids } })
      .select('_id category images location city district state postedBy')
      .lean();
    const [ads, vehicles, commercials, properties] = await Promise.all([
      opts.session ? adQuery.session(opts.session).exec() : adQuery.exec(),
      q(this.vehicleAdModel),
      q(this.commercialAdModel),
      q(this.propertyAdModel),
    ]);
    result.found = ads.length;
    if (ads.length === 0) return result;

    const byAd = (rows: any[]) => new Map(rows.map((r) => [String(r.ad), r]));
    const vehicleByAd = byAd(vehicles as any[]);
    const commercialByAd = byAd(commercials as any[]);
    const propertyByAd = byAd(properties as any[]);

    const inputs = (ads as any[]).map((ad) => {
      const id = String(ad._id);
      const input: SearchDocInput = {
        category: ad.category,
        images: ad.images,
        location: ad.location,
        city: ad.city,
        district: ad.district,
        state: ad.state,
      };
      switch (ad.category) {
        case 'property':
          input.property = propertyByAd.get(id) ?? null;
          break;
        case 'commercial_vehicle':
          input.commercial = commercialByAd.get(id) ?? null;
          break;
        default:
          input.vehicle = vehicleByAd.get(id) ?? null;
      }
      if (!input.property && !input.commercial && !input.vehicle) result.missingDetail.push(id);
      return { ad, input };
    });

    const [names, sellers] = await Promise.all([
      this.builder.resolveNames(inputs.map((i) => i.input)),
      this.builder.resolveSellers((ads as any[]).map((a) => a.postedBy)),
    ]);

    const ops = inputs.map(({ ad, input }) => {
      const veh = input.commercial ?? input.vehicle;
      if (veh) {
        const check = (id: any, map: Map<string, unknown>, label: string) => {
          if (id && !map.has(String(id))) result.brokenRefs.push(`${ad._id}:${label}:${id}`);
        };
        check(veh.manufacturerId, names.manufacturers, 'manufacturer');
        check(veh.modelId, names.models, 'model');
        check(veh.variantId, names.variants, 'variant');
      }
      const doc = composeSearchDoc(input, names, {
        sellerVerified: sellers.get(String(ad.postedBy)) ?? false,
      });
      const { $set, $unset } = searchDocToUpdate(doc);
      const update: Record<string, any> = { $set };
      if (Object.keys($unset).length) update.$unset = $unset;
      return { updateOne: { filter: { _id: ad._id }, update } };
    });

    if (!writesEnabled) return result;
    const res = await this.adModel.bulkWrite(ops, {
      ordered: false,
      ...(opts.session ? { session: opts.session } : {}),
    });
    result.modified = (res as any).modifiedCount ?? 0;
    return result;
  }

  /**
   * Every ad that references the given catalogue entity, rebuilt in batches.
   * Called after a brand/model/variant rename. Best-effort and logged; the
   * nightly `search:backfill -- --only-missing` catches anything it misses.
   */
  async rebuildForCatalogue(ref: CatalogueRef, batchSize = 500): Promise<number> {
    const filter: Record<string, any> = {};
    for (const [k, v] of Object.entries(ref)) {
      if (v && Types.ObjectId.isValid(v)) filter[k] = new Types.ObjectId(v);
    }
    if (Object.keys(filter).length === 0) return 0;

    const [a, b] = await Promise.all([
      this.vehicleAdModel.find(filter).select('ad').lean().exec(),
      this.commercialAdModel.find(filter).select('ad').lean().exec(),
    ]);
    const ids = [...new Set([...(a as any[]), ...(b as any[])].map((r) => String(r.ad)))];
    let done = 0;
    for (let i = 0; i < ids.length; i += batchSize) {
      const r = await this.rebuildMany(ids.slice(i, i + batchSize));
      done += r.found;
    }
    this.logger.log(`search docs rebuilt for catalogue change ${JSON.stringify(ref)}: ${done} ads`);
    return done;
  }

  /** Fire-and-forget wrapper for the inventory services. */
  rebuildForCatalogueInBackground(ref: CatalogueRef): void {
    this.rebuildForCatalogue(ref).catch((err) =>
      this.logger.warn(`background search doc rebuild failed: ${(err as Error).message}`),
    );
  }

  /** Count of ads the backfill would touch with these options. */
  async countStale(opts: { onlyMissing?: boolean; since?: Date }): Promise<number> {
    return this.adModel.countDocuments(this.backfillFilter(opts)).exec();
  }

  /**
   * Resumable, batched rebuild of every (non-deleted) ad. Walks `_id`
   * ascending so a crash can be resumed from the last logged id.
   */
  async backfill(opts: BackfillOptions & { resumeAfter?: string }): Promise<BackfillProgress> {
    const batchSize = opts.batchSize ?? 500;
    const pauseMs = opts.pauseMs ?? 200;
    const filter = this.backfillFilter(opts);
    const total = await this.adModel.countDocuments(filter).exec();
    const startedAt = Date.now();
    const progress: BackfillProgress = {
      batch: 0,
      processed: 0,
      total,
      modified: 0,
      missingDetail: 0,
      brokenRefs: 0,
      elapsedMs: 0,
    };

    let lastId: Types.ObjectId | undefined = opts.resumeAfter && Types.ObjectId.isValid(opts.resumeAfter)
      ? new Types.ObjectId(opts.resumeAfter)
      : undefined;

    for (;;) {
      if (opts.shouldContinue && !opts.shouldContinue()) break;
      const page: any[] = await this.adModel
        .find(lastId ? { ...filter, _id: { $gt: lastId } } : filter)
        .sort({ _id: 1 })
        .limit(batchSize)
        .select('_id')
        .lean()
        .exec();
      if (page.length === 0) break;

      const r = await this.rebuildMany(
        page.map((p) => p._id),
        { writesEnabled: opts.writesEnabled },
      );
      lastId = page[page.length - 1]._id;
      progress.batch += 1;
      progress.processed += page.length;
      progress.modified += r.modified;
      progress.missingDetail += r.missingDetail.length;
      progress.brokenRefs += r.brokenRefs.length;
      progress.elapsedMs = Date.now() - startedAt;
      progress.lastId = String(lastId);
      opts.onBatch?.(progress);

      if (page.length < batchSize) break;
      if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs));
    }
    progress.elapsedMs = Date.now() - startedAt;
    return progress;
  }

  private backfillFilter(opts: { onlyMissing?: boolean; since?: Date }): Record<string, any> {
    const filter: Record<string, any> = { isDeleted: { $ne: true } };
    if (opts.onlyMissing) {
      filter.$or = [
        { searchDocVersion: { $exists: false } },
        { searchDocVersion: { $lt: SEARCH_DOC_VERSION } },
      ];
    }
    if (opts.since) filter.updatedAt = { $gte: opts.since };
    return filter;
  }
}
