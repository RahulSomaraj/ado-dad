import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  VehicleFeatures,
  VehicleFeaturesSchema,
} from './vehicle-features.schema';

export type VehicleVariantDocument = VehicleVariant & Document;

@Schema({ _id: false })
export class EngineSpecs {
  @Prop({ required: true })
  capacity: number; // in cc, e.g., 1200, 1500

  @Prop({ required: true })
  maxPower: number; // in bhp

  @Prop({ required: true })
  maxTorque: number; // in Nm

  @Prop({ required: false })
  cylinders?: number;

  @Prop({ required: false })
  turbocharged?: boolean;
}

export const EngineSpecsSchema = SchemaFactory.createForClass(EngineSpecs);

@Schema({ _id: false })
export class PerformanceSpecs {
  @Prop({ required: true })
  mileage: number; // km/l or km/kWh for electric

  @Prop({ required: false })
  acceleration?: number; // 0-100 km/h in seconds

  @Prop({ required: false })
  topSpeed?: number; // km/h

  @Prop({ required: false })
  fuelCapacity?: number; // liters or kWh for electric
}

export const PerformanceSpecsSchema =
  SchemaFactory.createForClass(PerformanceSpecs);

@Schema({ _id: false })
export class Dimensions {
  @Prop({ required: false })
  length?: number; // mm

  @Prop({ required: false })
  width?: number; // mm

  @Prop({ required: false })
  height?: number; // mm

  @Prop({ required: false })
  wheelbase?: number; // mm

  @Prop({ required: false })
  groundClearance?: number; // mm

  @Prop({ required: false })
  bootSpace?: number; // liters
}

export const DimensionsSchema = SchemaFactory.createForClass(Dimensions);

@Schema({ timestamps: true })
export class VehicleVariant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ required: true, ref: 'VehicleModel', type: Types.ObjectId })
  vehicleModel: Types.ObjectId;

  @Prop({ required: true, ref: 'FuelType', type: Types.ObjectId })
  fuelType: Types.ObjectId;

  @Prop({ required: true, ref: 'TransmissionType', type: Types.ObjectId })
  transmissionType: Types.ObjectId;

  @Prop({ required: true, trim: true })
  featurePackage: string;

  @Prop({ required: true, type: EngineSpecsSchema })
  engineSpecs: EngineSpecs;

  @Prop({ required: true, type: PerformanceSpecsSchema })
  performanceSpecs: PerformanceSpecs;

  @Prop({ required: false, type: DimensionsSchema })
  dimensions?: Dimensions;

  @Prop({ required: true })
  seatingCapacity: number;

  @Prop({ required: true })
  price: number; // in INR

  @Prop({ required: false })
  exShowroomPrice?: number; // in INR

  @Prop({ required: false })
  onRoadPrice?: number; // in INR

  @Prop({ type: [String], required: false })
  colors?: string[];

  @Prop({ type: [String], required: false })
  images?: string[];

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  brochureUrl?: string;

  @Prop({ required: false })
  videoUrl?: string;

  // Comprehensive Vehicle Features
  @Prop({ type: VehicleFeaturesSchema, required: false })
  features?: VehicleFeatures;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isLaunched: boolean;

  @Prop({ required: false })
  launchDate?: Date;

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const VehicleVariantSchema =
  SchemaFactory.createForClass(VehicleVariant);

// Indexes for fast lookups
VehicleVariantSchema.index(
  { vehicleModel: 1, fuelType: 1, transmissionType: 1, featurePackage: 1 },
  { unique: true },
);
VehicleVariantSchema.index({ fuelType: 1 });
VehicleVariantSchema.index({ transmissionType: 1 });
VehicleVariantSchema.index({ price: 1 });
VehicleVariantSchema.index({ isActive: 1, isDeleted: 1 });
VehicleVariantSchema.index({ vehicleModel: 1, isActive: 1 });
VehicleVariantSchema.index({ fuelType: 1, price: 1 }); // For price-based queries
VehicleVariantSchema.index({ vehicleModel: 1, fuelType: 1 }); // For model + fuel type queries
