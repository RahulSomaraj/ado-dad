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
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
