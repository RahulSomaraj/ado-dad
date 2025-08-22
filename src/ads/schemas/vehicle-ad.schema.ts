import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VehicleAdDocument = VehicleAd & Document;

export enum VehicleTypeEnum {
  TWO_WHEELER = 'two_wheeler',
  FOUR_WHEELER = 'four_wheeler',
}

@Schema({ timestamps: true })
export class VehicleAd {
  @Prop({ required: true, ref: 'Ad', type: Types.ObjectId })
  ad: Types.ObjectId;

  @Prop({ required: true, enum: VehicleTypeEnum })
  vehicleType: VehicleTypeEnum;

  // Reference to existing vehicle-inventory Manufacturer (MongoDB ObjectId)
  @Prop({ required: true, ref: 'Manufacturer', type: Types.ObjectId })
  manufacturerId: Types.ObjectId;

  // Reference to existing vehicle-inventory VehicleModel (MongoDB ObjectId)
  @Prop({ required: true, ref: 'VehicleModel', type: Types.ObjectId })
  modelId: Types.ObjectId;

  // Reference to existing vehicle-inventory VehicleVariant (MongoDB ObjectId)
  @Prop({ required: false, ref: 'VehicleVariant', type: Types.ObjectId })
  variantId?: Types.ObjectId;

  @Prop({ required: true, min: 1900 })
  year: number;

  @Prop({ required: true, min: 0 })
  mileage: number;

  // Reference to existing vehicle-inventory TransmissionType (MongoDB ObjectId)
  @Prop({ required: true, ref: 'TransmissionType', type: Types.ObjectId })
  transmissionTypeId: Types.ObjectId;

  // Reference to existing vehicle-inventory FuelType (MongoDB ObjectId)
  @Prop({ required: true, ref: 'FuelType', type: Types.ObjectId })
  fuelTypeId: Types.ObjectId;

  @Prop({ required: false, trim: true })
  color?: string;

  @Prop({ default: false })
  isFirstOwner: boolean;

  @Prop({ default: false })
  hasInsurance: boolean;

  @Prop({ default: false })
  hasRcBook: boolean;

  @Prop({ type: [String] })
  additionalFeatures?: string[];
}

export const VehicleAdSchema = SchemaFactory.createForClass(VehicleAd);

// Indexes for fast lookups
VehicleAdSchema.index({ ad: 1 }, { unique: true });
VehicleAdSchema.index({ vehicleType: 1 });
VehicleAdSchema.index({ manufacturerId: 1 });
VehicleAdSchema.index({ modelId: 1 });
VehicleAdSchema.index({ variantId: 1 });
VehicleAdSchema.index({ year: 1 });
VehicleAdSchema.index({ mileage: 1 });
VehicleAdSchema.index({ transmissionTypeId: 1 });
VehicleAdSchema.index({ fuelTypeId: 1 });
VehicleAdSchema.index({ color: 1 });
VehicleAdSchema.index({ isFirstOwner: 1 });
VehicleAdSchema.index({ hasInsurance: 1 });
VehicleAdSchema.index({ hasRcBook: 1 });
// Compound common query pattern
VehicleAdSchema.index(
  { ad: 1, vehicleType: 1, manufacturerId: 1, modelId: 1 },
  { background: true },
);
