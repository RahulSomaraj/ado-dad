import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ManufacturerDocument = Manufacturer & Document;

@Schema({ timestamps: true })
export class Manufacturer {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  originCountry: string;

  @Prop({ required: false })
  description?: string;

  @Prop({
    required: true,
    validate: (v: string) =>
      /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(v),
  })
  logo: string;

  @Prop({ required: false })
  website?: string;

  @Prop({ required: false })
  foundedYear?: number;

  @Prop({ required: false })
  headquarters?: string;

  @Prop({ default: true })
  isActive: boolean;

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const ManufacturerSchema = SchemaFactory.createForClass(Manufacturer);

// Indexes for fast lookups
ManufacturerSchema.index({ name: 1 });
ManufacturerSchema.index({ isActive: 1, isDeleted: 1 });
ManufacturerSchema.index({ originCountry: 1 });
ManufacturerSchema.index({ foundedYear: 1 });
ManufacturerSchema.index({ headquarters: 1 });
ManufacturerSchema.index({
  name: 'text',
  displayName: 'text',
  description: 'text',
  originCountry: 'text',
  headquarters: 'text',
});
