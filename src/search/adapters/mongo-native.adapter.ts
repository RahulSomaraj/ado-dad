import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { escapeRegExp } from '../../common/security/regex.util';
import { HardFilters, LegacyFilters, PlanStep, SearchPlan } from '../planner/search-plan';
import { SearchHit, SearchIndexPort, SearchResult } from '../ports/search-index.port';
import { ScoringConfig, totalScore } from '../scoring/scoring.config';
import { distanceKmBetween } from './geo.util';

const EARTH_RADIUS_KM = 6371;
const MS_PER_DAY = 86_400_000;

/**
 * Hybrid search on plain MongoDB (audit §C.7, "MongoNativeAdapter").
 *
 * One aggregation per plan step:
 *
 *   $match { visibility, hard filters, $or: [ {searchKeys ∈ entityKeys}, {$text} ] }
 *   [legacy $lookup filters while SEARCH_KEYS_FILTERS is off]
 *   [$limit candidateCap for weak/unknown queries]
 *   $addFields structuredHit, textScore, distanceKm, ageDays, boost
 *   $addFields relevance, distanceDecay, freshnessDecay, sellerQuality, score
 *   $sort → $skip → $limit → $project { _id, score, distanceKm, postedBy }
 *
 * `$text` may sit inside `$or` because the only other clause, `searchKeys`, is
 * indexed. `$geoNear` is never used here, which is what lets keyword matching
 * and geo filtering coexist. The count is a second, capped aggregation.
 */
@Injectable()
export class MongoNativeAdapter implements SearchIndexPort {
  readonly name = 'mongo' as const;
  private readonly logger = new Logger(MongoNativeAdapter.name);

  constructor(@InjectModel('Ad') private readonly adModel: Model<any>) {}

  private lastWarningAt = 0;

  /** Forced by SEARCH_MONGO_SPLIT=true (tests, or a deployment without the searchKeys index). */
  private get forceSplit(): boolean {
    return (process.env.SEARCH_MONGO_SPLIT ?? '').toLowerCase() === 'true';
  }

  /** Mongo 291 NoQueryExecutionPlans: `$text` in `$or` with an unindexed sibling clause. */
  static isNoPlanError(err: unknown): boolean {
    const e = err as { code?: number; codeName?: string; message?: string };
    return e?.code === 291 || e?.codeName === 'NoQueryExecutionPlans' || /No query solutions/i.test(e?.message ?? '');
  }

  /** Mongo 27 / IndexNotFound: `$text` with no text index on the collection. */
  static isNoTextIndexError(err: unknown): boolean {
    const e = err as { code?: number; codeName?: string; message?: string };
    return e?.code === 27 || e?.codeName === 'IndexNotFound' || /text index required/i.test(e?.message ?? '');
  }

  private warnOnce(message: string): void {
    const now = Date.now();
    if (now - this.lastWarningAt < 60_000) return;
    this.lastWarningAt = now;
    this.logger.error(message);
  }

  async search(plan: SearchPlan, step: PlanStep): Promise<SearchResult> {
    if (this.forceSplit) return this.searchSplit(plan, step, 'text');
    try {
      return await this.searchSingle(plan, step);
    } catch (err) {
      // A missing index must never turn into a 500 on the busiest endpoint:
      // degrade to two plain queries merged and scored in memory, and say so
      // once a minute. Both conditions have a one-command fix.
      if (MongoNativeAdapter.isNoPlanError(err)) {
        this.warnOnce(
          'Search degraded to split mode: the planner cannot use $text inside $or without the searchKeys ' +
            'index. Run: npm run search:indexes -- --supporting --apply',
        );
        return this.searchSplit(plan, step, 'text');
      }
      if (MongoNativeAdapter.isNoTextIndexError(err)) {
        this.warnOnce(
          'Search degraded to split/regex mode: no text index on ads. ' +
            'Run: npm run search:indexes -- --swap-text --apply',
        );
        return this.searchSplit(plan, step, 'regex');
      }
      throw err;
    }
  }

