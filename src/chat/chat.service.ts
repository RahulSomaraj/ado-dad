import { assertSafePublicUrl } from '../common/security/url-safety.util';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import axios from 'axios';
import {
  ChatRoom,
  ChatRoomDocument,
  ChatRoomStatus,
  UserRole,
} from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageDocument, MessageType } from './schemas/chat-message.schema';
import { Ad, AdDocument } from '../ads/schemas/ad.schema';
import { ModerationStatus, User } from '../users/schemas/user.schema';
import { ContentModerationService } from './services/content-moderation.service';
import { S3Service } from '../shared/s3.service';
import { ChatError, ChatErrorCode } from './chat-errors';
import { AttachmentDto, SendMessageBodyDto } from './dto/send-message.dto';
import { ListRoomsQueryDto, RoomFilter } from './dto/chat-query.dto';

/* ---------------------------------------------------------------------------
 * View models returned to clients
 * ------------------------------------------------------------------------- */

export type AdAvailability = 'live' | 'sold' | 'unavailable';

export interface RoomView {
  roomId: string;
  adId: string;
  status: ChatRoomStatus;
  isClosed: boolean;
  myRole: 'buying' | 'selling';
  createdAt?: Date;
  updatedAt?: Date;
  lastMessageAt?: Date | null;
  unreadCount: number;
  otherUser: {
    id: string;
    name: string;
    profilePic?: string;
    phoneNumber?: string;
    countryCode?: string;
  } | null;
  ad: { id: string; title: string; price: number | null; image: string | null; status: AdAvailability } | null;
  lastMessage: { id: string; type: string; preview: string; senderId: string; createdAt: Date } | null;
  // ---- legacy keys (store builds read these) ----
  initiatorId: string;
  adPosterId: string;
  participants: string[];
  messageCount: number;
  latestMessage: { content: string; type: string; createdAt: Date } | null;
  adDetails: { id: string; title: string; price: number | null; images: string[]; category?: string } | null;
}

export interface RoomListResult {
  rooms: RoomView[];
  nextCursor: string | null;
}

export interface SendResult {
  message: Record<string, any>;
  room: ChatRoomDocument | (ChatRoom & { _id: Types.ObjectId });
  recipientId: string;
  /** false when an identical clientMessageId was already stored (idempotent replay). */
  created: boolean;
}

