import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from 'src/vehicles/enum/vehicle.type';

@Schema({ _id: false })
export class Vehicle extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true, enum: VehicleTypes })
  vehicleType: VehicleTypes;

  @Prop({ required: true, enum: WheelerType })
  wheelerType: WheelerType;

  @Prop({ required: true, enum: FuelType })
  fuelType: FuelType;

  @Prop({ required: true, enum: TransmissionType })
  transmissionType: TransmissionType;

  @Prop({ required: true, min: 1900 })
  modelYear: number;

  @Prop({ required: true, min: 0 })
  mileage: number;

  @Prop({ required: false, min: 0 })
  engineCapacity?: number;

  @Prop({ required: false, min: 1 })
  seats?: number;

  @Prop({ required: false })
  registrationNumber?: string;

  @Prop({ required: false })
  insuranceExpiry?: string;

  @Prop({ required: false })
  pucExpiry?: string;

  @Prop({ type: [String], required: false })
  features?: string[];
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
