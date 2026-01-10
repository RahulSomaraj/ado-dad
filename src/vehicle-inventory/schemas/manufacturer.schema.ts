import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ManufacturerDocument = Manufacturer & Document;

@Schema({ timestamps: true })
export class Manufacturer {
  @Prop({ required: true, trim: true })
  name: string; // Not unique alone - can have same name for different vehicle categories

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  originCountry: string;

  @Prop({ required: false })
  description?: string;

  @Prop({
    required: true,
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

  @Prop({ default: false })
  isPremium: boolean;

  @Prop({
    required: false,
    enum: [
      'passenger_car',
      'two_wheeler',
      'commercial_vehicle',
      'luxury',
      'suv',
    ],
    default: 'passenger_car',
  })
  vehicleCategory: string; // Single vehicle category - same manufacturer name can exist for different categories (default: passenger_car)

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const ManufacturerSchema = SchemaFactory.createForClass(Manufacturer);

// Indexes for fast lookups
ManufacturerSchema.index({ isActive: 1, isDeleted: 1 });
ManufacturerSchema.index({ originCountry: 1 });
ManufacturerSchema.index({ foundedYear: 1 });
ManufacturerSchema.index({ headquarters: 1 });
ManufacturerSchema.index({ vehicleCategory: 1 }); // Index for category filtering
// Compound unique index: same manufacturer name can exist but not for the same vehicle category
ManufacturerSchema.index({ name: 1, vehicleCategory: 1 }, { unique: true });
ManufacturerSchema.index({
  name: 'text',
  displayName: 'text',
  description: 'text',
  originCountry: 'text',
  headquarters: 'text',
});

// Index for efficient case-insensitive sorting by name (default sort)
// This matches the query: .find({ isDeleted: false }).sort({ name: 1 }).collation(...)
ManufacturerSchema.index(
  { isDeleted: 1, name: 1 },
  { collation: { locale: 'en', strength: 2 } },
);
