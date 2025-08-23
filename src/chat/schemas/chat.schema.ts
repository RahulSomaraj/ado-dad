// chat-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Chat extends Document {
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ required: true })
  contextType: string; // e.g., 'vehicle', 'product', 'support', etc.

  @Prop({ required: true })
  contextId: string; // the ID of the referenced entity

  // Optional: store post/ad id explicitly when applicable
  @Prop({ required: false })
  postId?: string;

  // Blocking info: array of pairs (blocker -> blocked)
  @Prop({
    type: [
      {
        blocker: { type: Types.ObjectId, ref: 'User', required: true },
        blocked: { type: Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  blocks: { blocker: Types.ObjectId; blocked: Types.ObjectId; at: Date }[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
