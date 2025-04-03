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

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: [String], required: true })
  imageUrls: string[];

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  district: string;

  @Prop({ type: String, ref: 'User', required: false })
  createdBy: User;

  @Prop({ required: false, default: false })
  isApproved: boolean;

  @Prop({ type: String, ref: 'User', required: false })
  approvedBy: User;

  @Prop({ type: CategorySchema, required: true })
  category: Category;

  // The vehicle reference is no longer marked as required here.
  // It will be conditionally validated in the custom pre-validation hook.

  @Prop({ type: VehicleAdvSchema, required: false })
  vehicle: VehicleAdv;

  // Embed the complete property object
  @Prop({ type: PropertySchema, required: false })
  property: Property;
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);

// Custom validation: Ensure that for 'Car' ads, vehicle is provided and property is not,
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
  } else if (ad.type === 'Property') {
    if (ad.vehicle) {
      return next(
        new Error(
          'For Property advertisements, a vehicle object should not be provided.',
        ),
      );
    }
  }
  next();
});
