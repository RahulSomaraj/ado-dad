import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FuelTypeDocument = FuelType & Document;

@Schema({ timestamps: true })
export class FuelType {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  icon?: string;

  @Prop({ required: false })
  color?: string; // Hex color for UI representation

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number; // For ordering in dropdowns

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const FuelTypeSchema = SchemaFactory.createForClass(FuelType);

// Indexes for fast lookups
FuelTypeSchema.index({ name: 1 }, { unique: true });
FuelTypeSchema.index({ isActive: 1, isDeleted: 1 });
FuelTypeSchema.index({ sortOrder: 1 });
