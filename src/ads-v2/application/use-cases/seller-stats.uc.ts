import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ad } from '../../../ads/schemas/ad.schema';
import { ChatMessage } from '../../../chat/schemas/chat-message.schema';
import { ChatRoom } from '../../../chat/schemas/chat-room.schema';
import { User } from '../../../users/schemas/user.schema';
import { AdsCache } from '../../infrastructure/services/ads-cache';

export interface SellerStats {
  /** Total ads the seller has posted (excludes soft-deleted). */
  adCount: number;
  /** ISO date the seller joined (User.createdAt). */
  memberSince: string | null;
  /** Whether the seller carries the verified badge. */
  isVerified: boolean;
  /**
   * Average time (whole minutes) the seller takes to reply to a buyer in chat,
   * over recent conversations. null when there isn't enough signal yet.
   */
  avgReplyMinutes: number | null;
  /**
   * Seller rating 1–5. Always null for now: ad-seller ratings are not yet a
   * concept in the data model (the Rating collection is product/vendor-scoped),
   * so the field is exposed for forward-compatibility and the client hides it
   * while null. ratingCount mirrors this.
   */
  rating: number | null;
  ratingCount: number;
}

// A gap larger than this is treated as a new conversation, not a "reply",
// so an overnight response doesn't inflate the average.
const MAX_REPLY_GAP_MIN = 24 * 60;
// Bound the work: only look at the seller's most recent rooms / messages.
const ROOM_LIMIT = 60;
const MESSAGE_LIMIT = 1500;
// Require at least this many reply samples before exposing avgReplyMinutes.
const MIN_REPLY_SAMPLES = 3;
const SELLER_STATS_TTL_SEC = 300; // 5 minutes

type SellerUserLean = {
  createdAt?: Date | string;
  isVerified?: boolean;
};

/**
 * Aggregates the trust signals shown on the ad-detail seller tile for a given
 * seller (the user who posted the ad):
 *   - adCount:         Ad.postedBy count, excluding soft-deleted ads
 *   - memberSince:     User.createdAt
 *   - isVerified:      User.isVerified
 *   - avgReplyMinutes: derived from ChatMessage timing in the seller's rooms
 *   - rating:          null placeholder (see SellerStats doc above)
 *
 * Ad, ChatRoom and ChatMessage are already registered in AdsV2Module; only the
 * User model is newly added to forFeature().
 */
@Injectable()
export class SellerStatsUc {
  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<any>,
    @InjectModel(ChatRoom.name) private readonly chatRoomModel: Model<any>,
    @InjectModel(ChatMessage.name) private readonly chatMessageModel: Model<any>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly adsCache: AdsCache,
  ) {}

  async exec(sellerId: string): Promise<SellerStats> {
    const cacheKey = this.adsCache.makeKey({ op: 'sellerStats', id: sellerId });
    const cached = await this.adsCache.get<SellerStats>(cacheKey);
    if (cached) return cached;

    const sellerOid = Types.ObjectId.isValid(sellerId)
      ? new Types.ObjectId(sellerId)
      : null;

    if (!sellerOid) {
      throw new NotFoundException('Seller not found');
    }

    const [adCount, user, avgReplyMinutes] = await Promise.all([
      this.adModel
        .countDocuments({ postedBy: sellerOid, isDeleted: { $ne: true } })
        .exec(),
      this.userModel
        .findById(sellerOid)
        .select('isVerified createdAt')
        .lean<SellerUserLean>()
        .exec(),
      this.computeAvgReplyMinutes(sellerId, sellerOid),
    ]);

    if (!user) {
      throw new NotFoundException('Seller not found');
    }

    const result: SellerStats = {
      adCount,
      memberSince: user.createdAt
        ? new Date(user.createdAt).toISOString()
        : null,
      isVerified: !!user.isVerified,
      avgReplyMinutes,
      rating: null,
      ratingCount: 0,
    };

    await this.adsCache.setList(cacheKey, result, SELLER_STATS_TTL_SEC);
    return result;
  }

  /**
   * Reply time = gap between a buyer's message and the seller's next message in
   * the same room. Averages those gaps over the seller's recent rooms.
   */
  private async computeAvgReplyMinutes(
    sellerId: string,
    sellerOid: Types.ObjectId,
  ): Promise<number | null> {
    // Rooms where this seller is the ad poster (the one expected to reply).
    const rooms = await this.chatRoomModel
      .find({ adPosterId: sellerOid })
      .select('roomId')
      .sort({ updatedAt: -1 })
      .limit(ROOM_LIMIT)
      .lean()
      .exec();

    const roomIds = rooms.map((r: any) => r.roomId).filter(Boolean);
    if (roomIds.length === 0) return null;

    const messages = await this.chatMessageModel
      .find({ roomId: { $in: roomIds } })
      .select('roomId senderId createdAt')
      .sort({ roomId: 1, createdAt: 1 })
      .limit(MESSAGE_LIMIT)
      .lean()
      .exec();

    let totalMinutes = 0;
    let replyCount = 0;
    let prevRoom: string | null = null;
    let prevWasBuyer = false;
    let prevTime = 0;

    for (const m of messages) {
      const room = String(m.roomId);
      const isSeller = String(m.senderId) === sellerId;
      const time = new Date(m.createdAt).getTime();

      if (room !== prevRoom) {
        prevRoom = room;
        prevWasBuyer = !isSeller;
        prevTime = time;
        continue;
      }

      if (isSeller && prevWasBuyer) {
        const gapMin = (time - prevTime) / 60000;
        if (gapMin >= 0 && gapMin <= MAX_REPLY_GAP_MIN) {
          totalMinutes += gapMin;
          replyCount += 1;
        }
      }

      prevWasBuyer = !isSeller;
      prevTime = time;
    }

    if (replyCount < MIN_REPLY_SAMPLES) return null;

    return Math.round(totalMinutes / replyCount);
  }
}
