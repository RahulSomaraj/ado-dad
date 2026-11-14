import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ModerationSettingsDocument = ModerationSettings & Document;

export enum ThresholdAction {
  WARNING = 'warning',
  NOTIFY = 'notify',
  SUSPEND = 'suspend',
  BAN = 'ban',
}

/** Maps a strike level to the action taken when a user reaches it. */
@Schema({ _id: false })
export class StrikeThreshold {
  @Prop({ required: true, min: 1 })
  level: number;

  @Prop({ type: String, enum: Object.values(ThresholdAction), required: true })
  action: ThresholdAction;

  @Prop({ required: false, min: 0 })
  durationDays?: number; // only used when action = SUSPEND
}

export const StrikeThresholdSchema =
  SchemaFactory.createForClass(StrikeThreshold);

/** Singleton document (key = 'global') holding configurable moderation rules. */
@Schema({ timestamps: true })
export class ModerationSettings {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, default: 'global' })
  key: string;

  @Prop({ type: [StrikeThresholdSchema], default: [] })
  thresholds: StrikeThreshold[];

  @Prop({ default: true })
  notifyByEmail: boolean;

  @Prop({ default: true })
  notifyByPush: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ModerationSettingsSchema =
  SchemaFactory.createForClass(ModerationSettings);

/** Default thresholds used to seed the singleton on first read. */
export const DEFAULT_STRIKE_THRESHOLDS: StrikeThreshold[] = [
  { level: 1, action: ThresholdAction.WARNING },
  { level: 2, action: ThresholdAction.NOTIFY },
  { level: 3, action: ThresholdAction.SUSPEND, durationDays: 7 },
  { level: 4, action: ThresholdAction.SUSPEND, durationDays: 30 },
  { level: 5, action: ThresholdAction.BAN },
];
