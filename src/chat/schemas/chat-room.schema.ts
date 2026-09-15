import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

export enum ChatRoomStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum UserRole {
  INITIATOR = 'initiator',
  RECEIVER = 'receiver',
}

/** Denormalised preview of the newest message — lets the room list render without a per-room query. */
export class ChatRoomLastMessage {
  id: mongoose.Types.ObjectId;
  type: string;
  preview: string;
  senderId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LastMessageSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String },
    preview: { type: String },
    senderId: { type: mongoose.Schema.Types.ObjectId },
    createdAt: { type: Date },
  },
  { _id: false },
);

@Schema({ timestamps: true })
export class ChatRoom {
  @Prop({ required: true, unique: true })
  roomId: string; // human-readable id used by clients

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  initiatorId: mongoose.Types.ObjectId; // buyer — user who opened the chat

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true })
  adId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  adPosterId: mongoose.Types.ObjectId; // seller

  @Prop({ type: [String], required: true })
  participants: string[];

  @Prop({ type: Map, of: String, default: new Map() })
  userRoles: Map<string, UserRole>;

  @Prop({ required: true, enum: ChatRoomStatus, default: ChatRoomStatus.ACTIVE })
  status: ChatRoomStatus;

  @Prop({ type: Date })
  lastMessageAt?: Date;

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  @Prop({ type: LastMessageSchema, required: false })
  lastMessage?: ChatRoomLastMessage;

  /** Unread message count per participant: `{ [userId]: n }`. */
  @Prop({ type: Map, of: Number, default: new Map() })
  unreadCounts: Map<string, number>;

  /** When each participant last read the room: `{ [userId]: Date }`. */
  @Prop({ type: Map, of: Date, default: new Map() })
  lastReadAt: Map<string, Date>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// NOTE: roomId already has a unique index from @Prop({ unique: true })
ChatRoomSchema.index({ initiatorId: 1, adId: 1 }, { unique: true });
ChatRoomSchema.index({ adId: 1, status: 1 });
// Room list: participant + recency (one index per side of the $or)
ChatRoomSchema.index({ initiatorId: 1, lastMessageAt: -1, _id: -1 });
ChatRoomSchema.index({ adPosterId: 1, lastMessageAt: -1, _id: -1 });
