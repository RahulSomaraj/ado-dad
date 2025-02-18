import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

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
export class VehicleAdvModel {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop()
  modelDetails?: string;

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
  mileage: number;

  @Prop({ required: true })
  engineCapacity: number;

  @Prop({ required: true })
  fuelCapacity: number;

  @Prop({ required: true })
  maxPower: number;

  @Prop({ type: AdditionalInfoSchema })
  additionalInfo?: AdditionalInfo;
}
export const ADVVehicleModelSchema =
  SchemaFactory.createForClass(VehicleAdvModel);

@Schema({ timestamps: true })
export class VehicleAdv extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true, type: VehicleAdvDetailsSchema })
  details: VehicleAdvDetails;

  @Prop({ type: String, ref: 'User' })
  createdBy: User;

  @Prop({ required: true, ref: 'VehicleCompany', type: Types.ObjectId })
  vendor: Types.ObjectId;

  // Note: Removed the default value so that if no vehicle model is provided, this field remains undefined.
  @Prop({ type: ADVVehicleModelSchema })
  vehicleModel?: VehicleAdvModel;
}
export const VehicleAdvSchema = SchemaFactory.createForClass(VehicleAdv);
