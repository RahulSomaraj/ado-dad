import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppealDocument = Appeal & Document;

export enum AppealStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** An appeal submitted by a suspended/banned user against a suspension. */
@Schema({ timestamps: true })
export class Appeal {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Suspension', required: true })
  suspension: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  message: string;

  @Prop({
    type: String,
    enum: Object.values(AppealStatus),
    default: AppealStatus.PENDING,
  })
  status: AppealStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  reviewedAt?: Date;

  @Prop({ required: false, trim: true, maxlength: 1000 })
  decisionNote?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AppealSchema = SchemaFactory.createForClass(Appeal);

AppealSchema.index({ user: 1, status: 1 });
AppealSchema.index({ status: 1, createdAt: -1 });
AppealSchema.index({ suspension: 1 });
