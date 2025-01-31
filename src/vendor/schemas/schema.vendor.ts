import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Vendor extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, validate: /^\d{10,15}$/ })
  phoneNumber: string;

  @Prop({ required: true, trim: true })
  address: string;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