  /** The two aggregations for a step; public so `search:explain` can explain them. */
  buildPipelines(plan: SearchPlan, step: PlanStep): { pipeline: any[]; countPipeline: any[] | null } {
    const cfg = plan.scoring.config;
    const match = this.buildMatch(step);
    const hasText = !!step.candidates.text;

    const pipeline: any[] = [{ $match: match }];
    pipeline.push(...this.legacyStages(step.filters));

    const weak = !plan.parsed || plan.parsed.strength === 'none' || plan.parsed.strength === 'weak';
    if (weak && step.candidates.entityKeys.length === 0 && cfg.candidateCap > 0) {
      pipeline.push({ $limit: cfg.candidateCap });
    }

    pipeline.push(
      { $addFields: this.signalFields(plan, step, hasText) },
      { $addFields: this.scoreFields(plan, cfg) },
      { $sort: this.sortStage(plan) },
      { $skip: plan.page.offset },
      { $limit: plan.page.limit + plan.page.spare },
      {
        $project: {
          _id: 1,
          score: 1,
          distanceKm: 1,
          postedBy: 1,
          structuredHit: 1,
        },
      },
    );

    const countPipeline: any[] | null = plan.page.includeTotal
      ? [
          { $match: match },
          ...this.legacyStages(step.filters),
          { $limit: cfg.countCap + 1 },
          { $count: 'n' },
        ]
      : null;
    return { pipeline, countPipeline };
  }

