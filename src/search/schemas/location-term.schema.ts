import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationTermDocument = LocationTerm & Document;

export enum LocationKind {
  CITY = 'city',
  DISTRICT = 'district',
  STATE = 'state',
  COUNTRY = 'country',
}

/** More specific kinds win when the same phrase matches several. */
export const LOCATION_KIND_WEIGHT: Record<LocationKind, number> = {
  [LocationKind.CITY]: 80,
  [LocationKind.DISTRICT]: 70,
  [LocationKind.STATE]: 50,
  [LocationKind.COUNTRY]: 30,
};

/**
 * The gazetteer. One document per *spelling* — "kollam" and "quilon" are two
 * documents that share `slug: 'kollam'`, which is what makes alias resolution
 * symmetric ("activa quilon" and "activa kollam" produce the same filter).
 *
 * The slug is what gets written onto `Ad.citySlug` / `Ad.districtSlug` in S3, so
 * a match here becomes an index-backed equality filter rather than a regex.
 */
@Schema({ timestamps: true, collection: 'location_terms' })
export class LocationTerm {
  /** Normalized spelling as typed. */
  @Prop({ required: true, trim: true, index: true })
  term: string;

  @Prop({ required: true, min: 1 })
  tokenCount: number;

  /** Canonical slug shared by every alias of the same place. */
  @Prop({ required: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, enum: LocationKind, index: true })
  kind: LocationKind;

  /** Display form for the UI chip, e.g. "Kollam". */
  @Prop({ required: true, trim: true })
  displayName: string;

  /** Parent hierarchy, as slugs. A district has no `district` of its own. */
  @Prop({ trim: true })
  district?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true, default: 'india' })
  country?: string;

  /** [longitude, latitude] — used to centre the map and to rank by proximity. */
  @Prop({ type: [Number] })
  centroid?: [number, number];

  /** Suggested radius when this place is used as a geo centre rather than a slug filter. */
  @Prop()
  radiusKmHint?: number;

  @Prop({ default: 60 })
  weight: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ required: true, enum: ['seed', 'derived'], default: 'seed' })
  source: string;
}

export const LocationTermSchema = SchemaFactory.createForClass(LocationTerm);

LocationTermSchema.index(
  { tokenCount: 1, term: 1, isActive: 1 },
  { background: true },
);
LocationTermSchema.index({ slug: 1, kind: 1 }, { background: true });
LocationTermSchema.index(
  { term: 1, kind: 1, source: 1 },
  { unique: true, background: true },
);