const LEGACY_LIST_CAP = 200;
const PREVIEW_LEN = 120;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatRoom.name) private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name) private readonly chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Ad.name) private readonly adModel: Model<AdDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly contentModerationService: ContentModerationService,
    private readonly s3: S3Service,
  ) {}

  /* =========================================================================
   * Helpers
   * ======================================================================= */

  private validateObjectId(id: unknown, field: string): string {
    const idString = id == null ? '' : String(id);
    if (!Types.ObjectId.isValid(idString)) {
      throw new ChatError(ChatErrorCode.VALIDATION, `Invalid ${field}`);
    }
    return idString;
  }

  private makeRoomId(adId: string, initiatorId: string, adPosterId: string): string {
    return `chat_${adId}_${initiatorId}_${adPosterId}`;
  }

  isParticipant(room: Pick<ChatRoom, 'initiatorId' | 'adPosterId'>, userId: string): boolean {
    const uid = String(userId);
    return String(room.initiatorId) === uid || String(room.adPosterId) === uid;
  }

  private assertParticipant(room: Pick<ChatRoom, 'initiatorId' | 'adPosterId'>, userId: string): void {
    if (!this.isParticipant(room, userId)) {
      throw new ChatError(ChatErrorCode.NOT_PARTICIPANT, 'You are not part of this conversation');
    }
  }

  otherParticipant(room: Pick<ChatRoom, 'initiatorId' | 'adPosterId'>, userId: string): string {
    return String(room.initiatorId) === String(userId) ? String(room.adPosterId) : String(room.initiatorId);
  }

  private getUserRoleFromRoom(room: ChatRoom, userId: string): UserRole | null {
    const roles: any = room.userRoles;
    if (!roles) return null;
    if (typeof roles.get === 'function') return roles.get(userId) ?? null;
    return roles[userId] ?? null;
  }

  private mapValue<T>(map: any, key: string): T | undefined {
    if (!map) return undefined;
    if (typeof map.get === 'function') return map.get(key);
    return map[key];
  }

  static previewFor(type: string, content?: string): string {
    switch (type) {
      case MessageType.IMAGE:
        return content?.trim() ? `Photo · ${content.trim()}`.slice(0, PREVIEW_LEN) : 'Photo';
      case MessageType.AUDIO:
        return 'Voice message';
      case MessageType.FILE:
        return 'File';
      default:
        return (content ?? '').replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LEN);
    }
  }

  static adAvailability(ad: any): AdAvailability {
    if (!ad || ad.isDeleted || ad.isRemovedByAdmin) return 'unavailable';
    if (ad.soldOut) return 'sold';
    if (ad.isActive === false) return 'unavailable';
    return 'live';
  }

  private encodeCursor(at: Date | null | undefined, id: Types.ObjectId | string): string {
    const ts = at ? new Date(at).getTime() : 0;
    return Buffer.from(`${ts}|${String(id)}`).toString('base64url');
  }

  private decodeCursor(cursor: string): { at: Date; id: Types.ObjectId } {
    try {
      const [ts, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
      if (!Types.ObjectId.isValid(id) || Number.isNaN(Number(ts))) throw new Error('bad');
      return { at: new Date(Number(ts)), id: new Types.ObjectId(id) };
    } catch {
      throw new ChatError(ChatErrorCode.VALIDATION, 'Invalid cursor');
    }
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Throws SUSPENDED/UNAUTHORIZED when the account can't chat. */
  async assertCanChat(userId: string): Promise<void> {
    const user = await this.userModel
      .findById(userId)
      .select('isDeleted moderationStatus suspendedUntil')
      .lean<{ isDeleted?: boolean; moderationStatus?: ModerationStatus; suspendedUntil?: Date }>()
      .exec();
    if (!user || user.isDeleted) {
      throw new ChatError(ChatErrorCode.UNAUTHORIZED, 'Account not found');
    }
    const suspendedNow =
      user.moderationStatus === ModerationStatus.BANNED ||
      (user.moderationStatus === ModerationStatus.SUSPENDED &&
        !(user.suspendedUntil && new Date(user.suspendedUntil).getTime() <= Date.now()));
    if (suspendedNow) {
      throw new ChatError(ChatErrorCode.SUSPENDED, 'Your account cannot send messages right now');
    }
  }

  /* =========================================================================
   * Rooms
   * ======================================================================= */

  /**
   * Get-or-create the room for (initiator, ad). Idempotent; revives inactive rooms
   * when the ad is live again.
   */
  async createChatRoom(initiatorId: string, adId: string): Promise<ChatRoomDocument> {
    this.validateObjectId(initiatorId, 'user id');
    this.validateObjectId(adId, 'ad id');

    const ad = await this.adModel
      .findById(adId)
      .select('postedBy isActive soldOut isDeleted isRemovedByAdmin')
      .lean<any>()
      .exec();
    if (!ad) throw new ChatError(ChatErrorCode.AD_NOT_FOUND, 'This ad no longer exists');

    const existing = await this.chatRoomModel
      .findOne({ initiatorId: new Types.ObjectId(initiatorId), adId: new Types.ObjectId(adId) })
      .exec();
    if (existing) {
      if (existing.status !== ChatRoomStatus.ACTIVE && ChatService.adAvailability(ad) === 'live') {
        await this.chatRoomModel.updateOne(
          { _id: existing._id },
          { status: ChatRoomStatus.ACTIVE, $currentDate: { updatedAt: true } },
        );
        existing.status = ChatRoomStatus.ACTIVE;
      }
      return existing;
    }

    if (ChatService.adAvailability(ad) !== 'live') {
      throw new ChatError(ChatErrorCode.AD_UNAVAILABLE, 'This ad is no longer available');
    }
    if (!ad.postedBy) {
      throw new ChatError(ChatErrorCode.AD_UNAVAILABLE, 'This ad has no seller');
    }

    const adPosterId = String(ad.postedBy);
    const now = new Date();
    try {
      const room = await this.chatRoomModel.create({
        roomId: this.makeRoomId(adId, initiatorId, adPosterId),
        initiatorId: new Types.ObjectId(initiatorId),
        adId: new Types.ObjectId(adId),
        adPosterId: new Types.ObjectId(adPosterId),
        participants: [initiatorId, adPosterId],
        userRoles: new Map<string, UserRole>([
          [initiatorId, UserRole.INITIATOR],
          [adPosterId, UserRole.RECEIVER],
        ]),
        status: ChatRoomStatus.ACTIVE,
        messageCount: 0,
        // Set at creation so empty rooms sort by when they were opened.
        lastMessageAt: now,
        unreadCounts: new Map([
          [initiatorId, 0],
          [adPosterId, 0],
        ]),
      });
      this.logger.log(`Created chat room ${room.roomId}`);
      return room;
    } catch (err: any) {
      if (err?.code === 11000) {
        const raced = await this.chatRoomModel
          .findOne({ initiatorId: new Types.ObjectId(initiatorId), adId: new Types.ObjectId(adId) })
          .exec();
        if (raced) return raced;
      }
      throw err;
    }
  }

  /** Room by string roomId (no access check — callers must assert). */
  async getChatRoom(roomId: string): Promise<ChatRoomDocument> {
    if (typeof roomId !== 'string' || !roomId || roomId.length > 120) {
      throw new ChatError(ChatErrorCode.ROOM_NOT_FOUND, 'Conversation not found');
    }
    const room = await this.chatRoomModel.findOne({ roomId }).exec();
    if (!room) throw new ChatError(ChatErrorCode.ROOM_NOT_FOUND, 'Conversation not found');
    return room;
  }

  /** Room by roomId, only if `userId` is a participant. */
  async getRoomForParticipant(roomId: string, userId: string): Promise<ChatRoomDocument> {
    const room = await this.getChatRoom(roomId);
    this.assertParticipant(room, userId);
    return room;
  }

  async getChatRoomByInitiatorAndAd(initiatorId: string, adId: string): Promise<ChatRoom | null> {
    this.validateObjectId(initiatorId, 'user id');
    this.validateObjectId(adId, 'ad id');
    return this.chatRoomModel
      .findOne({ initiatorId: new Types.ObjectId(initiatorId), adId: new Types.ObjectId(adId) })
      .exec();
  }

  /** Paged, enriched room list for one user (single aggregation, no N+1). */
  async listRooms(userId: string, query: ListRoomsQueryDto = {}): Promise<RoomListResult> {
    this.validateObjectId(userId, 'user id');
    const uid = new Types.ObjectId(userId);
    const paged = !!query.limit;
    const limit = paged ? query.limit! : LEGACY_LIST_CAP;
    const filter: RoomFilter = query.filter ?? 'all';

    const match: Record<string, any> = { status: { $ne: ChatRoomStatus.ARCHIVED } };
    if (filter === 'buying') match.initiatorId = uid;
    else if (filter === 'selling') match.adPosterId = uid;
    else match.$or = [{ initiatorId: uid }, { adPosterId: uid }];
    if (filter === 'unread') match[`unreadCounts.${userId}`] = { $gt: 0 };

    if (query.cursor) {
      const { at, id } = this.decodeCursor(query.cursor);
      match.$and = [
        { $or: [{ lastMessageAt: { $lt: at } }, { lastMessageAt: at, _id: { $lt: id } }] },
      ];
    }

    const q = query.q?.trim();
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { lastMessageAt: -1, _id: -1 } },
    ];
    if (!q) pipeline.push({ $limit: limit + 1 });

    pipeline.push(
      {
        $lookup: {
          from: 'users',
          let: { otherId: { $cond: [{ $eq: ['$initiatorId', uid] }, '$adPosterId', '$initiatorId'] } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$otherId'] } } },
            { $project: { name: 1, profilePic: 1, phoneNumber: 1, countryCode: 1 } },
          ],
          as: 'other',
        },
      },
      {
        $lookup: {
          from: 'ads',
          let: { adId: '$adId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$adId'] } } },
            {
              $project: {
                title: 1,
                price: 1,
                category: 1,
                isActive: 1,
                soldOut: 1,
                isDeleted: 1,
                isRemovedByAdmin: 1,
                image: { $arrayElemAt: ['$images', 0] },
              },
            },
          ],
          as: 'adDoc',
        },
      },
    );

    if (q) {
      const rx = new RegExp(this.escapeRegex(q), 'i');
      pipeline.push(
        { $match: { $or: [{ 'other.name': rx }, { 'adDoc.title': rx }, { 'lastMessage.preview': rx }] } },
        { $limit: limit + 1 },
      );
    }

    const docs = await this.chatRoomModel.aggregate(pipeline).exec();
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    await this.repairMissingLastMessages(page);

    const rooms = page.map((d) => this.toRoomView(d, userId, d.other?.[0], d.adDoc?.[0]));
    const last = page[page.length - 1];
    return {
      rooms,
      nextCursor: paged && hasMore && last ? this.encodeCursor(last.lastMessageAt, last._id) : null,
    };
  }

  /** Legacy `GET /chats/rooms` without params and socket `getUserChatRooms`. */
  async getUserChatRooms(userId: string): Promise<RoomView[]> {
    return (await this.listRooms(userId)).rooms;
  }

  /** Single enriched room for a participant. */
  async getRoomView(roomId: string, userId: string): Promise<RoomView> {
    const room = await this.getRoomForParticipant(roomId, userId);
    const otherId = this.otherParticipant(room, userId);
    const [other, ad] = await Promise.all([
      this.userModel.findById(otherId).select('name profilePic phoneNumber countryCode').lean().exec(),
      this.adModel
        .findById(room.adId)
        .select('title price category isActive soldOut isDeleted isRemovedByAdmin images')
        .lean<any>()
        .exec(),
    ]);
    const plain: any = room.toObject ? room.toObject() : room;
    await this.repairMissingLastMessages([plain]);
    return this.toRoomView(plain, userId, other, ad ? { ...ad, image: ad.images?.[0] } : null);
  }

  /** Pre-backfill rooms have messages but no denormalised lastMessage: fill in one batched query. */
  private async repairMissingLastMessages(rooms: any[]): Promise<void> {
    const missing = rooms.filter((r) => !r.lastMessage?.id && (r.messageCount ?? 0) > 0);
    if (!missing.length) return;
    const latest = await this.chatMessageModel
      .aggregate([
        { $match: { roomId: { $in: missing.map((r) => r.roomId) } } },
        { $sort: { _id: -1 } },
        {
          $group: {
            _id: '$roomId',
            id: { $first: '$_id' },
            type: { $first: '$type' },
            content: { $first: '$content' },
            senderId: { $first: '$senderId' },
            createdAt: { $first: '$createdAt' },
          },
        },
      ])
      .exec();
    const byRoom = new Map(latest.map((m: any) => [m._id, m]));
    const writes: any[] = [];
    for (const r of missing) {
      const m: any = byRoom.get(r.roomId);
      if (!m) continue;
      r.lastMessage = {
        id: m.id,
        type: m.type,
        preview: ChatService.previewFor(m.type, m.content),
        senderId: m.senderId,
        createdAt: m.createdAt,
      };
      writes.push({
        updateOne: {
          filter: { _id: r._id, 'lastMessage.id': { $exists: false } },
          update: { $set: { lastMessage: r.lastMessage, lastMessageAt: r.lastMessageAt ?? m.createdAt } },
        },
      });
    }
    if (writes.length) {
      this.chatRoomModel.bulkWrite(writes, { ordered: false }).catch((e) =>
        this.logger.warn(`lastMessage repair failed: ${(e as Error).message}`),
      );
    }
  }

  toRoomView(room: any, userId: string, other: any, ad: any): RoomView {
    const uid = String(userId);
    const availability = ChatService.adAvailability(ad);
    const lm = room.lastMessage?.id ? room.lastMessage : null;
    const price = typeof ad?.price === 'number' ? ad.price : null;
    const title = ad?.title || (ad ? 'Listing' : 'Listing removed');
    return {
      roomId: room.roomId,
      adId: String(room.adId),
      status: room.status,
      isClosed: room.status !== ChatRoomStatus.ACTIVE,
      myRole: String(room.initiatorId) === uid ? 'buying' : 'selling',
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      lastMessageAt: room.lastMessageAt ?? null,
      unreadCount: Number(this.mapValue<number>(room.unreadCounts, uid) ?? 0),
      otherUser: other
        ? {
            id: String(other._id),
            name: other.name,
            profilePic: other.profilePic,
            phoneNumber: other.phoneNumber,
            countryCode: other.countryCode,
          }
        : null,
      ad: ad ? { id: String(ad._id), title, price, image: ad.image ?? null, status: availability } : null,
      lastMessage: lm
        ? {
            id: String(lm.id),
            type: lm.type,
            preview: lm.preview,
            senderId: String(lm.senderId),
            createdAt: lm.createdAt,
          }
        : null,
      initiatorId: String(room.initiatorId),
      adPosterId: String(room.adPosterId),
      participants: (room.participants ?? []).map(String),
      messageCount: room.messageCount ?? 0,
      latestMessage: lm ? { content: lm.preview, type: lm.type, createdAt: lm.createdAt } : null,
      adDetails: ad
        ? { id: String(ad._id), title, price, images: ad.image ? [ad.image] : [], category: ad.category }
        : null,
    };
  }

  /** Legacy existence check used by the current app. */
  async findExistingChatRoom(initiatorId: string, adId: string, otherUserId: string): Promise<ChatRoom | null> {
    this.validateObjectId(initiatorId, 'user id');
    this.validateObjectId(adId, 'ad id');
    this.validateObjectId(otherUserId, 'other user id');
    return this.chatRoomModel
      .findOne({
        adId: new Types.ObjectId(adId),
        $or: [
          { initiatorId: new Types.ObjectId(initiatorId), adPosterId: new Types.ObjectId(otherUserId) },
          { initiatorId: new Types.ObjectId(otherUserId), adPosterId: new Types.ObjectId(initiatorId) },
        ],
        status: ChatRoomStatus.ACTIVE,
      })
      .exec();
  }

  async getAdById(adId: string | Types.ObjectId): Promise<any> {
    this.validateObjectId(adId, 'ad id');
    return this.adModel.findById(adId).select('postedBy').lean().exec();
  }

  /** Close all rooms for an ad (sold/removed). History stays readable. */
  async deactivateChatRoom(adId: string): Promise<void> {
    this.validateObjectId(adId, 'ad id');
    await this.chatRoomModel.updateMany(
      { adId: new Types.ObjectId(adId), status: ChatRoomStatus.ACTIVE },
      { status: ChatRoomStatus.INACTIVE, $currentDate: { updatedAt: true } },
    );
  }

  async archiveChatRoom(roomId: string): Promise<void> {
    const res = await this.chatRoomModel.updateOne(
      { roomId },
      { status: ChatRoomStatus.ARCHIVED, $currentDate: { updatedAt: true } },
    );
    if (!res.matchedCount) throw new ChatError(ChatErrorCode.ROOM_NOT_FOUND, 'Conversation not found');
  }

  async updateChatRoomStatus(roomId: string, status: string): Promise<void> {
    if (!Object.values(ChatRoomStatus).includes(status as ChatRoomStatus)) {
      throw new ChatError(ChatErrorCode.VALIDATION, `Invalid status: ${status}`);
    }
    const res = await this.chatRoomModel.updateOne(
      { roomId },
      { status: status as ChatRoomStatus, $currentDate: { updatedAt: true } },
    );
    if (!res.matchedCount) throw new ChatError(ChatErrorCode.ROOM_NOT_FOUND, 'Conversation not found');
  }

  /* =========================================================================
   * Messaging
   * ======================================================================= */

  /**
   * Store a message. Idempotent on (room, sender, clientMessageId).
   * Updates room preview, recency and the recipient's unread counter in one write.
   */
  async sendMessage(roomId: string, senderId: string, body: SendMessageBodyDto): Promise<SendResult> {
    this.validateObjectId(senderId, 'sender id');
    const type = body.type ?? MessageType.TEXT;
    const content = body.content?.trim() ? body.content : undefined;
    const attachments = body.attachments ?? [];

    const room = await this.getRoomForParticipant(roomId, senderId);
    const recipientId = this.otherParticipant(room, senderId);

    if (body.clientMessageId) {
      const replay = await this.chatMessageModel
        .findOne({
          roomRef: room._id,
          senderId: new Types.ObjectId(senderId),
          clientMessageId: body.clientMessageId,
        })
        .lean()
        .exec();
      if (replay) return { message: this.toMessageView(replay), room, recipientId, created: false };
    }

    if (room.status !== ChatRoomStatus.ACTIVE) {
      throw new ChatError(ChatErrorCode.ROOM_CLOSED, 'This conversation is closed');
    }
    await this.assertCanChat(senderId);

    if (type === MessageType.SYSTEM) {
      throw new ChatError(ChatErrorCode.VALIDATION, 'System messages cannot be sent by users');
    }
    if (type === MessageType.TEXT && !content) {
      throw new ChatError(ChatErrorCode.VALIDATION, 'Message is empty');
    }
    if (type !== MessageType.TEXT && attachments.length === 0) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, `${type} message needs an attachment`);
    }
    if (type === MessageType.AUDIO && attachments.length !== 1) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Voice message must have exactly one recording');
    }

    let moderationFlags: string[] | undefined;
    let moderationScore = 0;
    if (content) {
      const result = await this.contentModerationService.moderateContent(content, senderId);
      if (!result.isApproved) {
        throw new ChatError(ChatErrorCode.CONTENT_BLOCKED, result.reason || 'Message not allowed');
      }
      moderationFlags = result.flags.length ? result.flags : undefined;
      moderationScore = result.score;
    }

    const normalizedAttachments = await Promise.all(
      attachments.map((a) => this.normalizeAttachment(a, type)),
    );

    let doc: any;
    try {
      doc = await this.chatMessageModel.create({
        roomRef: room._id,
        roomId: room.roomId,
        senderId: new Types.ObjectId(senderId),
        clientMessageId: body.clientMessageId,
        type,
        content,
        attachments: normalizedAttachments,
        isRead: false,
        moderationFlags,
        moderationScore,
      });
    } catch (err: any) {
      if (err?.code === 11000 && body.clientMessageId) {
        const raced = await this.chatMessageModel
          .findOne({ roomRef: room._id, senderId: new Types.ObjectId(senderId), clientMessageId: body.clientMessageId })
          .lean()
          .exec();
        if (raced) return { message: this.toMessageView(raced), room, recipientId, created: false };
      }
      throw err;
    }

    const createdAt: Date = doc.createdAt ?? new Date();
    const lastMessage = {
      id: doc._id,
      type,
      preview: ChatService.previewFor(type, content),
      senderId: new Types.ObjectId(senderId),
      createdAt,
    };
    const inc: Record<string, number> = { messageCount: 1 };
    if (recipientId !== String(senderId)) inc[`unreadCounts.${recipientId}`] = 1; // self-chat: no unread
    await this.chatRoomModel.updateOne(
      { _id: room._id },
      { $set: { lastMessage, lastMessageAt: createdAt }, $inc: inc, $currentDate: { updatedAt: true } },
    );
    // Keep the in-memory doc consistent for callers that build views from it.
    (room as any).lastMessage = lastMessage;
    (room as any).lastMessageAt = createdAt;
    (room as any).messageCount = (room.messageCount ?? 0) + 1;

    return { message: this.toMessageView(doc.toObject ? doc.toObject() : doc), room, recipientId, created: true };
  }

  private async normalizeAttachment(a: AttachmentDto, messageType: MessageType) {
    this.assertOwnMediaUrl(a.url);
    if (messageType === MessageType.IMAGE && a.type !== 'image') {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Image message needs an image attachment');
    }
    if (messageType === MessageType.AUDIO && a.type !== 'audio') {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Voice message needs an audio attachment');
    }
    if (a.type === 'image' && a.size > 10 * 1024 * 1024) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Image is too large');
    }
    if (a.type !== 'audio') return { ...a };

    const out: any = { ...a };
    if (['audio/x-m4a', 'audio/m4a', 'application/octet-stream'].includes(out.mimeType)) {
      out.mimeType = 'audio/mp4';
    }
    if (out.size > 5 * 1024 * 1024) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Voice message is too large');
    }
    if (!out.duration) {
      // Legacy clients don't send duration: measure it (bounded download).
      out.duration = await this.getAudioDuration(out.url);
    }
    if (!out.duration || out.duration > 180) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Voice messages can be up to 3 minutes');
    }
    return out;
  }

  /** Attachments must live in our bucket (or a configured CDN host) over https. */
  private assertOwnMediaUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Invalid attachment URL');
    }
    const host = parsed.hostname.toLowerCase();
    const okHost = this.s3.getMediaHosts().includes(host);
    const regionPathStyle =
      /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host) && parsed.pathname.startsWith(`/${this.s3.bucket}/`);
    if (parsed.protocol !== 'https:' || !(okHost || regionPathStyle)) {
      throw new ChatError(ChatErrorCode.ATTACHMENT_INVALID, 'Attachment must be uploaded through AdoDad');
    }
  }

  private async getAudioDuration(url: string): Promise<number | null> {
    try {
      const mm = await (new Function('return import("music-metadata")')() as Promise<
        typeof import('music-metadata')
      >);
      await assertSafePublicUrl(url);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        maxContentLength: 6 * 1024 * 1024,
        maxRedirects: 0,
      });
      const metadata = await mm.parseBuffer(Buffer.from(response.data));
      return metadata.format.duration ? Math.ceil(metadata.format.duration) : null;
    } catch (error) {
      this.logger.warn(`Audio duration unavailable: ${(error as Error).message}`);
      return null;
    }
  }

  toMessageView(m: any): Record<string, any> {
    const id = String(m._id);
    return {
      _id: id,
      id,
      roomId: m.roomId,
      clientMessageId: m.clientMessageId ?? null,
      senderId: String(m.senderId),
      type: m.type,
      content: m.content ?? '',
      attachments: (m.attachments ?? []).map((a: any) => ({
        type: a.type,
        url: a.url,
        mimeType: a.mimeType,
        size: a.size,
        duration: a.duration,
        thumbnailUrl: a.thumbnailUrl,
        width: a.width,
        height: a.height,
      })),
      isRead: !!m.isRead,
      readAt: m.readAt ?? null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      ...(m.sender ? { sender: m.sender } : {}),
    };
  }

  /**
   * History with keyset pagination.
   * - default / `cursor`: newest → oldest (older than cursor)
   * - `after`: oldest → newest (newer than `after`, for catch-up after reconnect)
   */
  async getRoomMessages(
    roomId: string,
    requesterId: string,
    opts: { cursor?: string; after?: string; limit?: number; includeTotal?: boolean } = {},
  ): Promise<{
    messages: any[];
    nextCursor: string | null;
    hasMore: boolean;
    order: 'desc' | 'asc';
    total?: number;
  }> {
    const room = await this.getRoomForParticipant(roomId, requesterId);
    const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
    const asc = !!opts.after;

    const match: Record<string, any> = { roomId: room.roomId };
    if (opts.after) {
      match._id = { $gt: new Types.ObjectId(this.validateObjectId(opts.after, 'after')) };
    } else if (opts.cursor) {
      match._id = { $lt: new Types.ObjectId(this.validateObjectId(opts.cursor, 'cursor')) };
    }

    const docs = await this.chatMessageModel
      .aggregate([
        { $match: match },
        { $sort: { _id: asc ? 1 : -1 } },
        { $limit: limit + 1 },
        {
          $lookup: {
            from: 'users',
            let: { sid: '$senderId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$sid'] } } },
              { $project: { _id: 1, name: 1, profilePic: 1 } },
            ],
            as: 'sender',
          },
        },
        { $set: { sender: { $arrayElemAt: ['$sender', 0] } } },
        { $project: { moderationFlags: 0, moderationScore: 0, roomRef: 0, readBy: 0, __v: 0 } },
      ])
      .exec();

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;
    const messages = page.map((d) => this.toMessageView(d));
    const result: any = {
      messages,
      nextCursor: hasMore ? messages[messages.length - 1]._id : null,
      hasMore,
      order: asc ? 'asc' : 'desc',
    };
    if (opts.includeTotal) {
      result.total = await this.chatMessageModel.countDocuments({ roomId: room.roomId });
    }
    return result;
  }

  /**
   * Mark everything the other participant sent (up to `lastMessageId`, default all) as read
   * and reset this user's unread counter.
   */
  async markRoomRead(
    roomId: string,
    userId: string,
    lastMessageId?: string,
  ): Promise<{ room: ChatRoomDocument; lastReadAt: Date; changed: number; otherUserId: string }> {
    const room = await this.getRoomForParticipant(roomId, userId);
    const now = new Date();
    const otherUserId = this.otherParticipant(room, userId);

    const msgFilter: Record<string, any> = {
      roomRef: room._id,
      senderId: new Types.ObjectId(otherUserId),
      isRead: false,
    };
    if (lastMessageId) {
      msgFilter._id = { $lte: new Types.ObjectId(this.validateObjectId(lastMessageId, 'last message id')) };
    }

    const [msgRes] = await Promise.all([
      this.chatMessageModel.updateMany(msgFilter, {
        $set: { isRead: true, readAt: now, readBy: new Types.ObjectId(userId) },
      }),
      this.chatRoomModel.updateOne(
        { _id: room._id },
        { $set: { [`unreadCounts.${userId}`]: 0, [`lastReadAt.${userId}`]: now } },
      ),
    ]);

    return { room, lastReadAt: now, changed: msgRes.modifiedCount ?? 0, otherUserId };
  }

  /** Legacy alias. */
  async markMessagesAsRead(roomId: string, userId: string, lastReadMessageId?: string): Promise<void> {
    await this.markRoomRead(roomId, userId, lastReadMessageId);
  }

  /** Total unread across the user's active rooms, for the nav badge. */
  async getUnreadSummary(userId: string): Promise<{ total: number; rooms: number }> {
    const uid = new Types.ObjectId(this.validateObjectId(userId, 'user id'));
    const field = `$unreadCounts.${userId}`;
    const [agg] = await this.chatRoomModel
      .aggregate([
        {
          $match: {
            $or: [{ initiatorId: uid }, { adPosterId: uid }],
            status: { $ne: ChatRoomStatus.ARCHIVED },
            [`unreadCounts.${userId}`]: { $gt: 0 },
          },
        },
        { $group: { _id: null, total: { $sum: field }, rooms: { $sum: 1 } } },
      ])
      .exec();
    return { total: agg?.total ?? 0, rooms: agg?.rooms ?? 0 };
  }

  async getUserRole(roomId: string, userId: string): Promise<UserRole | null> {
    const room = await this.getChatRoom(roomId);
    return this.getUserRoleFromRoom(room, userId);
  }

  /* =========================================================================
   * Admin / Export (unchanged behaviour)
   * ======================================================================= */

  async listChatRoomsForAdmin(
    filters: { userId?: string; adId?: string; status?: string; from?: Date; to?: Date },
    cursor?: string,
    limit = 50,
  ): Promise<{ rooms: any[]; nextCursor: string | null; hasMore: boolean; total: number }> {
    const q = this.adminFilter(filters);
    if (cursor) q._id = { $lt: new Types.ObjectId(this.validateObjectId(cursor, 'cursor')) };
    const capped = Math.min(Math.max(limit, 1), 200);
    const docs = await this.chatRoomModel.find(q).sort({ _id: -1 }).limit(capped + 1).lean().exec();
    const hasMore = docs.length > capped;
    const rooms = hasMore ? docs.slice(0, capped) : docs;
    const total = await this.chatRoomModel.countDocuments(q);
    return { rooms, nextCursor: hasMore ? String(rooms[rooms.length - 1]._id) : null, hasMore, total };
  }

  async getRoomMessagesForAdmin(
    roomId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{ messages: ChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
    const room = await this.getChatRoom(roomId);
    const q: any = { roomRef: room._id };
    if (cursor) q._id = { $lt: new Types.ObjectId(this.validateObjectId(cursor, 'cursor')) };
    const capped = Math.min(Math.max(limit, 1), 200);
    const docs = await this.chatMessageModel.find(q).sort({ _id: -1 }).limit(capped + 1).lean().exec();
    const hasMore = docs.length > capped;
    const messages = hasMore ? docs.slice(0, capped) : docs;
    return { messages, nextCursor: hasMore ? String(messages[messages.length - 1]._id) : null, hasMore };
  }

  async exportChatData(filters: {
    userId?: string;
    adId?: string;
    status?: string;
    from?: Date;
    to?: Date;
  }): Promise<{ rooms: any[]; totalRooms: number; totalMessages: number }> {
    const rooms = await this.chatRoomModel.find(this.adminFilter(filters)).lean().exec();
    if (!rooms.length) return { rooms, totalRooms: 0, totalMessages: 0 };
    const agg = await this.chatMessageModel.aggregate<{ total: number }>([
      { $match: { roomRef: { $in: rooms.map((r: any) => r._id) } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    return { rooms, totalRooms: rooms.length, totalMessages: agg[0]?.total ?? 0 };
  }

  private adminFilter(filters: { userId?: string; adId?: string; status?: string; from?: Date; to?: Date }) {
    const q: any = {};
    if (filters.userId) {
      const uid = new Types.ObjectId(this.validateObjectId(filters.userId, 'userId'));
      q.$or = [{ initiatorId: uid }, { adPosterId: uid }];
    }
    if (filters.adId) q.adId = new Types.ObjectId(this.validateObjectId(filters.adId, 'adId'));
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.createdAt = {};
      if (filters.from) q.createdAt.$gte = filters.from;
      if (filters.to) q.createdAt.$lte = filters.to;
    }
    return q;
  }
}
