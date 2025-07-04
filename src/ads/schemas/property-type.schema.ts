import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyTypeDocument = PropertyType & Document;

@Schema({ timestamps: true })
export class PropertyType {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  icon?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const PropertyTypeSchema = SchemaFactory.createForClass(PropertyType);

// Indexes for fast lookups
PropertyTypeSchema.index({ isActive: 1, isDeleted: 1 });
PropertyTypeSchema.index({ sortOrder: 1 });
