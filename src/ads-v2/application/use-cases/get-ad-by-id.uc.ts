import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { DetailedAdResponseDto } from '../../../ads/dto/common/ad-response.dto';
import { AdCategory } from '../../../ads/schemas/ad.schema';
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
import { Model } from 'mongoose';

@Injectable()
export class GetAdByIdUc {
  private static readonly CACHE_PREFIX = 'ads:v2:getById:';
  private static readonly TTL = 900; // 15 minutes

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
  ) {}

  async exec(input: {
    adId: string;
    userId?: string;
  }): Promise<DetailedAdResponseDto> {
    const { adId, userId } = input;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(adId)) {
      throw new BadRequestException(`Invalid ad ID: ${adId}`);
    }

    // Check cache first
    const cacheKey = `${GetAdByIdUc.CACHE_PREFIX}${adId}:${userId || 'anonymous'}`;
    const cached = await this.cache.get<DetailedAdResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build comprehensive aggregation pipeline
    const pipeline = [
      { $match: { _id: new Types.ObjectId(adId), isDeleted: { $ne: true } } },

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
                phoneNumber: 1,
                profilePic: 1,
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

    const results = await this.adRepo.aggregate(pipeline);
    if (results.length === 0) {
      throw new NotFoundException(`Advertisement with ID ${adId} not found`);
    }

    const ad = results[0];

    // Increment view count
    await this.adRepo.updateOne(
      { _id: new Types.ObjectId(adId) },
      { $inc: { viewCount: 1 } },
    );

    // Map to detailed response DTO
    const detailed = this.mapToDetailedResponseDto(ad);

    // Populate vehicle inventory details with sub-relations
    if (
      ad.category === AdCategory.PRIVATE_VEHICLE ||
      ad.category === AdCategory.TWO_WHEELER ||
      ad.category === AdCategory.COMMERCIAL_VEHICLE
    ) {
      await this.populateVehicleInventoryDetails(detailed);
    }

    // Get favorites count
    const favoritesCount = await this.favoriteModel.countDocuments({
      itemId: new Types.ObjectId(adId),
      itemType: 'ad',
    });
    detailed.favoritesCount = favoritesCount;

    // Check if current user has favorited this ad
    if (userId) {
      const userFavorite = await this.favoriteModel.findOne({
        userId: new Types.ObjectId(userId),
        itemId: new Types.ObjectId(adId),
        itemType: 'ad',
      });
      detailed.isFavorited = !!userFavorite;
      detailed.isFavorite = !!userFavorite; // For consistency with list endpoint
    } else {
      detailed.isFavorite = false; // For unauthenticated users
    }

    // Get chat relations
    await this.populateChatRelations(detailed, userId);

    // Get ratings and reviews (placeholder for future implementation)
    const ratings = await this.getAdRatings(adId);
    if (ratings) {
      detailed.averageRating = ratings.averageRating;
      detailed.ratingsCount = ratings.ratingsCount;
      detailed.reviews = ratings.reviews;
    }

    // Add view count to response
    detailed.viewCount = (ad.viewCount || 0) + 1;

    // Cache the result
    await this.cache.setById(
      adId,
      userId || 'anonymous',
      detailed,
      GetAdByIdUc.TTL,
    );
    return detailed;
  }

  private mapToDetailedResponseDto(ad: any): DetailedAdResponseDto {
    return {
      id: ad._id.toString(),
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      category: ad.category,
      isActive: ad.isActive,
      soldOut: ad.soldOut || false,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy.toString(),
      user: ad.user
        ? {
            id: ad.user._id.toString(),
            name: ad.user.name,
            email: ad.user.email,
            phone: ad.user.phoneNumber,
          }
        : undefined,
      propertyDetails: ad.propertyDetails?.[0] || undefined,
      vehicleDetails: ad.vehicleDetails?.[0] || undefined,
      commercialVehicleDetails: ad.commercialVehicleDetails?.[0] || undefined,
    };
  }

  private async populateVehicleInventoryDetails(
    detailedAd: DetailedAdResponseDto,
  ): Promise<void> {
    try {
      const vehicleDetails =
        detailedAd.vehicleDetails || detailedAd.commercialVehicleDetails;
      if (!vehicleDetails) return;

      const inv: any = {};

      if (vehicleDetails.manufacturerId) {
        try {
          const name = await this.inventory.getManufacturerName(
            vehicleDetails.manufacturerId,
          );
          if (name) {
            inv.manufacturer = {
              id: vehicleDetails.manufacturerId,
              name: name,
              country: undefined,
            };
          }
        } catch {}
      }

      if (vehicleDetails.modelId) {
        try {
          const name = await this.inventory.getModelName(
            vehicleDetails.modelId,
          );
          if (name) {
            inv.model = {
              id: vehicleDetails.modelId,
              name: name,
              manufacturerId: vehicleDetails.manufacturerId,
            };
          }
        } catch {}
      }

      if (vehicleDetails.variantId) {
        try {
          const name = await this.inventory.getVariantName(
            vehicleDetails.variantId,
          );
          if (name) {
            inv.variant = {
              id: vehicleDetails.variantId,
              name: name,
              modelId: vehicleDetails.modelId,
              price: undefined,
            };
          }
        } catch {}
      }

      if (vehicleDetails.transmissionTypeId) {
        try {
          const name = await this.inventory.getTransmissionTypeName(
            vehicleDetails.transmissionTypeId,
          );
          if (name) {
            inv.transmissionType = {
              id: vehicleDetails.transmissionTypeId,
              name: name,
              description: undefined,
            };
          }
        } catch {}
      }

      if (vehicleDetails.fuelTypeId) {
        try {
          const name = await this.inventory.getFuelTypeName(
            vehicleDetails.fuelTypeId,
          );
          if (name) {
            inv.fuelType = {
              id: vehicleDetails.fuelTypeId,
              name: name,
              description: undefined,
            };
          }
        } catch {}
      }

      // Attach inventory details to the appropriate vehicle details
      if (detailedAd.vehicleDetails) {
        (detailedAd.vehicleDetails as any).inventory = inv;
      } else if (detailedAd.commercialVehicleDetails) {
        (detailedAd.commercialVehicleDetails as any).inventory = inv;
      }
    } catch (error) {
      console.error('Error populating vehicle inventory details:', error);
    }
  }

  private async populateChatRelations(
    detailedAd: DetailedAdResponseDto,
    userId?: string,
  ): Promise<void> {
    try {
      // Get chat rooms related to this ad
      const chatRooms = await this.chatRoomModel
        .find({ adId: new Types.ObjectId(detailedAd.id) })
        .populate('initiatorId', 'name email profilePic')
        .populate('adPosterId', 'name email profilePic')
        .sort({ lastMessageAt: -1 })
        .limit(10)
        .lean();

      // Get last message for each chat room
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

      detailedAd.chats = chatRoomsWithMessages;
      detailedAd.chatsCount = chatRooms.length;

      // Check if current user has an active chat with this ad
      if (userId) {
        const userChatRoom = await this.chatRoomModel.findOne({
          adId: new Types.ObjectId(detailedAd.id),
          $or: [
            { initiatorId: new Types.ObjectId(userId) },
            { adPosterId: new Types.ObjectId(userId) },
          ],
        });
        detailedAd.hasUserChat = !!userChatRoom;
      }
    } catch (error) {
      console.error('Error populating chat relations:', error);
      // Don't throw error, just set empty values
      detailedAd.chats = [];
      detailedAd.chatsCount = 0;
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
