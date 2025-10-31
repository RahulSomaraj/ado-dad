import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { User } from '../users/schemas/user.schema';
import { ContentModerationService } from './services/content-moderation.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Ad.name) private readonly adModel: Model<AdDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly contentModerationService: ContentModerationService,
  ) {}

  /* =========================
   * Helpers
   * ========================= */

  private validateObjectId(id: string | Types.ObjectId, field: string): void {
    if (!id) {
      throw new BadRequestException(`Invalid ${field} format: ${id}`);
    }

    // Convert to string if it's an ObjectId instance
    const idString = typeof id === 'string' ? id : id.toString();

    if (!Types.ObjectId.isValid(idString)) {
      throw new BadRequestException(`Invalid ${field} format: ${idString}`);
    }
  }

  private makeRoomId(
    adId: string,
    initiatorId: string,
    adPosterId: string,
  ): string {
    return `chat_${adId}_${initiatorId}_${adPosterId}`;
  }

  private ensureStringId(id: unknown): string {
    if (id == null) throw new BadRequestException('ID is required');
    if (typeof id === 'string') return id;
    if (typeof (id as any)?.toString === 'function')
      return (id as any).toString();
    return String(id);
  }

  /** Throws if user is not room participant */
  private assertParticipant(room: ChatRoom, userId: string): void {
    const uid = userId?.toString();
    const isMember =
      room.initiatorId.toString() === uid || room.adPosterId.toString() === uid;
    if (!isMember) {
      throw new ForbiddenException('Not a participant of this room');
    }
  }

  /** Safe access for Map<string, string> or plain object */
  private getUserRoleFromRoom(room: ChatRoom, userId: string): UserRole | null {
    const roles: any = room.userRoles;
    if (!roles) return null;
    if (typeof roles.get === 'function') return roles.get(userId) ?? null;
    return roles[userId] ?? null;
  }

  /** Normalize update result check across mongoose versions */
  private ensureUpdated(res: any, notFoundMsg = 'Resource not found') {
    const matched = res?.matchedCount ?? res?.n ?? 0;
    if (!matched) throw new NotFoundException(notFoundMsg);
  }

  /* =========================
   * Chat Room APIs
   * ========================= */

  /**
   * Create (or revive) a chat room for an Ad.
   * Idempotent: if a room exists for (initiatorId, adId) it returns it (reviving if needed).
   */
  async createChatRoom(initiatorId: string, adId: string): Promise<ChatRoom> {
    try {
      this.validateObjectId(initiatorId, 'Initiator ID');
      this.validateObjectId(adId, 'Ad ID');

      const ad = await this.adModel
        .findById(adId)
        .lean<Ad & { _id: Types.ObjectId }>()
        .exec();
      if (!ad)
        throw new NotFoundException(`Advertisement not found with ID: ${adId}`);
      if (!(ad as any).isActive) {
        throw new BadRequestException(
          'Cannot create chat room for inactive advertisement',
        );
      }

      if (!ad.postedBy) {
        throw new BadRequestException(
          'Advertisement is missing poster information',
        );
      }
      if (!ad.category) {
        throw new BadRequestException(
          'Advertisement is missing category information',
        );
      }
      if (!ad.description || ad.description.trim() === '') {
        throw new BadRequestException(
          'Advertisement must have a valid description',
        );
      }
      if (typeof (ad as any).price !== 'number' || (ad as any).price < 0) {
        throw new BadRequestException('Advertisement must have a valid price');
      }
      if (
        (ad as any).location == null ||
        (typeof (ad as any).location === 'string' &&
          (ad as any).location.trim() === '')
      ) {
        throw new BadRequestException(
          'Advertisement must have a valid location',
        );
      }

      const adPosterId = this.ensureStringId(ad.postedBy);
      this.validateObjectId(adPosterId, 'Ad poster ID');
      // Removed self-chat validation - users can now create chat rooms with themselves
      // if (initiatorId === adPosterId) {
      //   throw new BadRequestException('Cannot create chat room with yourself');
      // }

      // Try to find existing room (unique index on { initiatorId, adId } is recommended)
      const existing = await this.chatRoomModel.findOne({
        initiatorId: new Types.ObjectId(initiatorId),
        adId: new Types.ObjectId(adId),
      });

      if (existing) {
        if (existing.status !== ChatRoomStatus.ACTIVE) {
          await this.chatRoomModel.updateOne(
            { _id: existing._id },
            {
              status: ChatRoomStatus.ACTIVE,
              $currentDate: { updatedAt: true },
            },
          );
          this.logger.log(`Reactivated chat room: ${existing.roomId}`);
          existing.status = ChatRoomStatus.ACTIVE;
        }
        return existing;
      }

      const roomId = this.makeRoomId(adId, initiatorId, adPosterId);

      const chatRoom = await this.chatRoomModel.create({
        roomId,
        initiatorId: new Types.ObjectId(initiatorId),
        adId: new Types.ObjectId(adId),
        adPosterId: new Types.ObjectId(adPosterId),
        participants: [
          new Types.ObjectId(initiatorId),
          new Types.ObjectId(adPosterId),
        ], // prefer ObjectId[]
        userRoles: new Map<string, UserRole>([
          [initiatorId, UserRole.INITIATOR],
          [adPosterId, UserRole.RECEIVER],
        ]),
        status: ChatRoomStatus.ACTIVE,
        messageCount: 0,
        lastMessageAt: null,
      });

      this.logger.log(`Created chat room: ${chatRoom.roomId}`);
      return chatRoom;
    } catch (err: any) {
      // Handle duplicate-key race (if unique index exists)
      if (err?.code === 11000) {
        this.logger.warn(
          `Duplicate room create raced; loading existing. Details: ${err?.message}`,
        );
        const room = await this.chatRoomModel.findOne({
          initiatorId: new Types.ObjectId(initiatorId),
          adId: new Types.ObjectId(adId),
        });
        if (room) return room;
      }
      this.logger.error(`Error creating chat room: ${err?.message}`);
      throw err;
    }
  }

  /** Get a chat room by its string roomId (human id) */
  async getChatRoom(roomId: string): Promise<ChatRoom> {
    const room = await this.chatRoomModel.findOne({ roomId });
    if (!room) throw new NotFoundException('Chat room not found');
    return room;
  }

  /** Find a chat room by initiator and ad */
  async getChatRoomByInitiatorAndAd(
    initiatorId: string,
    adId: string,
  ): Promise<ChatRoom | null> {
    this.validateObjectId(initiatorId, 'Initiator ID');
    this.validateObjectId(adId, 'Ad ID');
    return this.chatRoomModel.findOne({
      initiatorId: new Types.ObjectId(initiatorId),
      adId: new Types.ObjectId(adId),
    });
  }

  /** Get all ACTIVE rooms for a user (as initiator or ad poster) sorted by recency with enhanced data */
  async getUserChatRooms(userId: string | Types.ObjectId): Promise<any[]> {
    console.log('getUserChatRooms - userId:', userId, 'type:', typeof userId);
    this.validateObjectId(userId, 'User ID');

    // Convert userId to ObjectId for proper comparison
    const userIdObjectId =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // Get chat rooms with basic info
    const chatRooms = await this.chatRoomModel
      .find({
        $or: [{ initiatorId: userIdObjectId }, { adPosterId: userIdObjectId }],
        status: ChatRoomStatus.ACTIVE,
      })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .exec();

    // Enhance each room with user details and latest message
    const enhancedRooms = await Promise.all(
      chatRooms.map(async (room) => {
        // Get the other user (not the current user)
        const otherUserId = room.initiatorId.equals(userIdObjectId)
          ? room.adPosterId
          : room.initiatorId;

        // Get user details
        const otherUser = await this.userModel
          .findById(otherUserId)
          .select('name profilePic email')
          .lean()
          .exec();

        // Get latest message
        const latestMessage = await this.chatMessageModel
          .findOne({ roomId: room.roomId })
          .sort({ createdAt: -1 })
          .select('content type createdAt')
          .lean()
          .exec();

        // Get ad details
        const adDetails = await this.adModel
          .findById(room.adId)
          .select('title description price images category')
          .lean()
          .exec();

        return {
          roomId: room.roomId,
          initiatorId: room.initiatorId,
          adId: room.adId,
          adPosterId: room.adPosterId,
          participants: room.participants,
          status: room.status,
          lastMessageAt: room.lastMessageAt,
          messageCount: room.messageCount,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          // Enhanced data
          otherUser: otherUser
            ? {
                id: otherUser._id,
                name: otherUser.name,
                profilePic: otherUser.profilePic,
                email: otherUser.email,
              }
            : null,
          latestMessage: latestMessage
            ? {
                content: latestMessage.content,
                type: latestMessage.type,
                createdAt: (latestMessage as any).createdAt,
              }
            : null,
          adDetails: adDetails
            ? {
                id: adDetails._id,
                title: adDetails.title,
                description: adDetails.description,
                price: adDetails.price,
                images: adDetails.images,
                category: adDetails.category,
              }
            : null,
        };
      }),
    );

    return enhancedRooms;
  }

  /** Check if a chat room already exists between initiator and ad poster for a specific ad */
  async findExistingChatRoom(
    initiatorId: string | Types.ObjectId,
    adId: string | Types.ObjectId,
    otherUserId: string | Types.ObjectId,
  ): Promise<ChatRoom | null> {
    this.validateObjectId(initiatorId, 'Initiator ID');
    this.validateObjectId(adId, 'Ad ID');
    this.validateObjectId(otherUserId, 'Other User ID');

    // Check if room exists where either user can be initiator or poster
    const existingRoom = await this.chatRoomModel
      .findOne({
        adId: new Types.ObjectId(adId),
        $or: [
          // Case 1: initiatorId is initiator, otherUserId is poster
          {
            initiatorId: new Types.ObjectId(initiatorId),
            adPosterId: new Types.ObjectId(otherUserId),
          },
          // Case 2: otherUserId is initiator, initiatorId is poster
          {
            initiatorId: new Types.ObjectId(otherUserId),
            adPosterId: new Types.ObjectId(initiatorId),
          },
        ],
        status: ChatRoomStatus.ACTIVE,
      })
      .exec();

    if (existingRoom) {
      this.logger.log(
        `Found existing chat room: ${existingRoom.roomId} for users ${initiatorId} and ${otherUserId} with ad ${adId}`,
      );
    }

    console.log('existingRoom', existingRoom);

    return existingRoom;
  }

  /** Get ad by ID */
  async getAdById(adId: string | Types.ObjectId): Promise<any> {
    this.validateObjectId(adId, 'Ad ID');

    const ad = await this.adModel.findById(adId).lean().exec();

    return ad;
  }

  /** Deactivate all rooms for an ad (e.g., ad sold/removed) */
  async deactivateChatRoom(adId: string): Promise<void> {
    this.validateObjectId(adId, 'Ad ID');
    const res = await this.chatRoomModel.updateMany(
      { adId: new Types.ObjectId(adId) },
      { status: ChatRoomStatus.INACTIVE, $currentDate: { updatedAt: true } },
    );
    // Not throwing if none matched — deactivation is idempotent
    this.logger.log(
      `Deactivated chat rooms for ad ${adId} (matched: ${(res as any).matchedCount ?? (res as any).n ?? 0})`,
    );
  }

  /** Archive a room by roomId */
  async archiveChatRoom(roomId: string): Promise<void> {
    const res = await this.chatRoomModel.updateOne(
      { roomId },
      { status: ChatRoomStatus.ARCHIVED, $currentDate: { updatedAt: true } },
    );
    this.ensureUpdated(res, 'Chat room not found');
    this.logger.log(`Archived chat room ${roomId}`);
  }

  /** Update a room status (validates enum) */
  async updateChatRoomStatus(roomId: string, status: string): Promise<void> {
    if (!Object.values(ChatRoomStatus).includes(status as ChatRoomStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    const res = await this.chatRoomModel.updateOne(
      { roomId },
      { status: status as ChatRoomStatus, $currentDate: { updatedAt: true } },
    );
    this.ensureUpdated(res, 'Chat room not found');
    this.logger.log(`Updated chat room ${roomId} status to ${status}`);
  }

  /* =========================
   * Messaging
   * ========================= */

  /**
   * Send message to a room.
   * - Validates membership and room status.
   * - Moderates content.
   * - Writes message with (roomRef = ChatRoom._id) and `roomId` (string) denormalized for querying if needed.
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
  ): Promise<ChatMessage> {
    this.validateObjectId(senderId, 'Sender ID');

    const room = await this.getChatRoom(roomId);
    if (room.status !== ChatRoomStatus.ACTIVE) {
      throw new BadRequestException('Chat room is not active');
    }
    this.assertParticipant(room, senderId);

    // Content moderation
    const moderation = await this.contentModerationService.moderateContent(
      content,
      senderId,
    );
    if (!moderation.isApproved) {
      throw new BadRequestException(`Content rejected: ${moderation.reason}`);
    }

    const msg = await this.chatMessageModel.create({
      roomRef: (room as any)._id, // ObjectId reference to ChatRoom
      roomId: room.roomId, // denormalized string id for convenience
      senderId: new Types.ObjectId(senderId),
      type,
      content,
      isRead: false,
      moderationFlags: moderation.flags?.length ? moderation.flags : undefined,
      moderationScore: moderation.score,
    });

    await this.chatRoomModel.updateOne(
      { _id: (room as any)._id },
      {
        lastMessageAt: new Date(),
        $inc: { messageCount: 1 },
        $currentDate: { updatedAt: true },
      },
    );

    this.logger.log(`Message ${msg._id} sent in room ${roomId} by ${senderId}`);
    return msg;
  }

  /**
   * Get messages for a room with keyset pagination and sender details.
   * - cursor = last seen message _id (string); returns newer->older (descending by _id).
   * - Includes sender information for each message
   */
  async getRoomMessages(
    roomId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{
    messages: any[];
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const room = await this.getChatRoom(roomId);

    const query: any = { roomRef: (room as any)._id };
    if (cursor) {
      this.validateObjectId(cursor, 'Cursor');
      query._id = { $lt: new Types.ObjectId(cursor) }; // descending stream
    }

    // Get total count for this room
    const total = await this.chatMessageModel.countDocuments({
      roomId: room.roomId,
    });

    // First, let's try a simple query to see if messages exist
    const simpleQuery: any = { roomId: room.roomId };
    if (cursor) {
      simpleQuery._id = { $lt: new Types.ObjectId(cursor) };
    }

    // Get messages with sender details using aggregation
    const pipeline: any[] = [
      { $match: simpleQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'sender',
        },
      },
      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          roomId: 1,
          senderId: 1,
          type: 1,
          content: 1,
          attachments: 1,
          isRead: 1,
          readAt: 1,
          createdAt: 1,
          updatedAt: 1,
          sender: {
            _id: '$sender._id',
            name: '$sender.name',
            email: '$sender.email',
            profilePic: '$sender.profilePic',
          },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: Math.min(Math.max(limit, 1), 200) + 1 },
    ];

    const docs = await this.chatMessageModel.aggregate(pipeline).exec();

    const hasMore = docs.length > limit;
    const messages = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore
      ? messages[messages.length - 1]._id.toString()
      : null;

    return { messages, nextCursor, hasMore, total };
  }

  /**
   * Mark messages as read up to (and including) lastReadMessageId.
   * NOTE: This is a global read flag (room-wide). For per-user receipts, add a separate data model.
   */
  async markMessagesAsRead(
    roomId: string,
    lastReadMessageId: string,
  ): Promise<void> {
    this.validateObjectId(lastReadMessageId, 'Last read message ID');
    const room = await this.getChatRoom(roomId);

    await this.chatMessageModel.updateMany(
      {
        roomRef: (room as any)._id,
        _id: { $lte: new Types.ObjectId(lastReadMessageId) },
        isRead: false,
      },
      { isRead: true, readAt: new Date() },
    );
  }

  /** Count unread messages (room-wide) */
  async getUnreadCount(roomId: string): Promise<number> {
    const room = await this.getChatRoom(roomId);
    return this.chatMessageModel.countDocuments({
      roomRef: (room as any)._id,
      isRead: false,
    });
  }

  /** Role lookup */
  async getUserRole(roomId: string, userId: string): Promise<UserRole | null> {
    this.validateObjectId(userId, 'User ID');
    const room = await this.getChatRoom(roomId);
    return this.getUserRoleFromRoom(room, userId);
  }

  /** No-op hooks for now — useful to extend with presence/notifications later */
  async joinChatRoom(roomId: string, userId: string): Promise<void> {
    this.validateObjectId(userId, 'User ID');
    const room = await this.getChatRoom(roomId);
    this.assertParticipant(room, userId);
    this.logger.log(`User ${userId} joined room ${roomId}`);
  }

  async leaveChatRoom(roomId: string, userId: string): Promise<void> {
    this.validateObjectId(userId, 'User ID');
    const room = await this.getChatRoom(roomId);
    this.assertParticipant(room, userId);
    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  /* =========================
   * Admin / Export
   * ========================= */

  /** Admin: list rooms with keyset pagination */
  async listChatRoomsForAdmin(
    filters: {
      userId?: string;
      adId?: string;
      status?: string;
      from?: Date;
      to?: Date;
    },
    cursor?: string,
    limit = 50,
  ): Promise<{
    rooms: any[]; // Lean query results
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const q: any = {};
    if (filters.userId) {
      this.validateObjectId(filters.userId, 'userId');
      q.$or = [
        { initiatorId: new Types.ObjectId(filters.userId) },
        { adPosterId: new Types.ObjectId(filters.userId) },
      ];
    }
    if (filters.adId) {
      this.validateObjectId(filters.adId, 'adId');
      q.adId = new Types.ObjectId(filters.adId);
    }
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.createdAt = {};
      if (filters.from) q.createdAt.$gte = filters.from;
      if (filters.to) q.createdAt.$lte = filters.to;
    }
    if (cursor) {
      this.validateObjectId(cursor, 'Cursor');
      q._id = { $lt: new Types.ObjectId(cursor) };
    }

    const docs = await this.chatRoomModel
      .find(q)
      .sort({ _id: -1 })
      .limit(Math.min(Math.max(limit, 1), 200) + 1)
      .lean()
      .exec();

    const hasMore = docs.length > limit;
    const rooms = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? rooms[rooms.length - 1]._id.toString() : null;

    const total = await this.chatRoomModel.countDocuments(q);
    return { rooms, nextCursor, hasMore, total };
  }

  /** Admin: get messages for a room with keyset pagination */
  async getRoomMessagesForAdmin(
    roomId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{
    messages: ChatMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const room = await this.getChatRoom(roomId);

    const q: any = { roomRef: (room as any)._id };
    if (cursor) {
      this.validateObjectId(cursor, 'Cursor');
      q._id = { $lt: new Types.ObjectId(cursor) };
    }

    const docs = await this.chatMessageModel
      .find(q)
      .sort({ _id: -1 })
      .limit(Math.min(Math.max(limit, 1), 200) + 1)
      .lean()
      .exec();

    const hasMore = docs.length > limit;
    const messages = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore
      ? messages[messages.length - 1]._id.toString()
      : null;

    return { messages, nextCursor, hasMore };
  }

  /**
   * Admin: export rooms + message counts efficiently
   * Returns raw rooms plus aggregate message total for matched rooms.
   */
  async exportChatData(filters: {
    userId?: string;
    adId?: string;
    status?: string;
    from?: Date;
    to?: Date;
  }): Promise<{
    rooms: any[]; // Lean query results
    totalRooms: number;
    totalMessages: number;
  }> {
    const q: any = {};
    if (filters.userId) {
      this.validateObjectId(filters.userId, 'userId');
      q.$or = [
        { initiatorId: new Types.ObjectId(filters.userId) },
        { adPosterId: new Types.ObjectId(filters.userId) },
      ];
    }
    if (filters.adId) {
      this.validateObjectId(filters.adId, 'adId');
      q.adId = new Types.ObjectId(filters.adId);
    }
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.createdAt = {};
      if (filters.from) q.createdAt.$gte = filters.from;
      if (filters.to) q.createdAt.$lte = filters.to;
    }

    const rooms = await this.chatRoomModel.find(q).lean().exec();
    const totalRooms = rooms.length;
    if (!totalRooms) return { rooms, totalRooms: 0, totalMessages: 0 };

    // Efficient count across matched rooms using aggregation on ChatMessage.roomRef
    const roomObjectIds = rooms.map((r: any) => r._id);
    const agg = await this.chatMessageModel.aggregate<{ total: number }>([
      { $match: { roomRef: { $in: roomObjectIds } } },
      { $group: { _id: null, total: { $sum: 1 } } },
      { $project: { _id: 0, total: 1 } },
    ]);
    const totalMessages = agg[0]?.total ?? 0;

    return { rooms, totalRooms, totalMessages };
  }
}
