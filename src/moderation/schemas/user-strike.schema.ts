import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserStrikeDocument = UserStrike & Document;

/**
 * An individual strike issued against a user. Strikes form an auditable history;
 * `User.strikeCount` is a denormalized count of the *active* strikes.
 */
@Schema({ timestamps: true })
export class UserStrike {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId; // the user receiving the strike

  @Prop({ type: Types.ObjectId, ref: 'UserReport', required: false })
  report?: Types.ObjectId; // report that triggered the strike (if any)

  @Prop({ required: true, min: 1 })
  level: number; // the user's strike number at the time it was issued (1..N)

  @Prop({ required: true, trim: true, maxlength: 300 })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy: Types.ObjectId; // admin / moderator who issued it

  @Prop({ required: false, trim: true, maxlength: 500 })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean; // false once revoked / removed

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  revokedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  revokedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const UserStrikeSchema = SchemaFactory.createForClass(UserStrike);

UserStrikeSchema.index({ user: 1, isActive: 1, createdAt: -1 });
UserStrikeSchema.index({ report: 1 });
