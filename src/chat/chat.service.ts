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

  async createChat(
    participants: Types.ObjectId[],
    contextType: string,
    contextId: string,
  ) {
    const chat = new this.chatModel({ participants, contextType, contextId });
    return chat.save();
  }

  async findOrCreateChat(
    participants: Types.ObjectId[],
    contextType: string,
    contextId: string,
  ) {
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

  async createAdChat(adId: string, adPosterId: string, viewerId: string) {
    const participants = [
      new Types.ObjectId(adPosterId),
      new Types.ObjectId(viewerId),
    ];
    return this.findOrCreateChat(participants, 'ad', adId);
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
    return this.messageModel
      .find({ chat: chatId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getUserChats(userId: string) {
    return this.chatModel
      .find({ participants: userId })
      .populate('participants', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getAdChats(adId: string) {
    return this.chatModel
      .find({ contextType: 'ad', contextId: adId })
      .populate('participants', 'name email')
      .exec();
  }

  async getChatById(chatId: string) {
    return this.chatModel
      .findById(chatId)
      .populate('participants', 'name email')
      .exec();
  }

  async getChatsForUser(userId: string, contextType?: string) {
    const query: any = { participants: userId };
    if (contextType) {
      query.contextType = contextType;
    }

    return this.chatModel
      .find(query)
      .populate('participants', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getUnreadMessageCount(chatId: string, userId: string) {
    return this.messageModel.countDocuments({
      chat: chatId,
      sender: { $ne: userId },
      read: { $ne: true },
    });
  }

  async markMessagesAsRead(chatId: string, userId: string) {
    return this.messageModel.updateMany(
      { chat: chatId, sender: { $ne: userId }, read: { $ne: true } },
      { read: true },
    );
  }
}