  private async searchSingle(plan: SearchPlan, step: PlanStep): Promise<SearchResult> {
    const startedAt = Date.now();
    const cfg = plan.scoring.config;
    const { pipeline, countPipeline } = this.buildPipelines(plan, step);

    const [rows, countRows] = await Promise.all([
      this.adModel.aggregate(pipeline).exec(),
      countPipeline ? this.adModel.aggregate(countPipeline).exec() : Promise.resolve(null),
    ]);

    const hits: SearchHit[] = (rows as any[]).map((r) => ({
      id: r._id,
      score: typeof r.score === 'number' ? r.score : 0,
      distanceKm: typeof r.distanceKm === 'number' ? r.distanceKm : null,
      postedBy: r.postedBy ? String(r.postedBy) : undefined,
      structuredHit: !!r.structuredHit,
    }));

    let total: number | undefined;
    let totalCapped: boolean | undefined;
    if (countRows) {
      const n = (countRows as any[])[0]?.n ?? 0;
      totalCapped = n > cfg.countCap;
      total = totalCapped ? cfg.countCap : n;
    }
    const distances = hits.map((h) => h.distanceKm).filter((d): d is number => typeof d === 'number');
    return {
      hits,
      total,
      totalCapped,
      nearestKm: distances.length ? Math.min(...distances) : undefined,
      engine: 'mongo',
      queryMs: Date.now() - startedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // $match
  // ---------------------------------------------------------------------------

  buildMatch(step: PlanStep, opts: { candidates?: boolean } = {}): Record<string, any> {
    const f = step.filters;
    const match: Record<string, any> = {
      isDeleted: { $ne: true },
      isActive: true,
      isApproved: true,
      soldOut: { $ne: true },
    };
    if (f.categories?.length === 1) match.category = f.categories[0];
    else if (f.categories && f.categories.length > 1) match.category = { $in: f.categories };

    const range = (r?: { min?: number; max?: number }) => {
      if (!r) return undefined;
      const q: Record<string, number> = {};
      if (r.min !== undefined) q.$gte = r.min;
      if (r.max !== undefined) q.$lte = r.max;
      return Object.keys(q).length ? q : undefined;
    };
    const price = range(f.price);
    if (price) match.price = price;
    const year = range(f.vehicleYear);
    if (year) match.vehicleYear = year;
    const bedrooms = range(f.bedrooms);
    if (bedrooms) match.bedrooms = bedrooms;
    const area = range(f.areaSqft);
    if (area) match.areaSqft = area;

    if (f.geoWithin) {
      match.geoLocation = {
        $geoWithin: {
          $centerSphere: [[f.geoWithin.lng, f.geoWithin.lat], f.geoWithin.radiusKm / 6378.1],
        },
      };
    }
    if (f.locationText) {
      match.location = { $regex: escapeRegExp(f.locationText), $options: 'i' };
    }

    const and: Record<string, any>[] = [];
    for (const group of f.keyGroups) {
      if (group.length === 1) and.push({ searchKeys: group[0] });
      else if (group.length > 1) and.push({ searchKeys: { $in: group } });
    }

    if (opts.candidates !== false) {
      const { entityKeys, text } = step.candidates;
      const clauses: Record<string, any>[] = [];
      if (entityKeys.length) clauses.push({ searchKeys: { $in: entityKeys } });
      if (text) clauses.push({ $text: { $search: text } });
      // `$text` stays at the top level of the query (inside a top-level `$or`
      // whose other clause is indexed); explicit key groups go in `$and`.
      if (clauses.length === 1) Object.assign(match, clauses[0]);
      else if (clauses.length > 1) match.$or = clauses;
    }

    if (and.length) match.$and = and;
    return match;
  }

  // ---------------------------------------------------------------------------
  // Split mode: one plain query per candidate clause, merged and scored here.
  // Used when the single `$or` query cannot be planned (no searchKeys index)
  // or when there is no text index at all (regex over searchText/title/desc).
  // Same results, same ordering; costs one extra round trip and caps the
  // candidates at `candidateCap` per clause.
  // ---------------------------------------------------------------------------

  async searchSplit(plan: SearchPlan, step: PlanStep, textMode: 'text' | 'regex'): Promise<SearchResult> {
    const startedAt = Date.now();
    const cfg = plan.scoring.config;
    const base = this.buildMatch(step, { candidates: false });
    const legacy = this.legacyStages(step.filters);
    const { entityKeys, text } = step.candidates;
    const cap = Math.max(cfg.candidateCap, plan.page.offset + plan.page.limit + plan.page.spare);

    const projection = {
      _id: 1, postedBy: 1, searchKeys: 1, vehicleYear: 1, createdAt: 1, price: 1,
      geoLocation: 1, latitude: 1, longitude: 1, sellerVerified: 1, imageCount: 1,
      searchText: 1, title: 1, textScore: 1,
    };
    const imageCountStage = {
      $addFields: { imageCount: { $ifNull: ['$imageCount', { $size: { $ifNull: ['$images', []] } }] } },
    };
    const tail = (sort: Record<string, 1 | -1>) => [{ $sort: sort }, { $limit: cap }, imageCountStage, { $project: projection }];

    const runs: { kind: 'structured' | 'text' | 'filters'; pipeline: any[] }[] = [];
    if (entityKeys.length) {
      runs.push({
        kind: 'structured',
        pipeline: [{ $match: { ...base, searchKeys: { $in: entityKeys } } }, ...legacy, ...tail({ createdAt: -1, _id: -1 })],
      });
    }
    if (text) {
      if (textMode === 'text') {
        runs.push({
          kind: 'text',
          pipeline: [
            { $match: { ...base, $text: { $search: text } } },
            ...legacy,
            { $addFields: { textScore: { $meta: 'textScore' } } },
            ...tail({ textScore: -1, _id: -1 }),
          ],
        });
      } else {
        runs.push({
          kind: 'text',
          pipeline: [
            { $match: { ...base, ...this.regexClause(text) } },
            ...legacy,
            { $addFields: { textScore: 1 } },
            ...tail({ createdAt: -1, _id: -1 }),
          ],
        });
      }
    }
    if (runs.length === 0) {
      runs.push({ kind: 'filters', pipeline: [{ $match: base }, ...legacy, ...tail({ createdAt: -1, _id: -1 })] });
    }

    const results = await Promise.all(runs.map((r) => this.adModel.aggregate(r.pipeline).exec() as Promise<any[]>));

    const merged = new Map<string, any>();
    let capped = false;
    results.forEach((rows, i) => {
      if (rows.length >= cap) capped = true;
      const structured = runs[i].kind === 'structured';
      for (const row of rows) {
        const id = String(row._id);
        const existing = merged.get(id);
        if (existing) {
          existing.structuredHit = existing.structuredHit || structured;
          existing.textScore = Math.max(existing.textScore ?? 0, row.textScore ?? 0);
        } else {
          merged.set(id, { ...row, structuredHit: structured, textScore: row.textScore ?? 0 });
        }
      }
    });

    const origin = plan.scoring.origin;
    const now = Date.now();
    const b = step.boosts;
    const wordRes = b.words.slice(0, 8).map((w) => new RegExp(`\\b${escapeRegExp(w)}`, 'i'));
    const scored = [...merged.values()].map((r) => {
      const keys = new Set<string>(Array.isArray(r.searchKeys) ? r.searchKeys : []);
      let boost = 0;
      for (const k of b.keys) if (keys.has(k.key)) boost += k.weight;
      if (b.exactYear && typeof r.vehicleYear === 'number') {
        if (r.vehicleYear === b.exactYear.year) boost += b.exactYear.weight;
        else if (Math.abs(r.vehicleYear - b.exactYear.year) === 1) boost += b.exactYear.nearWeight;
      }
      if (wordRes.length) {
        const haystack = `${r.searchText ?? ''} ${r.title ?? ''}`;
        for (const re of wordRes) if (re.test(haystack)) boost += b.wordWeight;
      }
      const coords: [number, number] | undefined = Array.isArray(r.geoLocation?.coordinates)
        ? (r.geoLocation.coordinates as [number, number])
        : typeof r.longitude === 'number' && typeof r.latitude === 'number'
          ? [r.longitude, r.latitude]
          : undefined;
      const distanceKm = origin && coords ? distanceKmBetween(origin, { lng: coords[0], lat: coords[1] }) : null;
      const createdAt = r.createdAt ? new Date(r.createdAt).getTime() : now;
      const score = totalScore(
        {
          structuredHit: !!r.structuredHit,
          textScore: r.textScore ?? 0,
          boost,
          distanceKm,
          ageDays: Math.max(0, (now - createdAt) / MS_PER_DAY),
          sellerVerified: !!r.sellerVerified,
          imageCount: typeof r.imageCount === 'number' ? r.imageCount : 0,
        },
        cfg,
      );
      return {
        id: r._id as Types.ObjectId,
        idStr: String(r._id),
        score,
        distanceKm,
        postedBy: r.postedBy ? String(r.postedBy) : undefined,
        structuredHit: !!r.structuredHit,
        createdAt,
        price: typeof r.price === 'number' ? r.price : 0,
        vehicleYear: typeof r.vehicleYear === 'number' ? r.vehicleYear : 0,
      };
    });

    const dir = plan.sort.order === 'ASC' ? 1 : -1;
    const byId = (a: { idStr: string }, c: { idStr: string }) => (a.idStr < c.idStr ? 1 : a.idStr > c.idStr ? -1 : 0);
    scored.sort((a, c) => {
      switch (plan.sort.by) {
        case 'price':
          return (a.price - c.price) * dir || byId(a, c);
        case 'createdAt':
          return (a.createdAt - c.createdAt) * dir || byId(a, c);
        case 'year':
          return (a.vehicleYear - c.vehicleYear) * dir || byId(a, c);
        case 'distance': {
          const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
          const dc = c.distanceKm ?? Number.POSITIVE_INFINITY;
          return da - dc || byId(a, c);
        }
        default:
          return c.score - a.score || byId(a, c);
      }
    });

    const page = scored.slice(plan.page.offset, plan.page.offset + plan.page.limit + plan.page.spare);
    const hits: SearchHit[] = page.map((h) => ({
      id: h.id,
      score: h.score,
      distanceKm: h.distanceKm,
      postedBy: h.postedBy,
      structuredHit: h.structuredHit,
    }));
    const distances = hits.map((h) => h.distanceKm).filter((d): d is number => typeof d === 'number');
    return {
      hits,
      total: plan.page.includeTotal ? Math.min(merged.size, cfg.countCap) : undefined,
      totalCapped: plan.page.includeTotal ? capped || merged.size > cfg.countCap : undefined,
      nearestKm: distances.length ? Math.min(...distances) : undefined,
      engine: 'mongo',
      queryMs: Date.now() - startedAt,
    };
  }

  /** Any query word, as a word-prefix, in searchText/title/description. Unindexed; last resort. */
  private regexClause(text: string): Record<string, any> {
    const words = text.split(' ').filter((w) => w.length >= 2).slice(0, 8).map(escapeRegExp);
    if (words.length === 0) return {};
    const re = { $regex: `\\b(${words.join('|')})`, $options: 'i' };
    return { $or: [{ searchText: re }, { title: re }, { description: re }] };
  }

  // ---------------------------------------------------------------------------
  // Legacy explicit filters (until SEARCH_KEYS_FILTERS) — same shape as
  // list-ads.uc.ts uses today, applied before scoring/pagination.
  // ---------------------------------------------------------------------------

  private legacyStages(f: HardFilters): any[] {
    const l: LegacyFilters = f.legacy ?? {};
    const stages: any[] = [];
    const oid = (ids: string[]) => ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

    const vehicleCond: Record<string, any> = {};
    if (l.manufacturerIds?.length) vehicleCond.manufacturerId = { $in: oid(l.manufacturerIds) };
    if (l.modelIds?.length) vehicleCond.modelId = { $in: oid(l.modelIds) };
    if (l.fuelTypeIds?.length) vehicleCond.fuelTypeId = { $in: oid(l.fuelTypeIds) };
    if (l.transmissionTypeIds?.length) vehicleCond.transmissionTypeId = { $in: oid(l.transmissionTypeIds) };
    if (l.minYear !== undefined || l.maxYear !== undefined) {
      vehicleCond.year = {};
      if (l.minYear !== undefined) vehicleCond.year.$gte = l.minYear;
      if (l.maxYear !== undefined) vehicleCond.year.$lte = l.maxYear;
    }
    const cvCond: Record<string, any> = { ...vehicleCond };
    if (l.commercialVehicleTypes?.length) cvCond.commercialVehicleType = { $in: l.commercialVehicleTypes };

    const needsVehicle = Object.keys(vehicleCond).length > 0;
    const needsCv = Object.keys(cvCond).length > 0;
    if (needsVehicle || needsCv) {
      stages.push(
        { $lookup: { from: 'vehicleads', localField: '_id', foreignField: 'ad', as: '_vd' } },
        { $lookup: { from: 'commercialvehicleads', localField: '_id', foreignField: 'ad', as: '_cvd' } },
      );
      const or: Record<string, any>[] = [];
      if (needsVehicle && !l.commercialVehicleTypes?.length) or.push({ _vd: { $elemMatch: vehicleCond } });
      if (needsCv) or.push({ _cvd: { $elemMatch: cvCond } });
      stages.push({ $match: or.length === 1 ? or[0] : { $or: or } });
      stages.push({ $unset: ['_vd', '_cvd'] });
    }

    const propCond: Record<string, any> = {};
    if (l.propertyTypes?.length) propCond.propertyType = { $in: l.propertyTypes };
    if (l.listingType) propCond.listingType = l.listingType;
    if (l.minBedrooms !== undefined || l.maxBedrooms !== undefined) {
      propCond.bedrooms = {};
      if (l.minBedrooms !== undefined) propCond.bedrooms.$gte = l.minBedrooms;
      if (l.maxBedrooms !== undefined) propCond.bedrooms.$lte = l.maxBedrooms;
    }
    if (l.minArea !== undefined || l.maxArea !== undefined) {
      propCond.areaSqft = {};
      if (l.minArea !== undefined) propCond.areaSqft.$gte = l.minArea;
      if (l.maxArea !== undefined) propCond.areaSqft.$lte = l.maxArea;
    }
    if (l.isFurnished !== undefined) propCond.isFurnished = l.isFurnished;
    if (l.hasParking !== undefined) propCond.hasParking = l.hasParking;
    if (Object.keys(propCond).length > 0) {
      stages.push(
        { $lookup: { from: 'propertyads', localField: '_id', foreignField: 'ad', as: '_pd' } },
        { $match: { _pd: { $elemMatch: propCond } } },
        { $unset: ['_pd'] },
      );
    }
    return stages;
  }

  // ---------------------------------------------------------------------------
  // Scoring expressions
  // ---------------------------------------------------------------------------

  private signalFields(plan: SearchPlan, step: PlanStep, hasText: boolean): Record<string, any> {
    const { entityKeys } = step.candidates;
    const b = step.boosts;
    const now = new Date();

    const boostTerms: any[] = [0];
    for (const k of b.keys) {
      boostTerms.push({ $cond: [{ $in: [k.key, { $ifNull: ['$searchKeys', []] }] }, k.weight, 0] });
    }
    if (b.exactYear) {
      boostTerms.push({
        $cond: [
          { $eq: ['$vehicleYear', b.exactYear.year] },
          b.exactYear.weight,
          {
            $cond: [
              { $in: ['$vehicleYear', [b.exactYear.year - 1, b.exactYear.year + 1]] },
              b.exactYear.nearWeight,
              0,
            ],
          },
        ],
      });
    }
    if (b.words.length && b.wordWeight > 0) {
      const haystack = {
        $concat: [{ $ifNull: ['$searchText', ''] }, ' ', { $ifNull: ['$title', ''] }],
      };
      for (const w of b.words.slice(0, 8)) {
        boostTerms.push({
          $cond: [
            { $regexMatch: { input: haystack, regex: `\\b${escapeRegExp(w)}`, options: 'i' } },
            b.wordWeight,
            0,
          ],
        });
      }
    }

    const fields: Record<string, any> = {
      structuredHit: entityKeys.length
        ? {
            $gt: [
              { $size: { $setIntersection: [{ $ifNull: ['$searchKeys', []] }, entityKeys] } },
              0,
            ],
          }
        : false,
      textScore: hasText ? { $meta: 'textScore' } : 0,
      ageDays: {
        $max: [0, { $divide: [{ $subtract: [now, { $ifNull: ['$createdAt', now] }] }, MS_PER_DAY] }],
      },
      boost: { $add: boostTerms },
    };

    const origin = plan.scoring.origin;
    if (origin) {
      const lat2 = {
        $ifNull: [{ $arrayElemAt: [{ $ifNull: ['$geoLocation.coordinates', []] }, 1] }, '$latitude'],
      };
      const lng2 = {
        $ifNull: [{ $arrayElemAt: [{ $ifNull: ['$geoLocation.coordinates', []] }, 0] }, '$longitude'],
      };
      const lat1 = { $degreesToRadians: origin.lat };
      const lng1 = { $degreesToRadians: origin.lng };
      const rlat2 = { $degreesToRadians: lat2 };
      const rlng2 = { $degreesToRadians: lng2 };
      // Great-circle distance; the argument to $acos is clamped to [-1, 1] so
      // floating-point noise on identical points cannot throw.
      const cosine = {
        $add: [
          { $multiply: [{ $sin: lat1 }, { $sin: rlat2 }] },
          { $multiply: [{ $cos: lat1 }, { $cos: rlat2 }, { $cos: { $subtract: [rlng2, lng1] } }] },
        ],
      };
      fields.distanceKm = {
        $cond: [
          { $and: [{ $isNumber: lat2 }, { $isNumber: lng2 }] },
          { $multiply: [EARTH_RADIUS_KM, { $acos: { $min: [1, { $max: [-1, cosine] }] } }] },
          null,
        ],
      };
    } else {
      fields.distanceKm = null;
    }
    return fields;
  }

  private scoreFields(plan: SearchPlan, cfg: ScoringConfig): Record<string, any> {
    const relevance = {
      $add: [
        {
          $cond: [
            '$structuredHit',
            cfg.entityBoost,
            { $multiply: [{ $min: ['$textScore', cfg.textMax] }, cfg.textScale] },
          ],
        },
        '$boost',
      ],
    };
    const distanceDecay = plan.scoring.origin
      ? {
          $cond: [
            { $isNumber: '$distanceKm' },
            {
              $max: [
                cfg.distanceFloor,
                { $exp: { $multiply: [-1, { $pow: [{ $divide: ['$distanceKm', cfg.distanceSigmaKm] }, 2] }] } },
              ],
            },
            1,
          ],
        }
      : 1;
    const freshnessDecay = {
      $max: [cfg.freshnessFloor, { $pow: [0.5, { $divide: ['$ageDays', cfg.freshnessHalfLifeDays] }] }],
    };
    const imageCount = { $ifNull: ['$imageCount', { $size: { $ifNull: ['$images', []] } }] };
    const sellerQuality = {
      $multiply: [
        { $cond: [{ $eq: ['$sellerVerified', true] }, cfg.sellerVerifiedMultiplier, 1] },
        { $cond: [{ $eq: [imageCount, 0] }, cfg.noImageMultiplier, 1] },
      ],
    };
    return {
      relevance,
      distanceDecay,
      freshnessDecay,
      sellerQuality,
      score: { $multiply: [relevance, distanceDecay, freshnessDecay, sellerQuality] },
    };
  }

  private sortStage(plan: SearchPlan): Record<string, 1 | -1> {
    const dir: 1 | -1 = plan.sort.order === 'ASC' ? 1 : -1;
    switch (plan.sort.by) {
      case 'price':
        return { price: dir, _id: -1 };
      case 'createdAt':
        return { createdAt: dir, _id: -1 };
      case 'year':
        return { vehicleYear: dir, _id: -1 };
      case 'distance':
        return { distanceKm: 1, _id: -1 };
      default:
        return { score: -1, _id: -1 };
    }
  }
}
