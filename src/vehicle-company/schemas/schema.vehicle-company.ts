import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class VehicleCompany extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  originCountry: string;

  @Prop({
    required: true,
    validate: (v: string) => /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(v),
  })
  logo: string;
}

export const VehicleCompanySchema = SchemaFactory.createForClass(VehicleCompany);
