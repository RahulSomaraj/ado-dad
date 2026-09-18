import { AdCategoryV2 } from '../../ads-v2/dto/create-ad-v2.dto';
import { AdListingType } from '../../ads/schemas/property-ad.schema';
import { LocationKind } from '../schemas/location-term.schema';

export type ChipKind =
  | 'category'
  | 'location'
  | 'brand'
  | 'model'
  | 'variant'
  | 'fuel'
  | 'transmission'
  | 'property_type'
  | 'listing'
  | 'cv_type'
  | 'price'
  | 'year'
  | 'bedrooms';

/**
 * One removable pill in the results header. `sourceSpan` indexes into the RAW
 * query string the user typed, so the app can strike out exactly the words that
 * produced this filter.
 */
export interface SearchChip {
  kind: ChipKind;
  label: string;
  /** Request field this chip maps to, e.g. 'category', 'maxPrice'. */
  filterKey: string;
  filterValue: unknown;
  sourceSpan: [number, number];
  /**
   * True when the parser inferred this rather than reading it literally — bare
   * budgets ("5 lakh" with no "under") are the main case. The UI may render
   * these differently; removing one is always allowed.
   */
  inferred?: boolean;
}

export interface ParsedLocation {
  kind: LocationKind;
  slug: string;
  displayName: string;
  district?: string;
  state?: string;
  centroid?: [number, number];
  radiusKmHint?: number;
}

export interface Ambiguity {
  /** The field two different readings disagreed about. */
  field: string;
  /** The reading that won. */
  chosen: unknown;
  /** The reading(s) that lost — surfaced as "did you mean". */
  alternatives: unknown[];
  /** The phrase that caused it. */
  phrase: string;
}

/**
 * The parser's whole output. Everything here is a *suggestion*: the caller
 * merges it under any filter the user set explicitly, which always wins.
 */
export interface ParsedQuery {
  raw: string;
  normalized: string;

  category?: AdCategoryV2;
  propertyTypes?: string[];
  listingType?: AdListingType;
  commercialVehicleTypes?: string[];

  manufacturerIds?: string[];
  manufacturerNames?: string[];
  modelIds?: string[];
  modelNames?: string[];
  variantIds?: string[];
  fuelTypeIds?: string[];
  transmissionTypeIds?: string[];

  location?: ParsedLocation;

  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  bedrooms?: number;

  /** Tokens the lexicon did not claim. Feeds $text; never a hard filter. */
  freeText: string;

  chips: SearchChip[];
  ambiguities: Ambiguity[];

  /** 0..1 — share of meaningful tokens the parser understood. */
  confidence: number;

  /**
   * False when confidence is too low to filter on. The caller then treats the
   * parsed category as a ranking boost instead of a `$match`, so a query like
   * "carpenter tools" is never forced into Cars.
   */
  applyAsFilter: boolean;
}

/** Below this, structured hints become ranking boosts rather than filters. */
export const MIN_FILTER_CONFIDENCE = 0.34;

export function emptyParsedQuery(raw: string): ParsedQuery {
  return {
    raw,
    normalized: '',
    freeText: '',
    chips: [],
    ambiguities: [],
    confidence: 0,
    applyAsFilter: false,
  };
}
