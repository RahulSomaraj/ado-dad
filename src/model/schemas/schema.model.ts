import { Schema, Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { VALID_FUEL_TYPES, VALID_TRANSMISSION_TYPES, VALID_VEHICLE_TYPES } from '../../common/constants/vehicle.constants';

// Define the Schema
export const ModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Model name is required.'],
      unique: true,
    },
    displayName: {
      type: String,
      required: false,
    },
    vehicleType: {
      type: String,
      enum: VALID_VEHICLE_TYPES,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    launchYear: {
      type: Number,
      required: false,
    },
    segment: {
      type: String,
      required: false,
    },
    bodyType: {
      type: String,
      required: false,
    },
    images: {
      type: [String],
      required: false,
    },
    brochureUrl: {
      type: String,
      required: false,
    },
    isCommercialVehicle: {
      type: Boolean,
      required: false,
      default: false,
    },
    commercialVehicleType: {
      type: String,
      required: false,
    },
    commercialBodyType: {
      type: String,
      required: false,
    },
    defaultPayloadCapacity: {
      type: Number,
      required: false,
    },
    defaultAxleCount: {
      type: Number,
      required: false,
    },
    defaultPayloadUnit: {
      type: String,
      required: false,
    },
    defaultSeatingCapacity: {
      type: Number,
      required: false,
    },
    fuelTypes: {
      type: [String],
      enum: VALID_FUEL_TYPES,
      required: false,
    },
    transmissionTypes: {
      type: [String],
      enum: VALID_TRANSMISSION_TYPES,
      required: false,
    },
    isActive: {
      type: Boolean,
      required: false,
      default: true,
    },
    manufacturerId: {
      type: Types.ObjectId,
      ref: 'VehicleCompany',
      required: true,
    },
  },
  { timestamps: true },
);

// Create the Model Document interface
export interface VehicleModelDocument extends Document {
  name: string;
  displayName?: string;
  vehicleType?: 'SUV' | 'Sedan' | 'Truck' | 'Coupe' | 'Hatchback' | 'Convertible' | 'two-wheeler' | 'MUV' | 'Compact SUV' | 'Sub-Compact SUV';
  description?: string;
  launchYear?: number;
  segment?: string;
  bodyType?: string;
  images?: string[];
  brochureUrl?: string;
  isCommercialVehicle?: boolean;
  commercialVehicleType?: string;
  commercialBodyType?: string;
  defaultPayloadCapacity?: number;
  defaultAxleCount?: number;
  defaultPayloadUnit?: string;
  defaultSeatingCapacity?: number;
  fuelTypes?: string[];
  transmissionTypes?: string[];
  isActive?: boolean;
  manufacturerId: Types.ObjectId;
}

// Export the schema
export const VehicleModel = mongoose.model<VehicleModelDocument>('Model', ModelSchema);
