import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransmissionTypeDocument = TransmissionType & Document;

@Schema({ timestamps: true })
export class TransmissionType {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  icon?: string;

  @Prop({ required: false })
  abbreviation?: string; // e.g., "MT", "AT", "AMT"

  @Prop({ required: false })
  type?: string; // e.g., 'manual', 'automatic', 'cvt', 'dual_clutch'

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

export const TransmissionTypeSchema =
  SchemaFactory.createForClass(TransmissionType);

// Indexes for fast lookups
TransmissionTypeSchema.index({ isActive: 1, isDeleted: 1 });
TransmissionTypeSchema.index({ sortOrder: 1 });
