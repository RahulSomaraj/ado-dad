import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Category, CategorySchema } from 'src/category/schemas/category.schema';
import {
  VehicleAdv,
  VehicleAdvSchema,
} from 'src/vehicles-adv/schemas/vehicleadv.schema';
import { Property, PropertySchema } from 'src/property/schemas/schema.property';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt fields
export class Advertisement extends Document {
  @Prop({ required: true, enum: ['Vehicle', 'Property'] })
  type: string;

  @Prop({ required: true })
  adTitle: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  phoneNumber: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: [String], required: true })
  imageUrls: string[];

  @Prop({ required: false, default: 'Pending' })
  state: string;

  @Prop({ required: false, default: 'Pending' })
  city: string;

  @Prop({ required: false, default: 'Pending' })
  district: string;

  @Prop({ required: false, default: false })
  isApproved: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy: Types.ObjectId;

  // Embedded vehicle document - no dot notation in projection to preserve structure
  @Prop({ type: VehicleAdvSchema, required: false })
  vehicle: VehicleAdv;

  // Embedded property document - no dot notation in projection to preserve structure
  @Prop({ type: PropertySchema, required: false })
  property: Property;
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);

// Custom validation: Ensure that for 'Vehicle' ads, vehicle is provided and property is not,
// and for 'Property' ads, property is provided and vehicle is not.
AdvertisementSchema.pre('validate', function (next) {
  const ad = this as Advertisement;

  if (ad.type === 'Vehicle') {
    if (ad.property) {
      return next(
        new Error(
          'For Vehicle advertisements, a property object should not be provided.',
        ),
      );
    }
    if (!ad.vehicle) {
      return next(
        new Error(
          'For Vehicle advertisements, a vehicle object must be provided.',
        ),
      );
    }
  } else if (ad.type === 'Property') {
    if (ad.vehicle) {
      return next(
        new Error(
          'For Property advertisements, a vehicle object should not be provided.',
        ),
      );
    }
    if (!ad.property) {
      return next(
        new Error(
          'For Property advertisements, a property object must be provided.',
        ),
      );
    }
  }
  next();
});

// Index for better query performance
AdvertisementSchema.index({ type: 1, category: 1 });
AdvertisementSchema.index({ price: 1 });
AdvertisementSchema.index({ state: 1, city: 1, district: 1 });
AdvertisementSchema.index({ isApproved: 1 });
AdvertisementSchema.index({ createdAt: -1 });
