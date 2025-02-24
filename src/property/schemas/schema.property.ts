import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

// Helper function for image array limit validation
function arrayLimit(val: string[]): boolean {
  return val.length <= 5;
}

@Schema({ timestamps: true })
export class Property extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
  })
  type: 'house' | 'apartment' | 'shopAndOffice' | 'pgAndGuestHouse' | 'land';

  @Prop({
    required: true,
    enum: ['forSale', 'forRent', 'landsAndPlots'],
  })
  category: 'forSale' | 'forRent' | 'landsAndPlots';

  @Prop({
    type: Number,
    required: function (this: PropertyDocument) {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [1, 'BHK must be at least 1'],
  })
  bhk?: number;

  @Prop({
    type: Number,
    required: function (this: PropertyDocument) {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [1, 'Bathrooms must be at least 1'],
  })
  bathrooms?: number;

  @Prop({
    required: function (this: PropertyDocument) {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
  })
  furnished?: 'Furnished' | 'Semi-Furnished' | 'Unfurnished';

  @Prop({
    required: function (this: PropertyDocument) {
      return this.type !== 'land';
    },
    enum: ['Under Construction', 'Ready to Move', 'Resale'],
  })
  projectStatus?: 'Under Construction' | 'Ready to Move' | 'Resale';

  @Prop({ default: 0 })
  maintenanceCost: number;

  @Prop({ default: 0 })
  carpetArea: number;

  @Prop({ default: 0 })
  buildArea: number;

  @Prop({ default: 0 })
  floorArea: number;

  @Prop({ default: 'Project Name' })
  projectName: string;

  @Prop({
    type: Number,
    required: function (this: PropertyDocument) {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [1, 'Total floors must be at least 1'],
  })
  totalFloors?: number;

  @Prop({
    type: Number,
    required: function (this: PropertyDocument) {
      return ['house', 'apartment', 'pgAndGuestHouse'].includes(this.type);
    },
    min: [0, 'Floor number cannot be negative'],
  })
  floorNo?: number;

  @Prop({ default: 0, min: [0, 'Car parking must be at least 0'] })
  carParking: number;

  @Prop({
    enum: [
      'North',
      'South',
      'East',
      'West',
      'North-East',
      'North-West',
      'South-East',
      'South-West',
    ],
  })
  facing?:
    | 'North'
    | 'South'
    | 'East'
    | 'West'
    | 'North-East'
    | 'North-West'
    | 'South-East'
    | 'South-West';

  @Prop({
    required: true,
    enum: ['Owner', 'Dealer', 'Builder'],
  })
  listedBy: 'Owner' | 'Dealer' | 'Builder';

  // createdAt is automatically added by the timestamps option
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Define a type for "this" context in conditional validators.
interface PropertyDocument extends Document {
  type: 'house' | 'apartment' | 'shopAndOffice' | 'pgAndGuestHouse' | 'land';
}
