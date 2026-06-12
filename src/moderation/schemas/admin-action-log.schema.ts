import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminActionLogDocument = AdminActionLog & Document;

export enum AdminActionType {
  DISMISS_REPORT = 'dismiss_report',
  RESOLVE_REPORT = 'resolve_report',
  REMOVE_AD = 'remove_ad',
  RESTORE_AD = 'restore_ad',
  ADD_STRIKE = 'add_strike',
  REMOVE_STRIKE = 'remove_strike',
  SUSPEND_USER = 'suspend_user',
  UNSUSPEND_USER = 'unsuspend_user',
  BAN_USER = 'ban_user',
  UPDATE_SETTINGS = 'update_settings',
  REVIEW_APPEAL = 'review_appeal',
}

export enum AdminActionTargetType {
  USER = 'user',
  AD = 'ad',
  REPORT = 'report',
  SETTINGS = 'settings',
  APPEAL = 'appeal',
}

/** Immutable audit record written for every admin moderation action. */
@Schema({ timestamps: true })
export class AdminActionLog {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actor: Types.ObjectId; // admin / moderator who performed the action

  @Prop({ type: String, enum: Object.values(AdminActionType), required: true })
  actionType: AdminActionType;

  @Prop({
    type: String,
    enum: Object.values(AdminActionTargetType),
    required: true,
  })
  targetType: AdminActionTargetType;

  @Prop({ type: String, required: false })
  targetId?: string; // id of the affected entity

  @Prop({ type: Types.ObjectId, ref: 'UserReport', required: false })
  report?: Types.ObjectId;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // before/after snapshot or extra context

  @Prop({ required: false, trim: true, maxlength: 1000 })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AdminActionLogSchema =
  SchemaFactory.createForClass(AdminActionLog);

AdminActionLogSchema.index({ actor: 1, createdAt: -1 });
AdminActionLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AdminActionLogSchema.index({ actionType: 1, createdAt: -1 });
