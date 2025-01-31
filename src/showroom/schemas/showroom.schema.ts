import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Showroom {
  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  showroomName: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ })
  panCard: string;

  @Prop({ required: true, match: /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{1}$/ })
  cinNumber: string;
}

export type ShowroomDocument = Showroom & Document;

export const ShowroomSchema = SchemaFactory.createForClass(Showroom);
