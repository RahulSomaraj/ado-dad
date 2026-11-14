import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlanStep, SearchPlan } from '../planner/search-plan';
import { SearchHit, SearchIndexPort, SearchResult } from '../ports/search-index.port';
import { distanceKmBetween } from './geo.util';

export const ATLAS_SEARCH_INDEX = process.env.SEARCH_ATLAS_INDEX || 'ads_search';

/**
 * Hybrid search on Atlas Search (audit §C.7, "AtlasSearchAdapter").
 *
 * One `$search` stage per plan step:
 *
 *   compound
 *     filter   visibility, category, ranges, geoWithin, explicit key groups
 *     must     compound { should: [ in(searchKeys ∈ entityKeys) ^entityBoost,
 *                                   text(searchText|title|description, fuzzy) ],
 *                         minimumShouldMatch: 1 }          ← the candidate clauses
 *     should   attribute boosts, remaining words, near(geoLocation), near(createdAt)
 *     mustNot  isDeleted, soldOut
 *
 * The candidate clauses sit in their own nested compound with
 * `minimumShouldMatch: 1`, so a document can never qualify through a boost
 * clause alone. Boosts, distance and freshness only reorder.
 *
 * The count is a separate `$searchMeta` with the same compound, capped as a
 * lower bound. Pagination is `$skip/$limit` (searchAfter is tier 2).
 *
 * Requires the `ads_search` index (src/search/atlas/ads-search-index.json),
 * created by `npm run search:atlas-index -- --apply`.
 */
@Injectable()
export class AtlasSearchAdapter implements SearchIndexPort {
  readonly name = 'atlas' as const;
  private readonly logger = new Logger(AtlasSearchAdapter.name);

  constructor(@InjectModel('Ad') private readonly adModel: Model<any>) {}

  /** Errors that mean "no usable Atlas Search here", where falling back is right. */
  static isRecoverable(err: unknown): boolean {
    const e = err as { message?: string; codeName?: string; code?: number };
    const msg = `${e?.message ?? ''} ${e?.codeName ?? ''}`;
    return /\$search|\$searchMeta|search index|SearchNotEnabled|mongot|Unrecognized pipeline stage|index.*not found/i.test(
      msg,
    );
  }

  /** The two aggregations for a step; public so `search:explain` can time them. */
  buildPipelines(plan: SearchPlan, step: PlanStep): { pipeline: any[]; metaPipeline: any[] | null } {
    const cfg = plan.scoring.config;
    const compound = this.buildCompound(plan, step);

    const searchStage: Record<string, any> = {
      index: ATLAS_SEARCH_INDEX,
      compound,
      count: { type: 'lowerBound', threshold: cfg.countCap },
    };
    const sort = this.sortOption(plan);
    if (sort) searchStage.sort = sort;

    const pipeline: any[] = [
      { $search: searchStage },
      { $skip: plan.page.offset },
      { $limit: plan.page.limit + plan.page.spare },
      {
        $project: {
          _id: 1,
          postedBy: 1,
          geoLocation: 1,
          latitude: 1,
          longitude: 1,
          searchKeys: 1,
          score: { $meta: 'searchScore' },
        },
      },
    ];

    const metaPipeline: any[] | null = plan.page.includeTotal
      ? [
          {
            $searchMeta: {
              index: ATLAS_SEARCH_INDEX,
              compound,
              count: { type: 'lowerBound', threshold: cfg.countCap },
            },
          },
        ]
      : null;
    return { pipeline, metaPipeline };
  }

  async search(plan: SearchPlan, step: PlanStep): Promise<SearchResult> {
    const startedAt = Date.now();
    const cfg = plan.scoring.config;
    const { pipeline, metaPipeline } = this.buildPipelines(plan, step);

    const [rows, meta] = await Promise.all([
      this.adModel.aggregate(pipeline).exec(),
      metaPipeline ? this.adModel.aggregate(metaPipeline).exec() : Promise.resolve(null),
    ]);

    const origin = plan.scoring.origin;
    const entityKeys = new Set(step.candidates.entityKeys);
    const hits: SearchHit[] = (rows as any[]).map((r) => {
      const coords: [number, number] | undefined = Array.isArray(r.geoLocation?.coordinates)
        ? (r.geoLocation.coordinates as [number, number])
        : typeof r.longitude === 'number' && typeof r.latitude === 'number'
          ? [r.longitude, r.latitude]
          : undefined;
      return {
        id: r._id,
        score: typeof r.score === 'number' ? r.score : 0,
        distanceKm: origin && coords ? distanceKmBetween(origin, { lng: coords[0], lat: coords[1] }) : null,
        postedBy: r.postedBy ? String(r.postedBy) : undefined,
        structuredHit:
          entityKeys.size > 0 && Array.isArray(r.searchKeys)
            ? r.searchKeys.some((k: string) => entityKeys.has(k))
            : false,
      };
    });

    let total: number | undefined;
    let totalCapped: boolean | undefined;
    if (meta) {
      const count = (meta as any[])[0]?.count ?? {};
      const n = typeof count.lowerBound === 'number' ? count.lowerBound : count.total ?? 0;
      totalCapped = n >= cfg.countCap;
      total = Math.min(n, cfg.countCap);
    }
    const distances = hits.map((h) => h.distanceKm).filter((d): d is number => typeof d === 'number');
    return {
      hits,
      total,
      totalCapped,
      nearestKm: distances.length ? Math.min(...distances) : undefined,
      engine: 'atlas',
      queryMs: Date.now() - startedAt,
    };
  }

