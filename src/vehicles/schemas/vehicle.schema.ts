import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Vendor } from '../schemas/vendor.schema';

@Schema({ timestamps: true })
export class Vehicle extends Document {
  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  brandName: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({ required: true, enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] })
  fuelType: string;

  @Prop({
    required: true,
    type: {
      modelYear: { type: Number, required: true },
      month: { type: String, required: true },
      kilometersDriven: { type: Number, required: true },
      transmissionType: { type: String, enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'], required: true },
      mileage: { type: String, required: true },
    },
  })
  details: {
    modelYear: number;
    month: string;
    kilometersDriven: number;
    transmissionType: string;
    mileage: string;
  };

  @Prop({
    type: Object,
    required: false,
  })
  additionalInfo: {
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
    vendor?: Vendor;
  };
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
