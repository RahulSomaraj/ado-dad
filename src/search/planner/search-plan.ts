import { ParsedQuery } from '../dto/parsed-query';
import { ScoringConfig } from '../scoring/scoring.config';

/**
 * What the adapters execute. The planner is the only thing that builds one.
 *
 * Vocabulary:
 *  - filters    hard constraints. Every result satisfies all of them.
 *  - candidates OR-ed retrieval clauses. A result satisfies at least one.
 *  - boosts     soft signals that change order, never membership.
 *  - steps      the relaxation ladder: steps[0] runs first; steps[1] runs
 *               only if steps[0] returned nothing. Never more than two.
 */

export type SearchStrategy = 'hybrid' | 'text' | 'category' | 'feed';

export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface GeoCircle extends GeoPoint {
  radiusKm: number;
}

/**
 * `searchKeys` vocabulary written onto every ad by AdSearchDocBuilder and
 * read by the adapters. One place, so the two can never drift.
 */
export const SearchKey = {
  category: (v: string) => `cat:${v}`,
  manufacturer: (id: string) => `mfr:${id}`,
  model: (id: string) => `model:${id}`,
  variant: (id: string) => `variant:${id}`,
  fuel: (id: string) => `fuel:${id}`,
  transmission: (id: string) => `tx:${id}`,
  commercialVehicleType: (v: string) => `cvt:${v}`,
  propertyType: (v: string) => `ptype:${v}`,
  listingType: (v: string) => `listing:${v}`,
  furnished: () => 'furnished:1',
  parking: () => 'parking:1',
  district: (slug: string) => `district:${slug}`,
} as const;

export interface NumericRange {
  min?: number;
  max?: number;
}

export interface HardFilters {
  /** Allowed categories; undefined means any. Several = brand spans several. */
  categories?: string[];
  /** True when `categories` came from the client, not the parser (never relaxed). */
  categoryExplicit: boolean;
  /**
   * Groups of searchKeys. Each group is an OR ($in); the groups are AND-ed.
   * Populated from explicit client filters when SEARCH_KEYS_FILTERS is on.
   */
  keyGroups: string[][];
  price?: NumericRange;
  vehicleYear?: NumericRange;
  bedrooms?: NumericRange;
  areaSqft?: NumericRange;
  /** Hard geo circle: explicit radius from the client, or a typed place. */
  geoWithin?: GeoCircle;
  /** Legacy substring match on `ads.location` (the client's free-text `location` field). */
  locationText?: string;
  /**
   * Explicit client filters that still need the legacy $lookup path while the
   * search document backfill is incomplete (SEARCH_KEYS_FILTERS off). The
   * adapter applies them exactly as list-ads.uc.ts does today.
   */
  legacy: LegacyFilters;
}

export interface LegacyFilters {
  manufacturerIds?: string[];
  modelIds?: string[];
  fuelTypeIds?: string[];
  transmissionTypeIds?: string[];
  minYear?: number;
  maxYear?: number;
  commercialVehicleTypes?: string[];
  propertyTypes?: string[];
  listingType?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  isFurnished?: boolean;
  hasParking?: boolean;
}

export interface CandidateClauses {
  /** searchKeys that identify the parsed entities (union). Empty = no entity clause. */
  entityKeys: string[];
  /** Text to search over searchText/title/description. Empty = no text clause. */
  text: string;
}

export interface KeyBoost {
  key: string;
  weight: number;
}

export interface Boosts {
  keys: KeyBoost[];
  exactYear?: { year: number; weight: number; nearWeight: number };
  /** Unknown words; each one found in searchText/title adds `wordWeight`. */
  words: string[];
  wordWeight: number;
}

export interface ScoringSpec {
  config: ScoringConfig;
  /** Centre for the distance decay. Undefined = no distance term. */
  origin?: GeoPoint;
}

export interface Relaxation {
  dropped: 'category';
  reason: 'zero_results';
}

export interface PlanStep {
  filters: HardFilters;
  candidates: CandidateClauses;
  boosts: Boosts;
  relaxation?: Relaxation;
}

export interface Conflict {
  kind: 'category';
  /** Human-readable parsed entity, e.g. "model:Creta". */
  parsed: string;
  /** Category the parsed entity belongs to. */
  parsedCategory?: string;
  /** Category the client insisted on. */
  explicitCategory: string;
}

export interface SortSpec {
  by: 'score' | 'createdAt' | 'price' | 'year' | 'distance';
  order: 'ASC' | 'DESC';
}

export interface PageSpec {
  page: number;
  limit: number;
  offset: number;
  /** Extra rows fetched on page 1 so seller diversity can refill the page. */
  spare: number;
  includeTotal: boolean;
}

export interface SearchPlan {
  strategy: SearchStrategy;
  steps: PlanStep[];
  scoring: ScoringSpec;
  sort: SortSpec;
  page: PageSpec;
  conflicts: Conflict[];
  /** What the client asked for, before parsing (for logs and the response block). */
  original: string;
  parsed?: ParsedQuery;
}
