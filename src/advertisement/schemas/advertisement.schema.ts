import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

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
  fullName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: User;

  @Prop({ required: false, default: false })
  isApproved: boolean;

  @Prop({ type: String, ref: 'User', required: true })
  approvedBy: User;

  @Prop({ type: String, ref: 'Category', required: true })
  category: Types.ObjectId;

  // The vehicle reference is no longer marked as required here.
  // It will be conditionally validated in the custom pre-validation hook.
  @Prop({ type: Types.ObjectId, ref: 'vehicleAdvs' })
  vehicle: Types.ObjectId;

  // The property reference is also optional at the schema level.
  @Prop({ type: Types.ObjectId, ref: 'properties' })
  property: Types.ObjectId;
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);

// Custom validation: Ensure that for 'Car' ads, vehicle is provided and property is not,
// and for 'Property' ads, property is provided and vehicle is not.
AdvertisementSchema.pre('validate', function (next) {
  const ad = this as Advertisement;

  if (ad.type === 'Vehicle') {
    if (!ad.vehicle) {
      return next(
        new Error(
          'For Vehicle advertisements, a vehicle reference is required.',
        ),
      );
    }
    if (ad.property) {
      return next(
        new Error(
          'For Car advertisements, a property reference should not be provided.',
        ),
      );
    }
  } else if (ad.type === 'Property') {
    if (!ad.property) {
      return next(
        new Error(
          'For Property advertisements, a property reference is required.',
        ),
      );
    }
    if (ad.vehicle) {
      return next(
        new Error(
          'For Property advertisements, a vehicle reference should not be provided.',
        ),
      );
    }
  }

  next();
});
