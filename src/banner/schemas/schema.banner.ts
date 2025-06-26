import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  desktopImage: string;

  @Prop({ required: true })
  phoneImage: string;

  @Prop({ required: true })
  tabletImage: string;

  @Prop({ required: false })
  link?: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
