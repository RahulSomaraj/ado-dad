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
// Text index for search functionality - only description field exists
AdSchema.index({ description: 'text' }, { background: true });
// 2dsphere index for geographic queries
AdSchema.index({ latitude: 1, longitude: 1 }, { background: true });
