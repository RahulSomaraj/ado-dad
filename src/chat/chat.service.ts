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
    const savedChat = await chat.save();
    console.log('✅ Chat saved to database:', savedChat._id);
    return savedChat;
  }

  async findOrCreateChat(
    participants: Types.ObjectId[],
    contextType: string,
    contextId: string,
    postId?: string,
  ) {
    console.log(
      '🔍 Looking for existing chat with participants:',
      participants.map((p) => p.toString()),
    );

    // Normalize and sort participants deterministically for unique index
    const participantsSorted = participants
      .map((p) => p.toString())
      .sort()
      .map((id) => new Types.ObjectId(id));

    const filter: any = {
      participants: participantsSorted,
      contextType,
      contextId,
    };

    const update: any = {
      $setOnInsert: {
        participants: participantsSorted,
        contextType,
        contextId,
        postId: postId ?? undefined,
      },
    };

    const options = {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    } as const;

    const chat = await this.chatModel
      .findOneAndUpdate(filter, update, options)
      .exec();
    console.log('✅ Upserted chat:', (chat as any)?._id);
    return chat;
  }

  async createAdChat(adId: string, viewerId: string) {
    // Get the ad to find the poster ID
    const ad = await this.getAdById(adId);
    if (!ad) {
      throw new Error('Ad not found');
    }

    const adPosterId = ad.postedBy.toString();
    const participants = [
      new Types.ObjectId(adPosterId),
      new Types.ObjectId(viewerId),
    ];

    const chat = await this.findOrCreateChat(participants, 'ad', adId, adId);

    // Return chat with participant information
    return {
      chat,
      adPosterId,
      viewerId,
      isNewChat:
        (chat as any).createdAt && (chat as any).updatedAt
          ? (chat as any).createdAt.getTime() ===
            (chat as any).updatedAt.getTime()
          : true, // If timestamps are missing, assume it's a new chat
    };
  }

  private async getAdById(adId: string) {
    // Import the Ad model dynamically to avoid circular dependencies
    const { Ad } = await import('../ads/schemas/ad.schema');
    const adModel = this.chatModel.db.model(Ad.name);
    return adModel.findById(adId);
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

  async sendMessage(chatId: string, userId: string, content: string) {
    // Ensure sender is participant and not blocked
    const chat = await this.chatModel.findById(chatId).lean();
    if (!chat) throw new Error('Chat not found');
    const isParticipant = (chat as any).participants
      .map((id: any) => id.toString())
      .includes(userId.toString());
    if (!isParticipant) throw new Error('Not a chat participant');

    // Check if either user blocked the other
    const [a, b] = (chat as any).participants.map((id: any) => id.toString());
    const blocked = ((chat as any).blocks || []).some(
      (blk: any) =>
        (blk.blocker.toString() === a && blk.blocked.toString() === b) ||
        (blk.blocker.toString() === b && blk.blocked.toString() === a),
    );
    if (blocked) throw new Error('Messaging is blocked in this chat');

    const message = new this.messageModel({
      chat: new Types.ObjectId(chatId),
      sender: new Types.ObjectId(userId),
      content,
    });
    const savedMessage = await message.save();
    return await savedMessage.populate('sender', 'name email');
  }

  async getMessages(
    chatId: string,
    page = 1,
    limit = 50,
  ): Promise<Array<Message & { _id: Types.ObjectId }>> {
    const skip = Math.max(0, (page - 1) * limit);
    const docs = await this.messageModel
      .find({ chat: new Types.ObjectId(chatId) })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email')
      .exec();
    return docs as unknown as Array<Message & { _id: Types.ObjectId }>;
  }

  async getUserChats(userId: string) {
    const chats = await this.chatModel
      .find({ participants: userId })
      .populate('participants', 'name email')
      .sort({ updatedAt: -1 })
      .exec();

    // Format chats with better information
    return chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (participant: any) => participant._id.toString() !== userId,
      );

      return {
        _id: chat._id,
        contextType: chat.contextType,
        contextId: chat.contextId,
        participants: chat.participants,
        otherUser: otherParticipant
          ? {
              id: otherParticipant._id,
              name: (otherParticipant as any).name || 'Unknown User',
              email: (otherParticipant as any).email || 'No email',
            }
          : null,
        createdAt: (chat as any).createdAt || new Date(),
        updatedAt: (chat as any).updatedAt || new Date(),
        lastMessage: null, // Will be populated separately if needed
      };
    });
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

  async getUserChatsWithLastMessage(userId: string) {
    const chats = await this.getUserChats(userId);

    // Get last message for each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await this.messageModel
          .findOne({ chat: chat._id })
          .populate('sender', 'name email')
          .sort({ createdAt: -1 })
          .exec();

        return {
          ...chat,
          lastMessage: lastMessage
            ? {
                id: lastMessage._id,
                content: lastMessage.content,
                sender: {
                  id: lastMessage.sender._id,
                  name: (lastMessage.sender as any).name || 'Unknown User',
                },
                createdAt: (lastMessage as any).createdAt || new Date(),
              }
            : null,
        };
      }),
    );

    return chatsWithLastMessage;
  }

  async isParticipant(chatId: string, userId: string): Promise<boolean> {
    const chat = await this.chatModel.findById(chatId).select('participants');
    if (!chat) return false;
    return (chat.participants || []).some(
      (p: any) => p?.toString?.() === userId.toString(),
    );
  }
}
