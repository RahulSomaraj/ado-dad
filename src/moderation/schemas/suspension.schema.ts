import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SuspensionDocument = Suspension & Document;

export enum SuspensionType {
  TEMPORARY = 'temporary',
  PERMANENT_BAN = 'permanent_ban',
}

export enum SuspensionStatus {
  ACTIVE = 'active',
  LIFTED = 'lifted',
  EXPIRED = 'expired',
}

/**
 * A suspension or permanent ban applied to a user. `User.moderationStatus` and
 * `User.suspendedUntil` are denormalized from the currently-active suspension.
 */
@Schema({ timestamps: true })
export class Suspension {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SuspensionType),
    required: true,
  })
  type: SuspensionType;

  @Prop({ required: true, trim: true, maxlength: 500 })
  reason: string;

  @Prop({ type: Date, default: () => new Date() })
  startsAt: Date;

  @Prop({ type: Date, required: false })
  endsAt?: Date; // null/undefined = permanent ban

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SuspensionStatus),
    default: SuspensionStatus.ACTIVE,
  })
  status: SuspensionStatus;

  @Prop({ default: false })
  isAutomatic: boolean; // true when applied automatically by a strike threshold

  @Prop({ type: Types.ObjectId, ref: 'UserReport', required: false })
  relatedReport?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserStrike', required: false })
  relatedStrike?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  liftedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  liftedAt?: Date;

  @Prop({ required: false, trim: true, maxlength: 500 })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SuspensionSchema = SchemaFactory.createForClass(Suspension);

SuspensionSchema.index({ user: 1, status: 1 });
SuspensionSchema.index({ status: 1, endsAt: 1 });
SuspensionSchema.index({ status: 1, createdAt: -1 });
