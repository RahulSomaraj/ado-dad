import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SearchTermDocument = SearchTerm & Document;

/**
 * What a lexicon entry means once it is matched in a query.
 *
 * Order matters only as documentation; the numeric `weight` on each term is what
 * actually resolves a tie when two entries claim the same n-gram.
 */
export enum SearchTermType {
  CATEGORY = 'category',
  PROPERTY_TYPE = 'property_type',
  LISTING_TYPE = 'listing_type',
  MANUFACTURER = 'manufacturer',
  MODEL = 'model',
  VARIANT = 'variant',
  FUEL_TYPE = 'fuel_type',
  TRANSMISSION = 'transmission',
  CV_TYPE = 'commercial_vehicle_type',
  ATTRIBUTE = 'attribute',
}

/** Default weights by type. A seed may override per term. */
export const DEFAULT_TERM_WEIGHT: Record<SearchTermType, number> = {
  [SearchTermType.CATEGORY]: 100,
  [SearchTermType.PROPERTY_TYPE]: 95,
  [SearchTermType.LISTING_TYPE]: 90,
  [SearchTermType.VARIANT]: 85,
  [SearchTermType.MODEL]: 80,
  [SearchTermType.MANUFACTURER]: 75,
  [SearchTermType.CV_TYPE]: 70,
  [SearchTermType.FUEL_TYPE]: 60,
  [SearchTermType.TRANSMISSION]: 60,
  [SearchTermType.ATTRIBUTE]: 50,
};

/**
 * Payload shapes per type. Kept as a loose record on the document (Mongo) but
 * narrowed here so the parser can read fields without casting everywhere.
 */
export interface SearchTermPayload {
  /** CATEGORY, and implied by MODEL / PROPERTY_TYPE / CV_TYPE. */
  category?: string;
  /** PROPERTY_TYPE — the PropertyTypeEnum value. */
  propertyType?: string;
  /** LISTING_TYPE — 'rent' | 'sell'. */
  listingType?: string;
  /** CV_TYPE — commercial vehicle type slug. */
  commercialVehicleType?: string;

  /** MANUFACTURER / MODEL / VARIANT — ObjectId strings from vehicle-inventory. */
  manufacturerId?: string;
  /**
   * MANUFACTURER — every manufacturer document that shares this name. The
   * catalogue keeps one document per (brand, vehicle category), so "honda" is
   * two ids (cars, bikes). `manufacturerId` is the first of them.
   */
  manufacturerIds?: string[];
  manufacturerName?: string;
  modelId?: string;
  /** MODEL / VARIANT — every catalogue model this phrase names (duplicates merged). */
  modelIds?: string[];
  modelName?: string;
  variantId?: string;
  /** VARIANT — every catalogue variant this phrase names (duplicates merged). */
  variantIds?: string[];
  variantName?: string;

  fuelTypeId?: string;
  fuelTypeName?: string;
  transmissionTypeId?: string;
  transmissionTypeName?: string;

  /** Human label used on the UI chip. Falls back to the term itself. */
  label?: string;

  /**
   * MANUFACTURER — every ad category this brand's catalogue models fall under
   * (Honda: private_vehicle AND two_wheeler). Written by the materializer so
   * the parser never has to guess a category for a brand-only query.
   */
  categories?: string[];

  /**
   * Seed rows that only HINT at a category ("creta" → Cars) and must never be
   * treated as a catalogue match. The materialized MODEL row for the same
   * phrase, when it exists, is what carries the model id.
   */
  hintOnly?: boolean;
}

/**
 * One searchable phrase. A phrase may appear more than once with different
 * payloads — e.g. `bullet` is both a two-wheeler category hint and a Royal
 * Enfield model hint, so both documents exist and both payloads are applied.
 */
@Schema({ timestamps: true, collection: 'search_terms' })
export class SearchTerm {
  /** Normalized phrase: lowercase, punctuation stripped, single-spaced. */
  @Prop({ required: true, trim: true, index: true })
  term: string;

  /** Number of whitespace-separated tokens in `term`. Drives the n-gram scan. */
  @Prop({ required: true, min: 1 })
  tokenCount: number;

  @Prop({ required: true, enum: SearchTermType, index: true })
  type: SearchTermType;

  @Prop({ type: Object, required: true })
  payload: SearchTermPayload;

  @Prop({ default: 50 })
  weight: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  /**
   * 'seed' for hand-curated entries, 'inventory' for entries materialized from
   * vehicle-inventory. The materializer only ever deletes/replaces its own rows,
   * so a curated alias is never clobbered by a nightly rebuild.
   */
  @Prop({ required: true, enum: ['seed', 'inventory', 'mined'], default: 'seed' })
  source: string;
}

export const SearchTermSchema = SchemaFactory.createForClass(SearchTerm);

// The parser's only read pattern: "give me every active term of this token count
// matching this exact phrase".
SearchTermSchema.index({ tokenCount: 1, term: 1, isActive: 1 }, { background: true });
// Materializer housekeeping.
SearchTermSchema.index({ source: 1, type: 1 }, { background: true });
// A phrase may repeat across types, but never within one type + payload source.
SearchTermSchema.index(
  { term: 1, type: 1, source: 1 },
  { unique: true, background: true },
);
