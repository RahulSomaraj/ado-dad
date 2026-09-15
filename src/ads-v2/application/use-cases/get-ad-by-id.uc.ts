import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { DetailedAdResponseDto } from '../../../ads/dto/common/ad-response.dto';
import { AdCategory, AdStatus } from '../../../ads/schemas/ad.schema';
import {
  Favorite,
  FavoriteDocument,
} from '../../../favorites/schemas/schema.favorite';
import {
  ChatRoom,
  ChatRoomDocument,
} from '../../../chat/schemas/chat-room.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../../../chat/schemas/chat-message.schema';
import { InjectModel } from '@nestjs/mongoose';
import { UserType } from '../../../users/enums/user.types';
import { Model } from 'mongoose';

/** Fallback coordinates the response uses when an ad has none (Pathanamthitta). */
const DEFAULT_LATITUDE = 9.3311;
const DEFAULT_LONGITUDE = 76.9222;

/**
 * Great-circle distance in km (1 decimal) between the viewer and the ad, or
 * null when either position is unknown. Exported for unit tests.
 */
export function distanceKm(
  lat: number | undefined,
  lng: number | undefined,
  ad: { latitude?: number; longitude?: number; hasCoordinates?: boolean },
): number | null {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    ad.hasCoordinates === false ||
    typeof ad.latitude !== 'number' ||
    typeof ad.longitude !== 'number'
  ) {
    return null;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(ad.latitude - lat);
  const dLng = toRad(ad.longitude - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(ad.latitude)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(km * 10) / 10;
}

@Injectable()
export class GetAdByIdUc {
  /**
   * P1-5: ad detail is the second most requested endpoint and used to hit Mongo
   * on every open — AdsCache.setById existed but was called from nowhere.
   *
   * Only the ad-derived part of the response is cached, under the 'anonymous'
   * slot, so one entry serves every viewer. Everything user- or
   * moment-specific (isFavorite, favouritesCount, chats, ratings, viewCount) is
   * layered on after the cache read. Invalidation rides on the existing
   * `invalidateById` tag, which v1 writes now trigger (see AdsService).
   */
  private static readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly adRepo: AdRepository,
    private readonly inventory: VehicleInventoryGateway,
    private readonly cache: AdsCache,
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
  ) { }

  async exec(input: {
    adId: string;
    userId?: string;
    /** Caller's UserType ('SA', 'AD', 'MO' see chat rooms like the owner). */
    userType?: string;
    /** Viewer position, for `distance`. Both or neither. */
    lat?: number;
    lng?: number;
  }): Promise<DetailedAdResponseDto> {
    const { adId, userId, userType, lat, lng } = input;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(adId)) {
      throw new BadRequestException(`Invalid ad ID: ${adId}`);
    }

    const cacheKey = this.cache.byIdKey(adId, 'anonymous');
    const cachedBase = await this.cache.get<DetailedAdResponseDto>(cacheKey);

    // Build simplified aggregation pipeline
    const pipeline = [
      {
        $match: {
          _id: new Types.ObjectId(adId),
          isDeleted: { $ne: true },
          // Sold ads stay readable: chat history, shares, wishlist and
          // notifications all link here, and the app renders a SOLD state.
          // (Lists still exclude them.)
        },
      },

      // Enhanced user information with more details
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                countryCode: 1,
                phoneNumber: 1,
                profilePic: 1,
                isVerified: 1,
                type: 1,
                createdAt: 1,
                isDeleted: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // Property details with enhanced lookup
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      },

      // Vehicle details with enhanced lookup
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      },

      // Commercial vehicle details with enhanced lookup
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails',
        },
      },

      // Add view count (increment on each request)
      {
        $addFields: {
          viewCount: { $ifNull: ['$viewCount', 0] },
        },
      },
    ];

    // EXECUTE PARALLEL QUERIES
    // We launch all independent read operations concurrently to reduce total latency.
    const [
      adResults,
      favoritesCount,
      userFavorite,
      chatData,
      ratings,
      incrementedViewCount,
    ] = await Promise.all([
      // 1. Main Ad Fetch — skipped entirely on a cache hit
      cachedBase ? Promise.resolve(null) : this.adRepo.aggregate(pipeline),

      // 2. Favorites Count
      this.favoriteModel.countDocuments({
        itemId: new Types.ObjectId(adId),
      }),

      // 3. User Favorite Status (if logged in)
      userId
        ? this.favoriteModel.findOne({
          userId: new Types.ObjectId(userId),
          itemId: new Types.ObjectId(adId),
        })
        : Promise.resolve(null),

      // 4. Chat data. Room list (participants, last message) is owner-only;
      //    counts are public. Ownership is resolved inside from the ad.
      this.getChatData(adId, userId),

      // 5. Ratings
      this.getAdRatings(adId),

      // 6. View count — the same write as before, but we read the new value
      //    back so a cached payload never shows a stale count.
      this.adRepo.incrementViewCount(new Types.ObjectId(adId)).catch((err) => {
        console.error('Error incrementing view count:', err);
        return null;
      }),
    ]);

    let base: DetailedAdResponseDto;

    if (cachedBase) {
      base = cachedBase;
    } else {
      // Check if ad exists
      if (!adResults || adResults.length === 0) {
        throw new NotFoundException(`Advertisement with ID ${adId} not found`);
      }

      const ad = adResults[0];

      // Map to detailed response DTO
      // This involves inventory lookups which are internally parallelized
      base = await this.mapToDetailedResponseDto(ad);
      base.viewCount = ad.viewCount || 0;

      await this.cache.setById(
        adId,
        'anonymous',
        base,
        GetAdByIdUc.CACHE_TTL,
      );
    }

    // Never mutate the object handed back by the cache layer.
    const detailed: DetailedAdResponseDto = { ...base };

    // Populate the auxiliary data we fetched in parallel
    detailed.favoritesCount = favoritesCount;
    detailed.isFavorite = !!userFavorite;

    // Populate chat data. Other buyers' conversations (names, emails, last
    // message text) are only for the ad's owner — this is a public endpoint.
    const isOwner = !!userId && detailed.postedBy === userId;
    const isStaff =
      userType === UserType.SUPER_ADMIN ||
      userType === UserType.ADMIN ||
      userType === UserType.MODERATOR;
    detailed.chats = isOwner || isStaff ? chatData.chats : [];
    detailed.chatsCount = chatData.chatsCount;
    if (userId) {
      detailed.hasUserChat = chatData.hasUserChat;
    }

    // Distance from the viewer, when they sent a position and the ad has real
    // coordinates (mapToDetailedResponseDto substitutes a default otherwise).
    const distance = distanceKm(lat, lng, detailed);
    if (distance != null) {
      detailed.distance = distance;
    }

    // Populate ratings
    if (ratings) {
      detailed.averageRating = ratings.averageRating;
      detailed.ratingsCount = ratings.ratingsCount;
      detailed.reviews = ratings.reviews;
    }

    // Exact when the increment succeeded; otherwise fall back to the snapshot.
    detailed.viewCount =
      incrementedViewCount ?? (base.viewCount || 0) + 1;

    return detailed;
  }

  private async mapToDetailedResponseDto(
    ad: any,
  ): Promise<DetailedAdResponseDto> {
    // Process vehicle details with inventory information
    const vehicleDetails = ad.vehicleDetails?.[0];
    let processedVehicleDetails = vehicleDetails;

    if (vehicleDetails) {
      // Fetch vehicle inventory details individually
      const [manufacturer, model, variant, fuelType, transmissionType] =
        await Promise.all([
          this.inventory.getManufacturer(vehicleDetails.manufacturerId || ''),
          this.inventory.getModel(vehicleDetails.modelId || ''),
          this.inventory.getVariant(vehicleDetails.variantId || ''),
          this.inventory.getFuelType(vehicleDetails.fuelTypeId || ''),
          // Two-wheelers may have no transmission: no "Not Found" placeholder.
          vehicleDetails.transmissionTypeId
            ? this.inventory.getTransmissionType(vehicleDetails.transmissionTypeId)
            : Promise.resolve(undefined),
        ]);

      processedVehicleDetails = {
        ...vehicleDetails,
        manufacturer,
        model,
        variant,
        fuelType,
        transmissionType,
      };
    }

    // Process commercial vehicle details with inventory information
    const commercialVehicleDetails = ad.commercialVehicleDetails?.[0];
    let processedCommercialVehicleDetails = commercialVehicleDetails;

    if (commercialVehicleDetails) {
      // Fetch commercial vehicle inventory details individually
      const [manufacturer, model, variant, fuelType, transmissionType] =
        await Promise.all([
          this.inventory.getManufacturer(
            commercialVehicleDetails.manufacturerId || '',
          ),
          this.inventory.getModel(commercialVehicleDetails.modelId || ''),
          this.inventory.getVariant(commercialVehicleDetails.variantId || ''),
          this.inventory.getFuelType(commercialVehicleDetails.fuelTypeId || ''),
          this.inventory.getTransmissionType(
            commercialVehicleDetails.transmissionTypeId || '',
          ),
        ]);

      processedCommercialVehicleDetails = {
        ...commercialVehicleDetails,
        manufacturer,
        model,
        variant,
        fuelType,
        transmissionType,
      };
    }

    const userResponse = ad.user
      ? {
        id: ad.user._id.toString(),
        name: ad.user.name,
        email: ad.user.email,
        countryCode: ad.user.countryCode,
        phoneNumber: ad.user.phoneNumber,
        profilePic: ad.user.profilePic,
        isVerified: ad.user.isVerified === true,
      }
      : undefined;

    const history: { price: number; changedAt: Date }[] = Array.isArray(
      ad.priceHistory,
    )
      ? ad.priceHistory
      : [];
    const lastChange = history.length ? history[history.length - 1] : undefined;

    return {
      id: ad._id.toString(),
      title: ad.title,
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      latitude: ad.latitude || DEFAULT_LATITUDE,
      longitude: ad.longitude || DEFAULT_LONGITUDE,
      hasCoordinates: typeof ad.latitude === 'number' && typeof ad.longitude === 'number',
      link: ad.link || '',
      category: ad.category,
      isActive: ad.isActive,
      soldOut: ad.soldOut || false,
      isApproved: ad.isApproved || false,
      status: ad.status || (ad.isApproved ? AdStatus.APPROVED : AdStatus.PENDING),
      approvedBy: ad.approvedBy ? ad.approvedBy.toString() : undefined,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy.toString(),
      user: userResponse,
      propertyDetails: ad.propertyDetails?.[0] || undefined,
      vehicleDetails: processedVehicleDetails,
      commercialVehicleDetails: processedCommercialVehicleDetails,
      priceHistory: history.slice(-5).map((h) => ({
        price: h.price,
        changedAt: h.changedAt,
      })),
      previousPrice: lastChange?.price,
      priceChangedAt: lastChange?.changedAt,
    };
  }

  private async getChatData(
    adId: string,
    userId?: string,
  ): Promise<{
    chats: any[];
    chatsCount: number;
    hasUserChat?: boolean;
  }> {
    try {
      // Start both queries in parallel
      const chatRoomsPromise = this.chatRoomModel
        .find({ adId: new Types.ObjectId(adId) })
        .populate('initiatorId', 'name email profilePic')
        .populate('adPosterId', 'name email profilePic')
        .sort({ lastMessageAt: -1 })
        .limit(10)
        .lean();

      const userChatPromise = userId
        ? this.chatRoomModel.findOne({
          adId: new Types.ObjectId(adId),
          $or: [
            { initiatorId: new Types.ObjectId(userId) },
            { adPosterId: new Types.ObjectId(userId) },
          ],
        })
        : Promise.resolve(null);

      // Exact total — chatRooms is capped at 10 by the list query above.
      const chatsCountPromise = this.chatRoomModel.countDocuments({
        adId: new Types.ObjectId(adId),
      });

      const [chatRooms, userChatRoom, chatsCount] = await Promise.all([
        chatRoomsPromise,
        userChatPromise,
        chatsCountPromise,
      ]);

      // Get last message for each chat room (parallelized map)
      const chatRoomsWithMessages = await Promise.all(
        chatRooms.map(async (room: any) => {
          const lastMessage = await this.messageModel
            .findOne({ roomId: room._id })
            .sort({ createdAt: -1 })
            .populate('senderId', 'name')
            .lean();

          return {
            id: room._id.toString(),
            participants: [
              {
                id: room.initiatorId._id.toString(),
                name: room.initiatorId.name || 'Unknown',
                email: room.initiatorId.email || '',
              },
              {
                id: room.adPosterId._id.toString(),
                name: room.adPosterId.name || 'Unknown',
                email: room.adPosterId.email || '',
              },
            ],
            lastMessage: lastMessage
              ? {
                content: lastMessage.content,
                createdAt: (lastMessage as any).createdAt || new Date(),
                sender: (lastMessage as any).senderId?.name || 'Unknown',
              }
              : undefined,
            createdAt: room.createdAt || new Date(),
          };
        }),
      );

      return {
        chats: chatRoomsWithMessages,
        chatsCount,
        hasUserChat: !!userChatRoom,
      };
    } catch (error) {
      console.error('Error fetching chat data:', error);
      return {
        chats: [],
        chatsCount: 0,
        hasUserChat: false,
      };
    }
  }

  private async getAdRatings(adId: string): Promise<{
    averageRating: number;
    ratingsCount: number;
    reviews: Array<{
      id: string;
      rating: number;
      review: string;
      user: {
        id: string;
        name: string;
      };
      createdAt: Date;
    }>;
  } | null> {
    try {
      // Note: This is a placeholder implementation since the rating system
      // currently only supports products, not ads. You would need to extend
      // the rating system to support ads or create a separate ad rating system.

      // For now, return null to indicate no ratings available
      return null;
    } catch (error) {
      console.error('Error fetching ad ratings:', error);
      return null;
    }
  }
}
