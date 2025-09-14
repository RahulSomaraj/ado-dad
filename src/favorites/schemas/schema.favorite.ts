import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FavoriteDocument = Favorite & Document;

// Favorite schema
@Schema({ timestamps: true })
export class Favorite {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ad', index: true, required: true })
  itemId: Types.ObjectId;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

// Prevent duplicates per (user, item)
FavoriteSchema.index({ userId: 1, itemId: 1 }, { unique: true });

// For listing quickly
FavoriteSchema.index({ userId: 1, createdAt: -1 });
