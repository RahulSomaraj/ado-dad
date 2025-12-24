import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class VehicleCompany extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: false })
  displayName?: string;

  @Prop({ required: false })
  originCountry?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({
    required: false,
    validate: (v: string) => !v || /^https?:\/\/.*\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(v),
  })
  logo?: string;

  @Prop({ required: false })
  website?: string;

  @Prop({ required: false, type: Number })
  foundedYear?: number;

  @Prop({ required: false })
  headquarters?: string;

  @Prop({ required: false, default: true })
  isActive?: boolean;

  @Prop({ required: false, default: false })
  isPremium?: boolean;
}

export const VehicleCompanySchema = SchemaFactory.createForClass(VehicleCompany);
