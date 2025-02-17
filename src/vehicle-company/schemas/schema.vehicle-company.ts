import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { VehicleCompanyTypes } from 'src/vehicles/enum/vehicle.type';

@Schema({ timestamps: true })
export class VehicleCompany extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  originCountry: string;

  @Prop({ required: true, default: VehicleCompanyTypes.FOURWHEELER })
  vehicleType: VehicleCompanyTypes;

  @Prop({
    required: true,
    validate: (v: string) =>
      /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(v),
  })
  logo: string;

  // Soft delete fields
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const VehicleCompanySchema =
  SchemaFactory.createForClass(VehicleCompany);
