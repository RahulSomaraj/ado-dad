import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite, FavoriteDocument } from './schemas/schema.favorite';
import { RedisService } from '../shared/redis.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { AdsService } from '../ads/services/ads.service';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    private readonly redisService: RedisService,
    private readonly adsService: AdsService,
  ) {}

  async addFavorite(
    userId: string,
    createFavoriteDto: CreateFavoriteDto,
  ): Promise<{
    isFavorited: boolean;
    favoriteId?: string;
    message: string;
  }> {
    // Verify that the ad exists
    const adExists = await this.adsService.exists(createFavoriteDto.adId);
    if (!adExists) {
      throw new BadRequestException({
        error: {
          status: 400,
          message: `Ad with ID ${createFavoriteDto.adId} not found`,
        },
      });
    }

    // Check if already favorited
    const existingFavorite = await this.favoriteModel.findOne({
      userId,
      itemId: createFavoriteDto.adId,
      itemType: 'ad',
    });

    if (existingFavorite) {
      // Remove from favorites
      await this.favoriteModel.deleteOne({ _id: existingFavorite._id });
      await this.invalidateFavoritesCache(userId);
      return {
        isFavorited: false,
        message: 'Ad removed from favorites',
      };
    } else {
      // Add to favorites
      const favorite = new this.favoriteModel({
        userId,
        itemId: createFavoriteDto.adId,
        itemType: 'ad', // Always ads
      });
      const saved = await favorite.save();
      await this.invalidateFavoritesCache(userId);
      return {
        isFavorited: true,
        favoriteId: (saved._id as any).toString(),
        message: 'Ad added to favorites',
      };
    }
  }

  async getUserFavorites(
    userId: string,
    query: {
      itemId?: string;
      itemType?: string;
      page?: number;
      limit?: number;
      category?: string;
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `fav:list:${userId}:${JSON.stringify(query || {})}`;
    const cached = await this.redisService.cacheGet<any>(cacheKey);
    if (cached) return cached;

    const filter: any = { userId };

    if (query.itemId) {
      filter.itemId = query.itemId;
    }

    if (query.itemType) {
      filter.itemType = query.itemType;
    }

    // Get favorites with detailed population
    const favorites = await this.favoriteModel
      .find(filter)
      .populate({
        path: 'itemId',
        match: query.category ? { category: query.category } : {},
        populate: [
          {
            path: 'postedBy',
            select: 'name email phoneNumber profilePic type',
          },
          {
            path: 'propertyDetails',
            model: 'PropertyAd',
          },
          {
            path: 'vehicleDetails',
            model: 'VehicleAd',
          },
          {
            path: 'commercialVehicleDetails',
            model: 'CommercialVehicleAd',
          },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out null items (ads that don't match category filter)
    const validFavorites = favorites.filter((fav) => fav.itemId);

    // Get total count
    const total = await this.favoriteModel.countDocuments(filter);

    // Transform to detailed ad response format
    const detailedAds = validFavorites.map((favorite) => {
      const ad = favorite.itemId as any;
      return {
        id: ad._id.toString(),
        description: ad.description,
        price: ad.price,
        images: ad.images || [],
        location: ad.location,
        category: ad.category,
        isActive: ad.isActive,
        postedAt: ad.createdAt,
        updatedAt: ad.updatedAt,
        postedBy: ad.postedBy?._id?.toString(),
        user: ad.postedBy
          ? {
              id: ad.postedBy._id.toString(),
              name: ad.postedBy.name,
              email: ad.postedBy.email,
              phone: ad.postedBy.phoneNumber,
            }
          : undefined,
        propertyDetails: ad.propertyDetails?.[0] || undefined,
        vehicleDetails: ad.vehicleDetails?.[0] || undefined,
        commercialVehicleDetails: ad.commercialVehicleDetails?.[0] || undefined,
        favoriteId: (favorite._id as any).toString(),
        favoritedAt: (favorite as any).createdAt,
      };
    });

    const totalPages = Math.ceil(total / limit);
    const result = {
      data: detailedAds,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    await this.redisService.cacheSet(cacheKey, result, 120);
    return result;
  }

  async getFavoriteById(userId: string, favoriteId: string): Promise<any> {
    const favorite = await this.favoriteModel
      .findOne({ _id: favoriteId, userId })
      .populate({
        path: 'itemId',
        populate: [
          {
            path: 'postedBy',
            select: 'name email phoneNumber profilePic type',
          },
          {
            path: 'propertyDetails',
            model: 'PropertyAd',
          },
          {
            path: 'vehicleDetails',
            model: 'VehicleAd',
          },
          {
            path: 'commercialVehicleDetails',
            model: 'CommercialVehicleAd',
          },
        ],
      });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    const ad = favorite.itemId as any;
    return {
      id: ad._id.toString(),
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      category: ad.category,
      isActive: ad.isActive,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy?._id?.toString(),
      user: ad.postedBy
        ? {
            id: ad.postedBy._id.toString(),
            name: ad.postedBy.name,
            email: ad.postedBy.email,
            phone: ad.postedBy.phoneNumber,
          }
        : undefined,
      propertyDetails: ad.propertyDetails?.[0] || undefined,
      vehicleDetails: ad.vehicleDetails?.[0] || undefined,
      commercialVehicleDetails: ad.commercialVehicleDetails?.[0] || undefined,
      favoriteId: (favorite._id as any).toString(),
      favoritedAt: (favorite as any).createdAt,
    };
  }

  async updateFavorite(
    userId: string,
    favoriteId: string,
    updateFavoriteDto: UpdateFavoriteDto,
  ): Promise<Favorite> {
    // Verify that the ad exists
    const adExists = await this.adsService.exists(updateFavoriteDto.adId);
    if (!adExists) {
      throw new BadRequestException({
        error: {
          status: 400,
          message: `Ad with ID ${updateFavoriteDto.adId} not found`,
        },
      });
    }

    // Check if the new ad is already favorited by this user
    const existingFavorite = await this.favoriteModel.findOne({
      userId,
      itemId: updateFavoriteDto.adId,
      itemType: 'ad',
      _id: { $ne: favoriteId }, // Exclude current favorite
    });

    if (existingFavorite) {
      throw new BadRequestException({
        error: {
          status: 400,
          message: 'Ad is already in your favorites',
        },
      });
    }

    const favorite = await this.favoriteModel.findOneAndUpdate(
      { _id: favoriteId, userId },
      {
        itemId: updateFavoriteDto.adId,
        itemType: 'ad', // Always ads
      },
      { new: true },
    );
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    await this.invalidateFavoritesCache(userId);
    return favorite;
  }

  async removeFavorite(
    userId: string,
    favoriteId: string,
  ): Promise<{ message: string }> {
    const favorite = await this.favoriteModel.findOneAndDelete({
      _id: favoriteId,
      userId,
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    await this.invalidateFavoritesCache(userId);
    return { message: 'Item removed from favorites' };
  }

  async toggleFavorite(
    userId: string,
    adId: string,
  ): Promise<{
    isFavorited: boolean;
    favoriteId?: string;
    message: string;
  }> {
    // Verify that the ad exists
    const adExists = await this.adsService.exists(adId);
    if (!adExists) {
      throw new BadRequestException({
        error: {
          status: 400,
          message: `Ad with ID ${adId} not found`,
        },
      });
    }

    // Check if already favorited
    const existingFavorite = await this.favoriteModel.findOne({
      userId,
      itemId: adId,
      itemType: 'ad',
    });

    if (existingFavorite) {
      // Remove from favorites
      await this.favoriteModel.deleteOne({ _id: existingFavorite._id });
      await this.invalidateFavoritesCache(userId);
      return {
        isFavorited: false,
        message: 'Ad removed from favorites',
      };
    } else {
      // Add to favorites
      const favorite = new this.favoriteModel({
        userId,
        itemId: adId,
        itemType: 'ad',
      });
      const saved = await favorite.save();
      await this.invalidateFavoritesCache(userId);
      return {
        isFavorited: true,
        favoriteId: (saved._id as any).toString(),
        message: 'Ad added to favorites',
      };
    }
  }

  async getFavoritesCount(
    userId: string,
    query: { category?: string },
  ): Promise<{ count: number; category?: string }> {
    const filter: any = { userId, itemType: 'ad' };

    if (query.category) {
      // Count favorites where the ad matches the category
      const favorites = await this.favoriteModel
        .find(filter)
        .populate({
          path: 'itemId',
          match: { category: query.category },
          select: 'category',
        })
        .lean();

      const count = favorites.filter((fav) => fav.itemId).length;
      return { count, category: query.category };
    }

    const count = await this.favoriteModel.countDocuments(filter);
    return { count };
  }

  private async invalidateFavoritesCache(userId: string): Promise<void> {
    try {
      const keys = await this.redisService.keys(`fav:list:${userId}:*`);
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch {}
  }
}
