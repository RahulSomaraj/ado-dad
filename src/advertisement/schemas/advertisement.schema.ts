import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema()
export class Advertisement extends Document {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  adTitle: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: [String], required: true })
  imageUrls: string[];

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop({ type: String, ref: 'User' })
  createdBy: User;  // User who created the advertisement
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);
