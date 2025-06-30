// chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat } from './schemas/chat.schema';
import { Message } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createChat(participants: Types.ObjectId[], contextType: string, contextId: string) {
    const chat = new this.chatModel({ participants, contextType, contextId });
    return chat.save();
  }

  async findOrCreateChat(participants: Types.ObjectId[], contextType: string, contextId: string) {
    let chat = await this.chatModel.findOne({
      participants: { $all: participants, $size: 2 },
      contextType,
      contextId,
    });
    if (!chat) {
      chat = await this.createChat(participants, contextType, contextId);
    }
    return chat;
  }

  async sendMessage(chatId: string, senderId: string, content: string) {
    const message = new this.messageModel({
      chat: chatId,
      sender: senderId,
      content,
    });
    return message.save();
  }

  async getMessages(chatId: string) {
    return this.messageModel.find({ chat: chatId }).sort({ createdAt: 1 });
  }

  async getUserChats(userId: string) {
    return this.chatModel.find({ participants: userId });
  }
}
