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

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ required: true, enum: AdCategory })
  category: AdCategory;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  postedBy: mongoose.Types.ObjectId;

  @Prop({ required: false, trim: true })
  title?: string;
}

export const AdSchema = SchemaFactory.createForClass(Ad);

// Indexes for fast lookups
AdSchema.index({ category: 1, createdAt: -1 });
AdSchema.index({ location: 1 });
AdSchema.index({ postedBy: 1 });
AdSchema.index({ isActive: 1 });
AdSchema.index({ price: 1 });
// Compound indexes moved from service
AdSchema.index(
  { isActive: 1, category: 1, createdAt: -1 },
  { background: true },
);
AdSchema.index({ isActive: 1, location: 1, price: 1 }, { background: true });
AdSchema.index({ postedBy: 1, isActive: 1 }, { background: true });
// Text index for search functionality - only description field exists
AdSchema.index({ description: 'text' }, { background: true });
