import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatRoom,
  ChatRoomDocument,
  ChatRoomStatus,
  UserRole,
} from './schemas/chat-room.schema';
import {
  ChatMessage,
  ChatMessageDocument,
  MessageType,
} from './schemas/chat-message.schema';
import { Ad, AdDocument } from '../ads/schemas/ad.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Ad.name) private adModel: Model<AdDocument>,
  ) {}

  /**
   * Create a new chat room for an advertisement
   */
  async createChatRoom(initiatorId: string, adId: string): Promise<ChatRoom> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(adId)) {
        throw new BadRequestException(
          `Invalid Ad ID format: ${adId}. Must be a valid 24-character MongoDB ObjectId.`,
        );
      }

      if (!Types.ObjectId.isValid(initiatorId)) {
        throw new BadRequestException(
          `Invalid Initiator ID format: ${initiatorId}. Must be a valid 24-character MongoDB ObjectId.`,
        );
      }

      // Validate ad exists and is active
      const ad = await this.adModel.findById(adId);
      if (!ad) {
        throw new NotFoundException(`Advertisement not found with ID: ${adId}`);
      }

      if (!ad.isActive) {
        throw new BadRequestException('Advertisement is not active');
      }

      const adPosterId = ad.postedBy.toString();

      // Check if chat room already exists for this initiator and ad
      const existingRoom = await this.chatRoomModel.findOne({
        initiatorId: new Types.ObjectId(initiatorId),
        adId: new Types.ObjectId(adId),
      });

      if (existingRoom) {
        this.logger.log(`Chat room already exists: ${existingRoom.roomId}`);
        return existingRoom;
      }

      // Create unique room ID
      const roomId = `chat_${initiatorId}_${adId}`;

      // Create participants array
      const participants = [initiatorId, adPosterId];

      // Create user roles mapping
      const userRoles = new Map<string, UserRole>();
      userRoles.set(initiatorId, UserRole.INITIATOR);
      userRoles.set(adPosterId, UserRole.RECEIVER);

      // Create new chat room
      const chatRoom = new this.chatRoomModel({
        roomId,
        initiatorId: new Types.ObjectId(initiatorId),
        adId: new Types.ObjectId(adId),
        adPosterId: new Types.ObjectId(adPosterId),
        participants,
        userRoles,
        status: ChatRoomStatus.ACTIVE,
      });

      const savedRoom = await chatRoom.save();
      this.logger.log(`Created chat room: ${savedRoom.roomId}`);

      return savedRoom;
    } catch (error) {
      this.logger.error(`Error creating chat room: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat room by room ID
   */
  async getChatRoom(roomId: string): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomModel.findOne({ roomId });
    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }
    return chatRoom;
  }

  /**
   * Get chat room by initiator and ad
   */
  async getChatRoomByInitiatorAndAd(
    initiatorId: string,
    adId: string,
  ): Promise<ChatRoom | null> {
    return await this.chatRoomModel.findOne({
      initiatorId: new Types.ObjectId(initiatorId),
      adId: new Types.ObjectId(adId),
    });
  }

  /**
   * Get all chat rooms for a user (as initiator or ad poster)
   */
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    return await this.chatRoomModel
      .find({
        $or: [
          { initiatorId: new Types.ObjectId(userId) },
          { adPosterId: new Types.ObjectId(userId) },
        ],
        status: ChatRoomStatus.ACTIVE,
      })
      .sort({ lastMessageAt: -1, createdAt: -1 });
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
  ): Promise<ChatMessage> {
    // Verify chat room exists and is active
    const chatRoom = await this.getChatRoom(roomId);
    if (chatRoom.status !== ChatRoomStatus.ACTIVE) {
      throw new BadRequestException('Chat room is not active');
    }

    // Verify sender is a participant
    if (!chatRoom.participants.includes(senderId)) {
      throw new BadRequestException(
        'User is not a participant in this chat room',
      );
    }

    // Create message
    const message = new this.chatMessageModel({
      roomId: new Types.ObjectId(roomId),
      senderId: new Types.ObjectId(senderId),
      content,
      type,
    });

    const savedMessage = await message.save();

    // Update chat room
    await this.chatRoomModel.updateOne(
      { roomId },
      {
        lastMessageAt: new Date(),
        $inc: { messageCount: 1 },
      },
    );

    this.logger.log(`Message sent in room ${roomId} by ${senderId}`);
    return savedMessage;
  }

  /**
   * Get messages for a chat room
   */
  async getRoomMessages(
    roomId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChatMessage[]> {
    return await this.chatMessageModel
      .find({ roomId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    await this.chatMessageModel.updateMany(
      {
        roomId: new Types.ObjectId(roomId),
        senderId: { $ne: new Types.ObjectId(userId) },
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
        readBy: new Types.ObjectId(userId),
      },
    );
  }

  /**
   * Deactivate chat room (when ad is deleted/sold)
   */
  async deactivateChatRoom(adId: string): Promise<void> {
    await this.chatRoomModel.updateMany(
      { adId: new Types.ObjectId(adId) },
      { status: ChatRoomStatus.INACTIVE },
    );
    this.logger.log(`Deactivated chat rooms for ad: ${adId}`);
  }

  /**
   * Get user role in a chat room
   */
  async getUserRole(roomId: string, userId: string): Promise<UserRole | null> {
    const chatRoom = await this.getChatRoom(roomId);
    return chatRoom.userRoles.get(userId) || null;
  }
}
