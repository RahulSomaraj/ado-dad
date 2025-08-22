import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommercialVehicleAdDocument = CommercialVehicleAd & Document;

export enum CommercialVehicleTypeEnum {
  TRUCK = 'truck',
  VAN = 'van',
  BUS = 'bus',
  TRACTOR = 'tractor',
  TRAILER = 'trailer',
  FORKLIFT = 'forklift',
}

export enum BodyTypeEnum {
  FLATBED = 'flatbed',
  CONTAINER = 'container',
  REFRIGERATED = 'refrigerated',
  TANKER = 'tanker',
  DUMP = 'dump',
  PICKUP = 'pickup',
  BOX = 'box',
  PASSENGER = 'passenger',
}

@Schema({ timestamps: true })
export class CommercialVehicleAd {
  @Prop({ required: true, ref: 'Ad', type: Types.ObjectId })
  ad: Types.ObjectId;

  @Prop({ required: true, enum: CommercialVehicleTypeEnum })
  commercialVehicleType: CommercialVehicleTypeEnum;

  @Prop({ required: true, enum: BodyTypeEnum })
  bodyType: BodyTypeEnum;

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

  @Prop({ required: true, min: 0 })
  payloadCapacity: number;

  @Prop({ required: false, trim: true })
  payloadUnit?: string;

  @Prop({ required: true, min: 1, max: 10 })
  axleCount: number;

  // Reference to existing vehicle-inventory TransmissionType (MongoDB ObjectId)
  @Prop({ required: true, ref: 'TransmissionType', type: Types.ObjectId })
  transmissionTypeId: Types.ObjectId;

  // Reference to existing vehicle-inventory FuelType (MongoDB ObjectId)
  @Prop({ required: true, ref: 'FuelType', type: Types.ObjectId })
  fuelTypeId: Types.ObjectId;

  @Prop({ required: false, trim: true })
  color?: string;

  @Prop({ default: false })
  hasInsurance: boolean;

  @Prop({ default: false })
  hasFitness: boolean;

  @Prop({ default: false })
  hasPermit: boolean;

  @Prop({ type: [String] })
  additionalFeatures?: string[];

  @Prop({ required: false, min: 1 })
  seatingCapacity?: number;
}

export const CommercialVehicleAdSchema =
  SchemaFactory.createForClass(CommercialVehicleAd);

// Indexes for fast lookups
CommercialVehicleAdSchema.index({ ad: 1 }, { unique: true });
CommercialVehicleAdSchema.index({ commercialvehicleType: 1 });
CommercialVehicleAdSchema.index({ bodyType: 1 });
CommercialVehicleAdSchema.index({ manufacturerId: 1 });
CommercialVehicleAdSchema.index({ modelId: 1 });
CommercialVehicleAdSchema.index({ variantId: 1 });
CommercialVehicleAdSchema.index({ year: 1 });
CommercialVehicleAdSchema.index({ mileage: 1 });
CommercialVehicleAdSchema.index({ payloadCapacity: 1 });
CommercialVehicleAdSchema.index({ axleCount: 1 });
CommercialVehicleAdSchema.index({ transmissionTypeId: 1 });
CommercialVehicleAdSchema.index({ fuelTypeId: 1 });
CommercialVehicleAdSchema.index({ color: 1 });
CommercialVehicleAdSchema.index({ hasInsurance: 1 });
CommercialVehicleAdSchema.index({ hasFitness: 1 });
CommercialVehicleAdSchema.index({ hasPermit: 1 });
CommercialVehicleAdSchema.index({ seatingCapacity: 1 });
// Compound common query pattern
CommercialVehicleAdSchema.index(
  { ad: 1, manufacturerId: 1, modelId: 1, year: 1 },
  { background: true },
);
