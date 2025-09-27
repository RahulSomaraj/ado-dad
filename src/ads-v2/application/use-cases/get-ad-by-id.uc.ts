import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
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
  constructor(
    private readonly adRepo: AdRepository,
    private readonly inventory: VehicleInventoryGateway,
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

    // No caching - fetch directly from database

    // Build simplified aggregation pipeline
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

    // Map to detailed response DTO with individual vehicle inventory lookups
    const detailed = await this.mapToDetailedResponseDto(ad);

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
          this.inventory.getTransmissionType(
            vehicleDetails.transmissionTypeId || '',
          ),
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
          phone: ad.user.phoneNumber,
          profilePic: ad.user.profilePic,
        }
      : undefined;

    return {
      id: ad._id.toString(),
      title: ad.title,
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
      user: userResponse,
      propertyDetails: ad.propertyDetails?.[0] || undefined,
      vehicleDetails: processedVehicleDetails,
      commercialVehicleDetails: processedCommercialVehicleDetails,
    };
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
