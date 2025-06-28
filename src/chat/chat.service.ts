// chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage } from './schemas/chat.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatModel: Model<ChatMessage>,
  ) {}

  async createMessage(payload: {
    sender: string;
    receiver: string;
    message: string;
  }): Promise<ChatMessage> {
    const newMessage = new this.chatModel({
      sender: payload.sender,
      receiver: payload.receiver,
      message: payload.message,
    });
    return newMessage.save();
  }

  // Optional: method to retrieve chat history (sorted by creation time)
  async getMessages(): Promise<ChatMessage[]> {
    return this.chatModel.find().sort({ createdAt: 1 }).exec();
  }
}
