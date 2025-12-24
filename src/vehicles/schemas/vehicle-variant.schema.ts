import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VALID_FUEL_TYPES, VALID_TRANSMISSION_TYPES, VALID_FEATURE_PACKAGES } from '../../common/constants/vehicle.constants';

@Schema({ timestamps: true })
export class VehicleVariant extends Document {
  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  displayName?: string;

  @Prop({ 
    required: true,
    enum: VALID_FUEL_TYPES
  })
  fuelType: string;

  @Prop({ 
    required: true,
    enum: VALID_TRANSMISSION_TYPES
  })
  transmissionType: string;

  @Prop({ 
    required: true,
    enum: VALID_FEATURE_PACKAGES
  })
  featurePackage: string;

  @Prop({ type: Types.ObjectId, ref: 'Model', required: true })
  modelId: Types.ObjectId;

  // Engine specifications
  @Prop({ required: false })
  engine_capacity?: number;

  @Prop({ required: false })
  engine_maxPower?: string;

  @Prop({ required: false })
  engine_maxTorque?: string;

  @Prop({ required: false })
  engine_cylinders?: number;

  @Prop({ required: false })
  engine_turbo?: boolean;

  // Performance specifications
  @Prop({ required: false })
  perf_mileage?: string;

  @Prop({ required: false })
  perf_acceleration?: string;

  @Prop({ required: false })
  perf_topSpeed?: string;

  @Prop({ required: false })
  perf_fuelCapacity?: number;

  // Dimensions
  @Prop({ required: false })
  dim_length?: number;

  @Prop({ required: false })
  dim_width?: number;

  @Prop({ required: false })
  dim_height?: number;

  @Prop({ required: false })
  dim_wheelbase?: number;

  @Prop({ required: false })
  dim_groundClearance?: number;

  @Prop({ required: false })
  dim_bootSpace?: number;

  // Other fields
  @Prop({ required: false })
  seatingCapacity?: number;

  @Prop({ required: false })
  price?: number;

  @Prop({ required: false })
  exShowroomPrice?: number;

  @Prop({ required: false })
  onRoadPrice?: number;

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

  @Prop({ type: Object, required: false })
  featuresJson?: Record<string, any>;

  @Prop({ required: false, default: true })
  isActive?: boolean;

  @Prop({ required: false, default: false })
  isLaunched?: boolean;

  @Prop({ required: false })
  launchDate?: Date;
}

export const VehicleVariantSchema = SchemaFactory.createForClass(VehicleVariant);

// Create compound index for uniqueness check (modelId + fuelType + transmissionType + featurePackage)
VehicleVariantSchema.index({ modelId: 1, fuelType: 1, transmissionType: 1, featurePackage: 1 }, { unique: true });

