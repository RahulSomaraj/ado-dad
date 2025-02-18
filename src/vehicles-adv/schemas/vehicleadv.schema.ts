import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class VehicleAdvDetails {
  @Prop({ required: true })
  modelYear: number;

  @Prop({ required: true })
  month: string;
}
export const VehicleAdvDetailsSchema =
  SchemaFactory.createForClass(VehicleAdvDetails);

@Schema({ _id: false })
export class AdditionalInfo {
  @Prop() abs?: boolean;
  @Prop() adjustableExternalMirror?: boolean;
  @Prop() adjustableSteering?: boolean;
  @Prop() airConditioning?: boolean;
  @Prop() numberOfAirbags?: number;
  @Prop() alloyWheels?: boolean;
  @Prop() auxCompatibility?: boolean;
  @Prop() batteryCondition?: string;
  @Prop() bluetooth?: boolean;
  @Prop() vehicleCertified?: boolean;
  @Prop() color?: string;
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
  @Prop() registrationPlace?: string;
  @Prop() exchange?: boolean;
  @Prop() finance?: boolean;
  @Prop() serviceHistory?: boolean;
  @Prop() sunroof?: boolean;
  @Prop() tyreCondition?: string;
  @Prop() usbCompatibility?: boolean;
}

export const AdditionalInfoSchema =
  SchemaFactory.createForClass(AdditionalInfo);

@Schema({ _id: false })
export class VehicleModel {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop() modelDetails?: string;

  @Prop([String])
  images?: string[];

  @Prop({
    required: true,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
  })
  fuelType: string;

  @Prop({
    required: true,
    enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
  })
  transmissionType: string;

  @Prop({ required: true })
  mileage: string;

  @Prop()
  additionalInfo?: AdditionalInfo;
}
export const VehicleModelSchema = SchemaFactory.createForClass(VehicleModel);

@Schema({ timestamps: true })
export class VehicleAdv extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({ required: true, type: VehicleAdvDetailsSchema })
  details: VehicleAdvDetails;

  @Prop({ required: true })
  createdBy: string;

  // Reference to the VehicleCompany schema as a vendor.
  @Prop({ required: true, ref: 'VehicleCompany', type: Types.ObjectId })
  vendor: Types.ObjectId;

  @Prop({ type: [VehicleModelSchema], default: [] })
  vehicleModels?: VehicleModel[];
}
export const VehicleAdvSchema = SchemaFactory.createForClass(VehicleAdv);
