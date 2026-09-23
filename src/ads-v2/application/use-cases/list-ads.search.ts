import { Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { ListAdsV2Dto } from '../../dto/list-ads-v2.dto';
import { DetailedAdResponseDto } from '../../../ads/dto/common/ad-response.dto';
import { SearchQueryService } from '../../../search/services/search-query.service';
import { ParsedQuery } from '../../../search/dto/parsed-query';
import { SearchPlanner } from '../../../search/planner/search-planner';
import { PlanStep, SearchPlan } from '../../../search/planner/search-plan';
import { SearchEngineFactory } from '../../../search/adapters/search-engine.factory';
import { SearchHit, SearchResult } from '../../../search/ports/search-index.port';
import { SearchEventsService } from '../../../search/events/search-events.service';
import { ScoringConfig, loadScoringConfig } from '../../../search/scoring/scoring.config';
import { applySellerDiversity } from '../../../search/scoring/diversity';

/** What the app gets back for a search (superset of the feed response). */
export type SearchQueryBlock = {
  eventId: string;
  original: string;
  normalized: string;
  remaining: string;
  corrections: { from: string; to: string }[];
  parsed: {
    category?: string;
    brands?: string[];
    models?: string[];
    year?: number;
    minYear?: number;
    maxYear?: number;
    minPrice?: number;
    maxPrice?: number;
    location?: { kind: string; slug: string; displayName: string };
  };
  strength: string;
  strategy: string;
  engine: string;
  fallbackUsed: boolean;
  relaxations: { dropped: string; reason: string }[];
  conflicts: SearchPlan['conflicts'];
  radius: { requestedKm: number | null; nearestResultKm: number | null };
  totalCapped: boolean;
  chips: ParsedQuery['chips'];
  // Legacy fields kept for the current app build.
  raw: string;
  freeText: string;
  confidence: number;
  applied: boolean;
  debug?: Record<string, unknown>;
};

export interface SearchListResponse {
  data: DetailedAdResponseDto[];
  total?: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  cachedAt: number;
  query: SearchQueryBlock;
}

export interface SearchContext {
  userId?: string;
  sessionId?: string;
  debug?: boolean;
}

export type Hydrator = (ids: Types.ObjectId[]) => Promise<DetailedAdResponseDto[]>;

const SEARCH_CACHE_TTL_SEC = 60;

/**
 * The tier-1 search path (audit §C.2): parse → plan → one engine query per
 * step (stop at the first non-empty) → seller diversity → hydrate → respond,
 * with a 60 s response cache and fire-and-forget event logging.
 *
 * Owns nothing about documents: hydration is a callback supplied by
 * ListAdsUc so the response shape stays byte-identical to the feed's.
 */
@Injectable()
export class SearchAdsExecutor {
  private readonly logger = new Logger(SearchAdsExecutor.name);
  private readonly scoring: ScoringConfig = loadScoringConfig();

  constructor(
    private readonly cache: AdsCache,
    private readonly planner: SearchPlanner,
    private readonly engines: SearchEngineFactory,
    private readonly events: SearchEventsService,
    @Optional() private readonly parser?: SearchQueryService,
  ) {}

  /** SEARCH_V3_RETRIEVAL=true turns this path on; anything else keeps the legacy path. */
  isEnabled(): boolean {
    return (process.env.SEARCH_V3_RETRIEVAL ?? '').toLowerCase() === 'true';
  }

  private parserEnabled(): boolean {
    return (process.env.SEARCH_PARSER_ENABLED ?? '').toLowerCase() === 'true';
  }

  private keysFiltersEnabled(): boolean {
    return (process.env.SEARCH_KEYS_FILTERS ?? '').toLowerCase() === 'true';
  }

  async exec(filters: ListAdsV2Dto, ctx: SearchContext, hydrate: Hydrator): Promise<SearchListResponse> {
    const startedAt = Date.now();
    const search = (filters.search ?? '').trim();

    // ---- parse ----
    let parsed: ParsedQuery | undefined;
    let parseMs = 0;
    if (this.parser && this.parserEnabled()) {
      const t = Date.now();
      try {
        parsed = await this.parser.parse(search);
      } catch (err) {
        this.logger.warn(`Search parse failed, running text-only: ${(err as Error).message}`);
      }
      parseMs = Date.now() - t;
    }

    // ---- plan ----
    const plan = this.planner.plan(filters, parsed, {
      keysFilters: this.keysFiltersEnabled(),
      scoring: this.scoring,
    });
    const engine = this.engines.get();
    const eventId = this.events.newEventId();
    const cacheKey = this.cacheKey(plan, engine.name);

    // ---- cache ----
    const cached = await this.cache.get<SearchListResponse>(cacheKey).catch(() => null);
    if (cached) {
      const response: SearchListResponse = {
        ...cached,
        query: { ...cached.query, eventId: String(eventId) },
      };
      this.events.record({
        eventId,
        plan,
        result: null,
        resultCount: response.data.length,
        latencyMs: Date.now() - startedAt,
        fallbackUsed: response.query.fallbackUsed,
        relaxations: response.query.relaxations.map((r) => r.dropped),
        cacheHit: true,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        explicitFilterKeys: this.explicitFilterKeys(filters),
        geoBucket: this.geoBucket(plan),
      });
      return response;
    }

    // ---- retrieve: first non-empty step wins ----
    let result: SearchResult | null = null;
    let usedStep: PlanStep | null = null;
    const stepTimings: { relaxation?: string; ms: number; returned: number }[] = [];
    for (const step of plan.steps) {
      const r = await engine.search(plan, step);
      stepTimings.push({ relaxation: step.relaxation?.dropped, ms: r.queryMs, returned: r.hits.length });
      result = r;
      usedStep = step;
      if (r.hits.length > 0) break;
    }
    const hits: SearchHit[] = result?.hits ?? [];
    const relaxations =
      usedStep?.relaxation && hits.length > 0
        ? [{ dropped: usedStep.relaxation.dropped, reason: usedStep.relaxation.reason }]
        : [];

    // ---- page composition ----
    const { limit, page, offset } = plan.page;
    const pageHits =
      page === 1
        ? applySellerDiversity(hits, limit, this.scoring.diversityPerSellerPage1, (h) => h.postedBy)
        : hits.slice(0, limit);
    const data = pageHits.length ? await hydrate(pageHits.map((h) => h.id)) : [];

    const total = result?.total;
    const totalCapped = !!result?.totalCapped;
    const hasNext =
      hits.length > limit ||
      (total !== undefined && !totalCapped ? offset + limit < total : pageHits.length === limit);
    const totalPages = total !== undefined ? Math.ceil(total / limit) : undefined;

    const engineFellBack = engine.name === 'atlas' && result?.engine === 'mongo';
    const response: SearchListResponse = {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev: page > 1,
      nextCursor: null,
      prevCursor: null,
      cachedAt: Date.now(),
      query: this.queryBlock({
        eventId,
        plan,
        parsed,
        result,
        relaxations,
        engineFellBack,
        requestedKm: filters.maxDistance ?? null,
        debug: ctx.debug
          ? {
              parseMs,
              engine: result?.engine,
              configuredEngine: engine.name,
              steps: stepTimings,
              spareFetched: hits.length,
              scoring: {
                distanceSigmaKm: this.scoring.distanceSigmaKm,
                freshnessHalfLifeDays: this.scoring.freshnessHalfLifeDays,
                diversityPerSellerPage1: this.scoring.diversityPerSellerPage1,
              },
              topHits: pageHits.slice(0, 5).map((h) => ({
                id: String(h.id),
                score: Number(h.score.toFixed(4)),
                distanceKm: h.distanceKm ?? null,
                structuredHit: h.structuredHit ?? false,
              })),
            }
          : undefined,
      }),
    };

    // Cache before per-user data is applied; the caller adds isFavorite.
    this.cache.setList(cacheKey, response, SEARCH_CACHE_TTL_SEC).catch(() => undefined);

    this.events.record({
      eventId,
      plan,
      result,
      resultCount: data.length,
      latencyMs: Date.now() - startedAt,
      fallbackUsed: engineFellBack || relaxations.length > 0,
      relaxations: relaxations.map((r) => r.dropped),
      cacheHit: false,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      explicitFilterKeys: this.explicitFilterKeys(filters),
      geoBucket: this.geoBucket(plan),
    });

    return response;
  }

  // ---------------------------------------------------------------------------

  private queryBlock(input: {
    eventId: Types.ObjectId;
    plan: SearchPlan;
    parsed?: ParsedQuery;
    result: SearchResult | null;
    relaxations: { dropped: string; reason: string }[];
    engineFellBack: boolean;
    requestedKm: number | null;
    debug?: Record<string, unknown>;
  }): SearchQueryBlock {
    const { plan, parsed, result } = input;
    const location = parsed?.location
      ? { kind: parsed.location.kind, slug: parsed.location.slug, displayName: parsed.location.displayName }
      : undefined;
    return {
      eventId: String(input.eventId),
      original: plan.original,
      normalized: parsed?.normalized ?? plan.original.toLowerCase(),
      remaining: parsed?.freeText ?? '',
      corrections: (parsed?.corrections ?? []).map((c) => ({ from: c.from, to: c.to })),
      parsed: {
        category: parsed?.category,
        brands: parsed?.manufacturerNames,
        models: parsed?.modelNames,
        year: parsed?.exactYear,
        minYear: parsed?.exactYear === undefined ? parsed?.minYear : undefined,
        maxYear: parsed?.maxYear,
        minPrice: parsed?.minPrice,
        maxPrice: parsed?.maxPrice,
        location,
      },
      strength: parsed?.strength ?? 'none',
      strategy: plan.strategy,
      engine: result?.engine ?? 'none',
      fallbackUsed: input.engineFellBack || input.relaxations.length > 0,
      relaxations: input.relaxations,
      conflicts: plan.conflicts,
      radius: {
        requestedKm: input.requestedKm,
        nearestResultKm: result?.nearestKm !== undefined ? Number(result.nearestKm.toFixed(1)) : null,
      },
      totalCapped: !!result?.totalCapped,
      chips: parsed?.chips ?? [],
      raw: plan.original,
      freeText: parsed?.freeText ?? plan.original.toLowerCase(),
      confidence: parsed?.confidence ?? 0,
      applied: plan.strategy !== 'text',
      debug: input.debug,
    };
  }

  /** Deterministic key over everything that changes the result set or order. */
  private cacheKey(plan: SearchPlan, engine: string): string {
    const bucket = this.geoBucket(plan);
    const material = JSON.stringify({
      e: engine,
      s: plan.steps.map((st) => ({
        f: { ...st.filters, legacy: st.filters.legacy },
        c: st.candidates,
        b: st.boosts,
      })),
      sort: plan.sort,
      page: { p: plan.page.page, l: plan.page.limit, t: plan.page.includeTotal },
      o: bucket,
      v: 1,
    });
    const hash = createHash('sha1').update(material).digest('hex').slice(0, 24);
    return `ads:v2:search:${hash}`;
  }

  private geoBucket(plan: SearchPlan): string | undefined {
    const o = plan.scoring.origin;
    if (!o) return undefined;
    return `${o.lat.toFixed(2)}:${o.lng.toFixed(2)}`;
  }

  private explicitFilterKeys(filters: ListAdsV2Dto): string[] {
    const keys: string[] = [];
    const f: any = filters;
    for (const k of [
      'category', 'location', 'maxDistance', 'minPrice', 'maxPrice', 'manufacturerIds', 'modelIds',
      'fuelTypeIds', 'transmissionTypeIds', 'minYear', 'maxYear', 'propertyTypes', 'listingType',
      'minBedrooms', 'maxBedrooms', 'minArea', 'maxArea', 'isFurnished', 'hasParking',
      'commercialVehicleTypes', 'sortBy',
    ]) {
      const v = f[k];
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (k === 'sortBy' && v === 'createdAt') continue;
      keys.push(k);
    }
    if (typeof f.latitude === 'number' && typeof f.longitude === 'number') keys.push('geo');
    return keys;
  }
}
