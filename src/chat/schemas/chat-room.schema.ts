import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

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

@Schema({ timestamps: true })
export class ChatRoom {
  @Prop({ required: true, unique: true })
  roomId: string; // Format: chat_${initiatorId}_${adId}

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  initiatorId: mongoose.Types.ObjectId; // User who started the chat

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true })
  adId: mongoose.Types.ObjectId; // Advertisement being discussed

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  adPosterId: mongoose.Types.ObjectId; // Person who created the ad

  @Prop({ type: [String], required: true })
  participants: string[]; // Array of user IDs: [initiatorId, adPosterId]

  @Prop({ type: Map, of: String, default: new Map() })
  userRoles: Map<string, UserRole>; // userId -> role mapping

  @Prop({
    required: true,
    enum: ChatRoomStatus,
    default: ChatRoomStatus.ACTIVE,
  })
  status: ChatRoomStatus;

  @Prop({ type: Date })
  lastMessageAt?: Date;

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  // Timestamps added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// Indexes for fast lookups
ChatRoomSchema.index({ roomId: 1 }, { unique: true });
ChatRoomSchema.index({ initiatorId: 1, adId: 1 }, { unique: true });
ChatRoomSchema.index({ adId: 1 });
ChatRoomSchema.index({ adPosterId: 1 });
ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ status: 1 });
ChatRoomSchema.index({ lastMessageAt: -1 });
ChatRoomSchema.index({ createdAt: -1 });

// Compound indexes
ChatRoomSchema.index({ initiatorId: 1, status: 1 });
ChatRoomSchema.index({ adPosterId: 1, status: 1 });
ChatRoomSchema.index({ adId: 1, status: 1 });
