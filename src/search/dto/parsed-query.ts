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
  | 'bedrooms'
  | 'correction';

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
   * budgets ("5 lakh" with no "under") and category hints from a seed word with
   * no catalogue match are the main cases. The UI may render these differently;
   * removing one is always allowed.
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

/** A typo the parser corrected against the lexicon before matching. */
export interface Correction {
  from: string;
  to: string;
  via: 'edit' | 'phonetic';
  /** Span of the ORIGINAL token in the raw query. */
  sourceSpan: [number, number];
}

/**
 * How much of the query the parser understood, and how.
 *
 *  strong   — every meaningful word is a catalogue entity (brand/model/variant),
 *             an attribute, a number or a place, with no ambiguity: "creta",
 *             "hyundai creta 2020 petrol".
 *  partial  — a catalogue entity plus words the lexicon does not know: "red creta".
 *  category — no catalogue entity, but most words are category / property-type /
 *             listing / location / numeric words: "cars in kochi", "2bhk flat".
 *  weak     — only a seed hint with no catalogue match, or only a minority of the
 *             words recognised: "creta" on an unmaterialised lexicon,
 *             "car wash service center".
 *  none     — nothing recognised.
 */
export type QueryStrength = 'strong' | 'partial' | 'category' | 'weak' | 'none';

/** Where the parsed category came from. */
export type CategorySource = 'seed' | 'hint' | 'entity' | 'implied';

/**
 * The parser's whole output. Everything here is a *suggestion*: the caller
 * merges it under any filter the user set explicitly, which always wins.
 */
export interface ParsedQuery {
  raw: string;
  /** Lowercased, transliterated, single-spaced form of the WHOLE query. Never loses a word. */
  normalized: string;

  category?: AdCategoryV2;
  categorySource?: CategorySource;
  /**
   * Categories a matched brand sells in, when the brand alone could not decide
   * the category (Honda: cars AND bikes). The planner filters on this set when
   * `category` is unset.
   */
  brandCategories?: AdCategoryV2[];
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
  /**
   * A bare year the user typed ("creta 2020"). `minYear` is still set for the
   * legacy filter path; the planner treats this as an exact-year BOOST instead.
   */
  exactYear?: number;
  bedrooms?: number;

  /**
   * Tokens the lexicon did not claim, plus tokens claimed only by a seed hint.
   * Legacy `$text` term for the pre-planner list path; never a hard filter.
   */
  freeText: string;
  /**
   * What the text clause of the hybrid query should search: every token except
   * the ones that became structural filters (category words, property types,
   * listing words, places, money, BHK). Entity, attribute and unknown tokens
   * are kept, with spelling corrections applied. Empty means "no text clause".
   */
  textQuery: string;

  /** True when a brand, model or variant from the catalogue matched (exact or corrected). */
  catalogueMatch: boolean;
  strength: QueryStrength;
  corrections: Correction[];

  chips: SearchChip[];
  ambiguities: Ambiguity[];

  /** 0..1 — share of meaningful tokens the parser understood. */
  confidence: number;

  /**
   * Legacy flag for the pre-planner list path. False when confidence is too low
   * to filter on, when the match is only a seed hint, or when a catalogue entity
   * matched but no category could be derived for it (the legacy path would
   * silently drop the entity filter). The planner does not use this.
   */
  applyAsFilter: boolean;
}

/** Below this, structured hints become ranking boosts rather than filters. */
export const MIN_FILTER_CONFIDENCE = 0.34;

/** At or above this share of recognised words a non-catalogue query is 'category' strength. */
export const CATEGORY_STRENGTH_SHARE = 0.5;

export function emptyParsedQuery(raw: string): ParsedQuery {
  return {
    raw,
    normalized: '',
    freeText: '',
    textQuery: '',
    catalogueMatch: false,
    strength: 'none',
    corrections: [],
    chips: [],
    ambiguities: [],
    confidence: 0,
    applyAsFilter: false,
  };
}
