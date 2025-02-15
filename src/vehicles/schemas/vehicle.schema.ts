import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Vehicle extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({
    required: true,
    type: {
      modelYear: { type: Number, required: true },
      month: { type: String, required: true },
    },
  })
  details: {
    modelYear: number;
    month: string;
  };

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  createdAt: Date;

  // Reference to the VehicleCompany schema as a vendor.
  @Prop({ required: true, type: Types.ObjectId, ref: 'VehicleCompany' })
  vendor: Types.ObjectId;

  @Prop({
    required: false,
    type: [
      {
        name: { type: String, required: true },
        modelName: { type: String, required: true },
        modelDetails: { type: String, required: false },
        images: { type: [String], required: false },
        fuelType: {
          type: String,
          required: true,
          enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
        },
        transmissionType: {
          type: String,
          required: true,
          enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
        },
        mileage: { type: String, required: true },
        additionalInfo: {
          type: {
            abs: { type: Boolean, required: false },
            adjustableExternalMirror: { type: Boolean, required: false },
            adjustableSteering: { type: Boolean, required: false },
            airConditioning: { type: Boolean, required: false },
            numberOfAirbags: { type: Number, required: false },
            alloyWheels: { type: Boolean, required: false },
            auxCompatibility: { type: Boolean, required: false },
            batteryCondition: { type: String, required: false },
            bluetooth: { type: Boolean, required: false },
            vehicleCertified: { type: Boolean, required: false },
            color: { type: String, required: false },
            cruiseControl: { type: Boolean, required: false },
            insuranceType: { type: String, required: false },
            lockSystem: { type: Boolean, required: false },
            makeMonth: { type: String, required: false },
            navigationSystem: { type: Boolean, required: false },
            parkingSensors: { type: Boolean, required: false },
            powerSteering: { type: Boolean, required: false },
            powerWindows: { type: Boolean, required: false },
            amFmRadio: { type: Boolean, required: false },
            rearParkingCamera: { type: Boolean, required: false },
            registrationPlace: { type: String, required: false },
            exchange: { type: Boolean, required: false },
            finance: { type: Boolean, required: false },
            serviceHistory: { type: Boolean, required: false },
            sunroof: { type: Boolean, required: false },
            tyreCondition: { type: String, required: false },
            usbCompatibility: { type: Boolean, required: false },
            vendor: { type: 'ObjectId', ref: 'Vendor', required: false },
          },
          required: false,
        },
      },
    ],
  })
  vehicleModels?: {
    name: string;
    modelName: string;
    modelDetails?: string;
    images?: string[];
    fuelType: string;
    transmissionType: string;
    mileage: string;
    additionalInfo?: {
      abs?: boolean;
      accidental?: boolean;
      adjustableExternalMirror?: boolean;
      adjustableSteering?: boolean;
      airConditioning?: boolean;
      numberOfAirbags?: number;
      alloyWheels?: boolean;
      auxCompatibility?: boolean;
      batteryCondition?: string;
      bluetooth?: boolean;
      vehicleCertified?: boolean;
      color?: string;
      cruiseControl?: boolean;
      insuranceType?: string;
      lockSystem?: boolean;
      makeMonth?: string;
      navigationSystem?: boolean;
      parkingSensors?: boolean;
      powerSteering?: boolean;
      powerWindows?: boolean;
      amFmRadio?: boolean;
      rearParkingCamera?: boolean;
      registrationPlace?: string;
      exchange?: boolean;
      finance?: boolean;
      serviceHistory?: boolean;
      sunroof?: boolean;
      tyreCondition?: string;
      usbCompatibility?: boolean;
      vendor?: string; // This will store the vendor ObjectId as a string reference
    };
  }[];
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
