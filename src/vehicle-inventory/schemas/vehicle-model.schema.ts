import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

export type VehicleModelDocument = VehicleModel & Document;

@Schema({ timestamps: true })
export class VehicleModel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ required: true, ref: 'Manufacturer', type: Types.ObjectId })
  manufacturer: Types.ObjectId;

  @Prop({ required: true, enum: VehicleTypes })
  vehicleType: VehicleTypes;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  launchYear?: number;

  @Prop({ required: false })
  segment?: string; // A, B, C, D, E segment

  @Prop({ required: false })
  bodyType?: string; // Hatchback, Sedan, SUV, etc.

  @Prop({ type: [String], required: false })
  images?: string[];

  @Prop({ required: false })
  brochureUrl?: string;

  // Commercial vehicle metadata for auto-detection
  @Prop({ required: false })
  isCommercialVehicle?: boolean;

  @Prop({ required: false })
  commercialVehicleType?: string; // truck, bus, van, tractor, trailer, forklift

  @Prop({ required: false })
  commercialBodyType?: string; // flatbed, container, refrigerated, tanker, dump, pickup, box, passenger

  @Prop({ required: false })
  defaultPayloadCapacity?: number;

  @Prop({ required: false })
  defaultPayloadUnit?: string; // kg, tons, etc.

  @Prop({ required: false })
  defaultAxleCount?: number;

  @Prop({ required: false })
  defaultSeatingCapacity?: number;

  // Multi-value fields for fuel types and transmission types
  @Prop({ type: [String], required: false })
  fuelTypes?: string[];

  @Prop({ type: [String], required: false })
  transmissionTypes?: string[];

  @Prop({ default: true })
  isActive: boolean;

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const VehicleModelSchema = SchemaFactory.createForClass(VehicleModel);

// Indexes for fast lookups
VehicleModelSchema.index({ manufacturer: 1, name: 1 }, { unique: true });
VehicleModelSchema.index({ vehicleType: 1 });
VehicleModelSchema.index({ isActive: 1, isDeleted: 1 });
VehicleModelSchema.index({ manufacturer: 1, isActive: 1 });
VehicleModelSchema.index({ isCommercialVehicle: 1 }); // New index for commercial vehicle detection

// Text index for search functionality
VehicleModelSchema.index(
  { name: 'text', displayName: 'text', description: 'text' },
  { weights: { name: 10, displayName: 5, description: 1 } },
);
