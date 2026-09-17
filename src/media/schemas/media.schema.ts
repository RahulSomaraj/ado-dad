import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = Media & Document;

export enum MediaStatus {
  PENDING = 'pending', // intent issued, client has not confirmed the PUT
  UPLOADED = 'uploaded', // HeadObject verified size + type
  ATTACHED = 'attached', // referenced by an ad (adId set)
  REJECTED = 'rejected', // invalid object or expired; S3 object deleted
  ORPHANED = 'orphaned', // was attached, then removed from its ad by an edit (adId kept)
}

export enum MediaKindEnum {
  AD_IMAGE = 'ad_image',
  AD_VIDEO = 'ad_video',
}

/**
 * One server-issued upload slot. The S3 key is chosen by the server
 * (`media/<ownerId>/<uuid>.<ext>`), so an ad can only reference objects its
 * owner actually uploaded through an intent.
 */
@Schema({ timestamps: true, collection: 'media' })
export class Media {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, enum: MediaKindEnum })
  kind: MediaKindEnum;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true, min: 1 })
  declaredSize: number;

  /** Actual ContentLength from HeadObject, set on complete. */
  @Prop({ required: false, min: 0 })
  size?: number;

  @Prop({ required: false })
  url?: string;

  @Prop({
    required: true,
    enum: MediaStatus,
    default: MediaStatus.PENDING,
  })
  status: MediaStatus;

  @Prop({ type: Types.ObjectId, ref: 'Ad', required: false, default: null })
  adId?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.index({ owner: 1, status: 1 });
MediaSchema.index({ status: 1, createdAt: 1 });
