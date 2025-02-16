import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt fields
export class Advertisement extends Document {
  @Prop({ required: true, enum: ['Car', 'Property'] })
  type: string;

  @Prop({ required: true })
  adTitle: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
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

  @Prop({ type: String, ref: 'User', required: true })
  createdBy: User; // Reference to the user who created the advertisement

  @Prop({ type: String, ref: 'Category', required: true })
  category: Types.ObjectId; // Reference to the user who created the advertisement

  // Reference to the VehicleCompany schema as a vehicleAdvs.
  @Prop({ required: true, type: Types.ObjectId, ref: 'vehicleAdvs' })
  vehicle: Types.ObjectId;

  // Reference to the Properties schema as property.
  @Prop({ required: true, type: Types.ObjectId, ref: 'properties' })
  property: Types.ObjectId;
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);
