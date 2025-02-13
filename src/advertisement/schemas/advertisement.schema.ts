import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true }) // Automatically adds createdAt & updatedAt fields
export class Advertisement extends Document {
  @Prop({ required: true, enum: ['Vehicle', 'Property'] })
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

  // ------------------- Vehicle-specific fields -------------------

  @Prop({ required: false })
  brandName?: string;

  @Prop({ required: false })
  modelName?: string;

  @Prop({ required: false })
  year?: string;

  @Prop({ type: Number, min: 0, required: false })
  kmDriven?: number;

  @Prop({ enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'], required: false })
  fuelType?: string;

  @Prop({ enum: ['Manual', 'Automatic'], required: false })
  transmission?: string;

  // ------------------- Property-specific fields -------------------

  @Prop({ enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'], required: false })
  propertyType?: string;

  @Prop({ enum: ['forSale', 'forRent', 'landsAndPlots'], required: false })
  category?: string;

  @Prop({ type: Number, min: 1, required: false })
  bhk?: number;

  @Prop({ type: Number, min: 1, required: false })
  bathrooms?: number;

  @Prop({ enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'], required: false })
  furnished?: string;

  @Prop({ enum: ['Under Construction', 'Ready to Move', 'Resale'], required: false })
  projectStatus?: string;

  @Prop({ type: Number, min: 0, required: false })
  area?: number;

  @Prop({ type: Number, min: 0, required: false })
  maintenanceCost?: number;

  @Prop({ type: Number, min: 1, required: false })
  totalFloors?: number;

  @Prop({ type: Number, min: 0, required: false })
  floorNo?: number;

  @Prop({ type: Number, min: 0, required: false })
  carParking?: number;

  @Prop({ enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'], required: false })
  facing?: string;

  @Prop({ enum: ['Owner', 'Dealer', 'Builder'], required: false })
  listedBy?: string;
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);
