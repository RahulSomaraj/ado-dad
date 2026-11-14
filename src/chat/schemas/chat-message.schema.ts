import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  FILE = 'file',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true })
  roomRef: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true })
  roomId: string; // denormalised string id

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  senderId: mongoose.Types.ObjectId;

  /** Client-generated id — makes sends idempotent and lets clients match optimistic bubbles. */
  @Prop({ type: String, required: false })
  clientMessageId?: string;

  @Prop({ required: true, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Prop({ required: false })
  content?: string;

  @Prop({
    type: [
      {
        type: { type: String, enum: ['image', 'audio', 'file'], required: true },
        url: { type: String, required: true },
        mimeType: { type: String },
        size: { type: Number },
        duration: { type: Number, max: 180 },
        thumbnailUrl: { type: String },
        width: { type: Number },
        height: { type: Number },
      },
    ],
    default: [],
  })
  attachments?: {
    type: string;
    url: string;
    mimeType?: string;
    size?: number;
    duration?: number;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  }[];

  /** Legacy room-wide flag: true once the recipient has read the message. */
  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  readBy?: mongoose.Types.ObjectId;

  @Prop({ type: [String], default: [] })
  moderationFlags?: string[];

  @Prop({ type: Number, default: 0 })
  moderationScore?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// History (keyset on _id) — the query the app actually runs
ChatMessageSchema.index({ roomId: 1, _id: -1 }, { name: 'roomId_id' });
// Legacy/admin paths
ChatMessageSchema.index({ roomRef: 1, createdAt: -1 }, { name: 'roomRef_createdAt' });
ChatMessageSchema.index({ roomId: 1, createdAt: -1 }, { name: 'roomId_createdAt' });
// Mark-read: unread messages from the other participant
ChatMessageSchema.index({ roomRef: 1, senderId: 1, isRead: 1 }, { name: 'roomRef_sender_isRead' });
// Idempotency
ChatMessageSchema.index(
  { roomRef: 1, senderId: 1, clientMessageId: 1 },
  {
    name: 'uniq_client_message',
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: 'string' } },
  },
);
// Existing indexes kept for now (drop after explain() confirms unused — see B15):
// { senderId: 1 }, { isRead: 1 }, { createdAt: -1 }, { roomRef: 1, isRead: 1 },
// { roomId: 1, isRead: 1 }, { senderId: 1, createdAt: -1 }
