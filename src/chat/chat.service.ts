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
    postId?: string,
  ) {
    const chat = new this.chatModel({
      participants,
      contextType,
      contextId,
      postId,
    });
    return chat.save();
  }

  async findOrCreateChat(
    participants: Types.ObjectId[],
    contextType: string,
    contextId: string,
    postId?: string,
  ) {
    let chat = await this.chatModel.findOne({
      participants: { $all: participants, $size: 2 },
      contextType,
      contextId,
    });
    if (!chat) {
      chat = await this.createChat(
        participants,
        contextType,
        contextId,
        postId,
      );
    }
    return chat;
  }

  async createAdChat(adId: string, adPosterId: string, viewerId: string) {
    const participants = [
      new Types.ObjectId(adPosterId),
      new Types.ObjectId(viewerId),
    ];
    return this.findOrCreateChat(participants, 'ad', adId, adId);
  }

  private isBlockedPair(
    chat: any,
    blocker: Types.ObjectId,
    blocked: Types.ObjectId,
  ): boolean {
    return (
      Array.isArray((chat as any).blocks) &&
      (chat as any).blocks.some(
        (b: any) =>
          b.blocker?.toString() === blocker.toString() &&
          b.blocked?.toString() === blocked.toString(),
      )
    );
  }

  async blockUser(chatId: string, blockerId: string, blockedId: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) return null;
    const blocker = new Types.ObjectId(blockerId);
    const blocked = new Types.ObjectId(blockedId);
    if (!this.isBlockedPair(chat, blocker, blocked)) {
      (chat as any).blocks.push({ blocker, blocked, at: new Date() });
      await chat.save();
    }
    return chat;
  }

  async unblockUser(chatId: string, blockerId: string, blockedId: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) return null;
    const blocker = new Types.ObjectId(blockerId);
    const blocked = new Types.ObjectId(blockedId);
    (chat as any).blocks = (chat as any).blocks?.filter(
      (b: any) =>
        !(
          b.blocker?.toString() === blocker.toString() &&
          b.blocked?.toString() === blocked.toString()
        ),
    );
    await chat.save();
    return chat;
  }

  async sendMessage(chatId: string, senderId: string, content: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) return null;
    const sender = new Types.ObjectId(senderId);
    const other = (
      chat.participants[0].toString() === sender.toString()
        ? chat.participants[1]
        : chat.participants[0]
    ) as Types.ObjectId;
    // Block enforcement
    if (
      this.isBlockedPair(chat, other, sender) ||
      this.isBlockedPair(chat, sender, other)
    ) {
      throw new Error('Messaging blocked between users');
    }
    const message = new this.messageModel({ chat: chat._id, sender, content });
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
