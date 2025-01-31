import { Schema, Document } from 'mongoose';
import * as mongoose from 'mongoose';

// Define the Schema
export const ModelSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, 'Image URL is required.'],
      match: /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/,
    },
    name: {
      type: String,
      required: [true, 'Vehicle name is required.'],
    },
    brandName: {
      type: String,
      required: [true, 'Brand Name is required.'],
    },
    modelName: {
      type: String,
      required: [true, 'Model Name is required.'],
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
      required: [true, 'Fuel type is required.'],
    },
    details: {
      modelYear: {
        type: Number,
        required: [true, 'Model year is required.'],
        min: [1900, 'Year must be later than 1900.'],
        max: [new Date().getFullYear(), 'Year cannot be in the future.'],
      },
      month: { 
        type: String, 
        required: [true, 'Month is required.'] 
      },
      kilometersDriven: {
        type: Number,
        required: [true, 'Kilometers driven is required.'],
        min: [0, 'Kilometers driven cannot be negative.'],
      },
      transmissionType: {
        type: String,
        enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
        required: [true, 'Transmission type is required.'],
      },
      mileage: { 
        type: String, 
        required: [true, 'Mileage is required.'] 
      },
    },
    additionalInfo: {
      abs: { type: Boolean, required: false },
      accidental: { type: Boolean, required: false },
      color: { type: String, required: false },
      powerSteering: { type: Boolean, required: false },
      powerWindows: { type: Boolean, required: false },
      sunroof: { type: Boolean, required: false },
      usbCompatibility: { type: Boolean, required: false },
      insuranceType: { type: String, required: false },
    },
  },
  { timestamps: true },
);

// Create the Model Document interface
export interface VehicleModelDocument extends Document {
  image: string;
  name: string;
  brandName: string;
  modelName: string;
  fuelType: string;
  details: {
    modelYear: number;
    month: string;
    kilometersDriven: number;
    transmissionType: string;
    mileage: string;
  };
  additionalInfo: {
    abs?: boolean;
    accidental?: boolean;
    color?: string;
    powerSteering?: boolean;
    powerWindows?: boolean;
    sunroof?: boolean;
    usbCompatibility?: boolean;
    insuranceType?: string;
  };
}

// Export the schema
export const VehicleModel = mongoose.model<VehicleModelDocument>('Model', ModelSchema);
