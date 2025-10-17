import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserReportDocument = UserReport & Document;

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FRAUD = 'fraud',
  HARASSMENT = 'harassment',
  FAKE_LISTINGS = 'fake_listings',
  PRICE_MANIPULATION = 'price_manipulation',
  CONTACT_ABUSE = 'contact_abuse',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Schema({ timestamps: true })
export class UserReport {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedUser: Types.ObjectId; // The user being reported

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy: Types.ObjectId; // The user who is reporting

  @Prop({
    type: String,
    enum: Object.values(ReportReason),
    required: true,
  })
  reason: ReportReason;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId; // Admin who reviewed the report

  @Prop({ required: false, trim: true, maxlength: 500 })
  adminNotes?: string; // Admin's notes about the resolution

  @Prop({ required: false })
  reviewedAt?: Date;

  @Prop({ type: [String], required: false })
  evidenceUrls?: string[]; // URLs to screenshots or other evidence

  @Prop({ type: Types.ObjectId, ref: 'Ad', required: false })
  relatedAd?: Types.ObjectId; // Optional: specific ad that triggered the report

  @Prop({ default: 0 })
  reportCount: number; // How many times this user has been reported

  @Prop({ default: false })
  isResolved: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserReportSchema = SchemaFactory.createForClass(UserReport);

// Indexes for better query performance
UserReportSchema.index({ reportedUser: 1, status: 1 });
UserReportSchema.index({ reportedBy: 1 });
UserReportSchema.index({ status: 1, createdAt: -1 });
UserReportSchema.index({ reason: 1 });
UserReportSchema.index({ isDeleted: 1 });
