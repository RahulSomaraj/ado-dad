import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({
    type: String,
    required: true,
  })
  roomId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  senderId: mongoose.Types.ObjectId;

  @Prop({ required: true, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  attachments?: string[]; // URLs to files/images

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  readBy?: mongoose.Types.ObjectId;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Indexes for fast lookups
ChatMessageSchema.index(
  { roomRef: 1, createdAt: -1 },
  { name: 'roomRef_createdAt' },
);
ChatMessageSchema.index(
  { roomId: 1, createdAt: -1 },
  { name: 'roomId_createdAt' },
);
ChatMessageSchema.index({ senderId: 1 });
ChatMessageSchema.index({ isRead: 1 });
ChatMessageSchema.index({ createdAt: -1 });

// Compound indexes
ChatMessageSchema.index({ roomRef: 1, isRead: 1 });
ChatMessageSchema.index({ roomId: 1, isRead: 1 });
ChatMessageSchema.index({ senderId: 1, createdAt: -1 });
