/**
 * Ranking parameters for the hybrid search. Everything a product person might
 * want to tune lives here, and nothing else does: the adapters read these
 * values, they never hard-code their own.
 *
 * Defaults agreed 22 Sep 2026 (audit §I, D9). Tier 2 tunes them from
 * `search_events` click data. Tests assert ORDERING, not exact numbers, so the
 * Mongo and Atlas adapters may implement the same shape with different curves.
 */
export interface ScoringConfig {
  /** Score for an ad matched through a structured entity key (model/brand). */
  entityBoost: number;
  /** Text relevance is clamped to this before scaling, so a wall of repeated words can't outrank an entity match. */
  textMax: number;
  /** Multiplier applied to the clamped text score. */
  textScale: number;
  /** Attribute boosts (added to relevance). */
  boosts: {
    exactYear: number;
    nearYear: number;
    fuel: number;
    transmission: number;
    variant: number;
    brand: number;
    word: number;
  };
  /** Gaussian distance decay: exp(-(km/sigma)^2), floored. */
  distanceSigmaKm: number;
  distanceFloor: number;
  /** Exponential freshness decay: 0.5^(ageDays/halfLife), floored. */
  freshnessHalfLifeDays: number;
  freshnessFloor: number;
  /** Seller quality multipliers. */
  sellerVerifiedMultiplier: number;
  noImageMultiplier: number;
  /** Max ads per seller on page 1 before the rest are pushed to the tail. */
  diversityPerSellerPage1: number;
  /** Mongo adapter only: cap on candidates scored for weak/unknown queries. */
  candidateCap: number;
  /** Counts stop here and report `totalCapped: true`. */
  countCap: number;
  /** Deepest page a scored search will serve. */
  pageCap: number;
  /** Atlas adapter: `near` pivots (reciprocal decay), same intent as the Gaussian above. */
  atlas: {
    distancePivotMeters: number;
    freshnessPivotMs: number;
  };
}

export const DEFAULT_SCORING: ScoringConfig = {
  entityBoost: 10,
  textMax: 10,
  textScale: 0.8,
  boosts: {
    exactYear: 3,
    nearYear: 1,
    fuel: 2,
    transmission: 2,
    variant: 2,
    brand: 1,
    word: 1,
  },
  distanceSigmaKm: 40,
  distanceFloor: 0.05,
  freshnessHalfLifeDays: 14,
  freshnessFloor: 0.1,
  sellerVerifiedMultiplier: 1.1,
  noImageMultiplier: 0.9,
  diversityPerSellerPage1: 3,
  candidateCap: 3000,
  countCap: 1000,
  pageCap: 50,
  atlas: {
    distancePivotMeters: 20_000,
    freshnessPivotMs: 14 * 24 * 60 * 60 * 1000,
  },
};

/** Environment overrides, so a parameter can be changed without a deploy. */
export function loadScoringConfig(env: NodeJS.ProcessEnv = process.env): ScoringConfig {
  const num = (key: string, fallback: number) => {
    const raw = env[key];
    if (raw === undefined || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const d = DEFAULT_SCORING;
  return {
    ...d,
    distanceSigmaKm: num('SEARCH_DISTANCE_SIGMA_KM', d.distanceSigmaKm),
    freshnessHalfLifeDays: num('SEARCH_FRESHNESS_HALF_LIFE_DAYS', d.freshnessHalfLifeDays),
    diversityPerSellerPage1: num('SEARCH_DIVERSITY_PER_SELLER', d.diversityPerSellerPage1),
    candidateCap: num('SEARCH_CANDIDATE_CAP', d.candidateCap),
    countCap: num('SEARCH_COUNT_CAP', d.countCap),
    pageCap: num('SEARCH_PAGE_CAP', d.pageCap),
  };
}

// ---------------------------------------------------------------------------
// Pure scoring functions (used by the Mongo adapter in JS where it must, by the
// tests everywhere, and as the reference the Atlas adapter approximates).
// ---------------------------------------------------------------------------

export function distanceDecay(km: number | undefined | null, cfg: ScoringConfig = DEFAULT_SCORING): number {
  if (km === undefined || km === null || !Number.isFinite(km)) return 1;
  const v = Math.exp(-((km / cfg.distanceSigmaKm) ** 2));
  return Math.max(cfg.distanceFloor, v);
}

export function freshnessDecay(ageDays: number, cfg: ScoringConfig = DEFAULT_SCORING): number {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  const v = Math.pow(0.5, ageDays / cfg.freshnessHalfLifeDays);
  return Math.max(cfg.freshnessFloor, v);
}

export function sellerQuality(
  ad: { sellerVerified?: boolean; imageCount?: number },
  cfg: ScoringConfig = DEFAULT_SCORING,
): number {
  let q = 1;
  if (ad.sellerVerified) q *= cfg.sellerVerifiedMultiplier;
  if ((ad.imageCount ?? 0) === 0) q *= cfg.noImageMultiplier;
  return q;
}

export interface RelevanceInputs {
  structuredHit: boolean;
  textScore?: number;
  boost: number;
}

export function relevance(r: RelevanceInputs, cfg: ScoringConfig = DEFAULT_SCORING): number {
  const base = r.structuredHit
    ? cfg.entityBoost
    : Math.min(r.textScore ?? 0, cfg.textMax) * cfg.textScale;
  return base + r.boost;
}

export function totalScore(
  r: RelevanceInputs & {
    distanceKm?: number | null;
    ageDays: number;
    sellerVerified?: boolean;
    imageCount?: number;
  },
  cfg: ScoringConfig = DEFAULT_SCORING,
): number {
  return (
    relevance(r, cfg) *
    distanceDecay(r.distanceKm, cfg) *
    freshnessDecay(r.ageDays, cfg) *
    sellerQuality(r, cfg)
  );
}
