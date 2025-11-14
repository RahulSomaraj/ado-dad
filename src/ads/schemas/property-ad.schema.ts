import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyAdDocument = PropertyAd & Document;

export enum PropertyTypeEnum {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  VILLA = 'villa',
  PLOT = 'plot',
  COMMERCIAL = 'commercial',
  OFFICE = 'office',
  SHOP = 'shop',
  WAREHOUSE = 'warehouse',
}

export enum AdListingType {
  RENT = 'rent',
  SELL = 'sell',
}


@Schema({ timestamps: true })
export class PropertyAd {
  @Prop({ required: true, ref: 'Ad', type: Types.ObjectId })
  ad: Types.ObjectId;

  @Prop({ required: true, enum: PropertyTypeEnum })
  propertyType: PropertyTypeEnum;

  @Prop({ required: false, min: 0 })
  bedrooms: number;

  @Prop({ required: false, min: 0 })
  bathrooms: number;

  @Prop({required:false})
  listingType:AdListingType

  @Prop({ required: true, min: 0 })
  areaSqft: number;

  @Prop({ required: false, min: 0 })
  floor?: number;

  @Prop({ default: false })
  isFurnished: boolean;

  @Prop({ default: false })
  hasParking: boolean;

  @Prop({ default: false })
  hasGarden: boolean;

  @Prop({ type: [String], required: false })
  amenities?: string[];
}

export const PropertyAdSchema = SchemaFactory.createForClass(PropertyAd);

// Indexes for fast lookups
PropertyAdSchema.index({ ad: 1 }, { unique: true });
PropertyAdSchema.index({ propertyType: 1 });
PropertyAdSchema.index({ bedrooms: 1 });
PropertyAdSchema.index({ bathrooms: 1 });
PropertyAdSchema.index({ areaSqft: 1 });
PropertyAdSchema.index({ isFurnished: 1 });
PropertyAdSchema.index({ hasParking: 1 });
PropertyAdSchema.index({ hasGarden: 1 });
// Compound common query pattern
PropertyAdSchema.index(
  { ad: 1, propertyType: 1, bedrooms: 1, bathrooms: 1 },
  { background: true },
);
