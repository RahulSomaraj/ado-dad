import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type AdDocument = Ad & Document;

export enum AdCategory {
  PROPERTY = 'property',
  PRIVATE_VEHICLE = 'private_vehicle',
  COMMERCIAL_VEHICLE = 'commercial_vehicle',
  TWO_WHEELER = 'two_wheeler',
}

@Schema({ timestamps: true })
export class Ad {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: [String], required: false })
  images?: string[];

  @Prop({ required: false, trim: true })
  location?: string;

  // Geographic coordinates for location-based filtering
  @Prop({ type: Number, required: false })
  latitude?: number;

  @Prop({ type: Number, required: false })
  longitude?: number;

  // GeoJSON Point for geographic queries (coordinates: [longitude, latitude])
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      required: false,
    },
  })
  geoLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  // Location hierarchy for efficient filtering (auto-populated from reverse geocoding)
  @Prop({ type: String, required: false, trim: true, index: true })
  city?: string;

  @Prop({ type: String, required: false, trim: true, index: true })
  district?: string;

  @Prop({ type: String, required: false, trim: true, index: true })
  state?: string;

  @Prop({ type: String, required: false, trim: true, index: true })
  country?: string;

  @Prop({ required: true, enum: AdCategory })
  category: AdCategory;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  soldOut: boolean;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  approvedBy?: mongoose.Types.ObjectId;

  @Prop({ type: String, required: false })
  link?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  postedBy: mongoose.Types.ObjectId;

  @Prop({ required: false, trim: true })
  title?: string;

  @Prop({ default: 0 })
  viewCount?: number;

  // Soft delete fields
  @Prop({ default: false })
  isDeleted?: boolean;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;
}

export const AdSchema = SchemaFactory.createForClass(Ad);

// Indexes for fast lookups
AdSchema.index({ category: 1, createdAt: -1 });
AdSchema.index({ location: 1 });
AdSchema.index({ postedBy: 1 });
AdSchema.index({ approvedBy: 1 });
AdSchema.index({ isActive: 1 });
AdSchema.index({ soldOut: 1 });
AdSchema.index({ isApproved: 1 });
AdSchema.index({ price: 1 });
// Compound indexes moved from service
AdSchema.index(
  { isActive: 1, category: 1, createdAt: -1 },
  { background: true },
);
AdSchema.index({ isActive: 1, location: 1, price: 1 }, { background: true });
AdSchema.index({ postedBy: 1, isActive: 1 }, { background: true });
AdSchema.index({ isApproved: 1, isActive: 1 }, { background: true });
AdSchema.index(
  { isApproved: 1, category: 1, createdAt: -1 },
  { background: true },
);
AdSchema.index({ approvedBy: 1, isApproved: 1 }, { background: true });
AdSchema.index({ link: 1 }, { background: true });
AdSchema.index({ isDeleted: 1 }, { background: true });
AdSchema.index({ postedBy: 1, isDeleted: 1 }, { background: true });
// Text index for search functionality - only description field exists
AdSchema.index({ description: 'text' }, { background: true });
// 2dsphere index for geographic queries (legacy latitude/longitude)
AdSchema.index({ latitude: 1, longitude: 1 }, { background: true });
// 2dsphere index for GeoJSON location queries (MUST be first for $geoNear)
AdSchema.index({ geoLocation: '2dsphere' }, { background: true });
// Location hierarchy indexes for efficient filtering
AdSchema.index(
  { country: 1, state: 1, district: 1, city: 1 },
  { background: true },
);
AdSchema.index({ state: 1, district: 1 }, { background: true });
AdSchema.index({ country: 1, state: 1 }, { background: true });
// Compound index for location hierarchy + visibility
AdSchema.index(
  { isDeleted: 1, isApproved: 1, country: 1, state: 1, district: 1 },
  { background: true },
);
// Compound index for admin queries (isDeleted + createdAt sort)
AdSchema.index({ isDeleted: 1, createdAt: -1 }, { background: true });
// Note: Cannot create compound index with 2dsphere - MongoDB only allows ONE 2dsphere index per collection
// The simple { geoLocation: '2dsphere' } index above is sufficient for $geoNear
// Visibility filters (isDeleted, isApproved) are applied in $geoNear query itself