  // ---------------------------------------------------------------------------

  buildCompound(plan: SearchPlan, step: PlanStep): Record<string, any> {
    const cfg = plan.scoring.config;
    const f = step.filters;
    const filter: any[] = [
      { equals: { path: 'isActive', value: true } },
      { equals: { path: 'isApproved', value: true } },
    ];
    const mustNot: any[] = [
      { equals: { path: 'isDeleted', value: true } },
      { equals: { path: 'soldOut', value: true } },
    ];

    if (f.categories?.length) filter.push({ in: { path: 'category', value: f.categories } });
    const range = (path: string, r?: { min?: number; max?: number }) => {
      if (!r) return;
      const q: Record<string, any> = { path };
      if (r.min !== undefined) q.gte = r.min;
      if (r.max !== undefined) q.lte = r.max;
      if (q.gte !== undefined || q.lte !== undefined) filter.push({ range: q });
    };
    range('price', f.price);
    range('vehicleYear', f.vehicleYear);
    range('bedrooms', f.bedrooms);
    range('areaSqft', f.areaSqft);
    if (f.geoWithin) {
      filter.push({
        geoWithin: {
          path: 'geoLocation',
          circle: {
            center: { type: 'Point', coordinates: [f.geoWithin.lng, f.geoWithin.lat] },
            radius: f.geoWithin.radiusKm * 1000,
          },
        },
      });
    }
    if (f.locationText) filter.push({ phrase: { path: 'location', query: f.locationText } });
    for (const group of f.keyGroups) {
      if (group.length) filter.push({ in: { path: 'searchKeys', value: group } });
    }
    // Legacy $lookup filters cannot be expressed inside $search: the factory
    // routes plans that need them to the Mongo adapter (see needsLegacy()).

    // ---- candidates (at least one must match) ----
    const candidates: any[] = [];
    if (step.candidates.entityKeys.length) {
      candidates.push({
        in: { path: 'searchKeys', value: step.candidates.entityKeys },
        score: { boost: { value: cfg.entityBoost } },
      });
    }
    if (step.candidates.text) {
      const longest = Math.max(...step.candidates.text.split(' ').map((w) => w.length), 0);
      candidates.push({
        text: {
          query: step.candidates.text,
          path: ['searchText', 'title', 'description'],
          fuzzy: { maxEdits: longest >= 6 ? 2 : 1, prefixLength: 1 },
        },
      });
    }
    const must: any[] = [];
    if (candidates.length) must.push({ compound: { should: candidates, minimumShouldMatch: 1 } });

    // ---- boosts (reorder only) ----
    const should: any[] = [];
    for (const k of step.boosts.keys) {
      should.push({ in: { path: 'searchKeys', value: [k.key] }, score: { constant: { value: k.weight } } });
    }
    if (step.boosts.exactYear) {
      const y = step.boosts.exactYear;
      should.push({ equals: { path: 'vehicleYear', value: y.year }, score: { constant: { value: y.weight } } });
      should.push({
        range: { path: 'vehicleYear', gte: y.year - 1, lte: y.year + 1 },
        score: { constant: { value: y.nearWeight } },
      });
    }
    for (const w of step.boosts.words.slice(0, 8)) {
      should.push({
        text: { query: w, path: ['searchText', 'title'] },
        score: { constant: { value: step.boosts.wordWeight } },
      });
    }
    if (plan.scoring.origin) {
      should.push({
        near: {
          path: 'geoLocation',
          origin: { type: 'Point', coordinates: [plan.scoring.origin.lng, plan.scoring.origin.lat] },
          pivot: cfg.atlas.distancePivotMeters,
        },
        score: { boost: { value: plan.sort.by === 'distance' ? 50 : 3 } },
      });
    }
    should.push({
      near: { path: 'createdAt', origin: new Date(), pivot: cfg.atlas.freshnessPivotMs },
      score: { boost: { value: 2 } },
    });

    const compound: Record<string, any> = { filter, mustNot };
    if (must.length) compound.must = must;
    if (should.length) compound.should = should;
    return compound;
  }

  /** Explicit sorts Atlas can do natively; scored order needs none. */
  private sortOption(plan: SearchPlan): Record<string, 1 | -1> | undefined {
    const dir: 1 | -1 = plan.sort.order === 'ASC' ? 1 : -1;
    switch (plan.sort.by) {
      case 'price':
        return { price: dir };
      case 'createdAt':
        return { createdAt: dir };
      case 'year':
        return { vehicleYear: dir };
      default:
        return undefined;
    }
  }

  /** True when the step carries explicit filters only the legacy $lookup path can apply. */
  static needsLegacy(step: PlanStep): boolean {
    return Object.keys(step.filters.legacy ?? {}).length > 0;
  }
}
