import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from '../enum/vehicle.type';

@Schema({ _id: false })
export class VehicleDetails {
  @Prop({ required: true })
  modelYear: number;

  @Prop({ required: true })
  month: string;
}

export const VehicleDetailsSchema =
  SchemaFactory.createForClass(VehicleDetails);

@Schema({ _id: false })
export class AdditionalInfo {
  @Prop() abs?: boolean;
  @Prop() accidental?: boolean;
  @Prop() adjustableExternalMirror?: boolean;
  @Prop() adjustableSteering?: boolean;
  @Prop() adjustableSeats?: boolean;
  @Prop() airConditioning?: boolean;
  @Prop() numberOfAirbags?: number;
  @Prop() alloyWheels?: boolean;
  @Prop() auxCompatibility?: boolean;
  @Prop() batteryCondition?: string;
  @Prop() bluetooth?: boolean;
  @Prop() vehicleCertified?: boolean;
  // color as an array of strings.
  @Prop({ type: [String] })
  color?: string[];
  @Prop() cruiseControl?: boolean;
  @Prop() insuranceType?: string;
  @Prop() lockSystem?: boolean;
  @Prop() makeMonth?: string;
  @Prop() navigationSystem?: boolean;
  @Prop() parkingSensors?: boolean;
  @Prop() powerSteering?: boolean;
  @Prop() powerWindows?: boolean;
  @Prop() amFmRadio?: boolean;
  @Prop() rearParkingCamera?: boolean;
  @Prop() sunroof?: boolean;
  @Prop() usbCompatibility?: boolean;
  @Prop() seatWarmer?: boolean;
}

export const AdditionalInfoSchema =
  SchemaFactory.createForClass(AdditionalInfo);

@Schema({ _id: false })
export class VehicleModel {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop()
  modelDetails?: string;

  @Prop([String])
  images?: string[];

  @Prop({
    required: true,
    enum: FuelType,
    default: FuelType.PETROL,
  })
  fuelType: FuelType;

  @Prop({
    required: true,
    enum: TransmissionType,
    default: TransmissionType.MANUAL,
  })
  transmissionType: TransmissionType;

  @Prop({ required: true })
  mileage: number;

  @Prop({ required: true })
  engineCapacity: number;

  @Prop({ required: true })
  fuelCapacity: number;

  @Prop({ required: true })
  maxPower: number;

  @Prop()
  additionalInfo?: AdditionalInfo;
}

export const VehicleModelSchema = SchemaFactory.createForClass(VehicleModel);

@Schema({ timestamps: true })
export class Vehicle extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({ required: true, enum: VehicleTypes, default: VehicleTypes.SEDAN })
  modelType: VehicleTypes;

  // New property to differentiate wheeler type.
  @Prop({
    required: true,
    enum: WheelerType,
    default: WheelerType.FOUR_WHEELER,
  })
  wheelerType: WheelerType;

  // Reference to the VehicleCompany schema as a vendor.
  @Prop({ required: true, ref: 'VehicleCompany', type: Types.ObjectId })
  vendor: Types.ObjectId;

  @Prop({ type: [String] })
  color?: string[];

  @Prop({ required: true, type: VehicleDetailsSchema })
  details: VehicleDetails;

  @Prop({ type: [VehicleModelSchema], default: [] })
  vehicleModels?: VehicleModel[];

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
