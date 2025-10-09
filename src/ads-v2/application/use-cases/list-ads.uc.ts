import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { RedisService } from '../../../shared/redis.service';
import { ListAdsV2Dto } from '../../dto/list-ads-v2.dto';
import { DetailedAdResponseDto } from '../../../ads/dto/common/ad-response.dto';
import {
  Favorite,
  FavoriteDocument,
} from '../../../favorites/schemas/schema.favorite';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface PaginatedAdsResponse {
  data: DetailedAdResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CachedListData {
  data: DetailedAdResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  cachedAt: number;
}

@Injectable()
export class ListAdsUc {
  private static readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly adRepo: AdRepository,
    private readonly inventory: VehicleInventoryGateway,
    private readonly cache: AdsCache,
    private readonly redisService: RedisService,
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
  ) {}

  async exec(
    filters: ListAdsV2Dto,
    userId?: string,
  ): Promise<PaginatedAdsResponse> {
    // 1. Check if this request should be cached
    const cacheKey = this.generateListCacheKey(filters);

    let baseData: CachedListData | null = null;

    if (cacheKey) {
      // 2. Try to get from cache (only for specific scenarios)
      baseData = await this.cache.get<CachedListData>(cacheKey);
    }

    if (!baseData) {
      // 3. Fetch from database
      baseData = await this.fetchListDataFromDatabase(filters);

      // 4. Cache only if it's one of our target scenarios
      if (cacheKey) {
        await this.cache.setList(cacheKey, baseData, ListAdsUc.CACHE_TTL);
      }
    }

    // 5. Add user-specific isFavorite data
    if (userId) {
      const userFavorites = await this.getUserFavorites(userId);
      baseData.data = this.addIsFavoriteToAds(baseData.data, userFavorites);
    } else {
      baseData.data = this.addIsFavoriteToAds(baseData.data, []);
    }

    return {
      data: baseData.data,
      total: baseData.total,
      page: baseData.page,
      limit: baseData.limit,
      totalPages: baseData.totalPages,
      hasNext: baseData.hasNext,
      hasPrev: baseData.hasPrev,
    };
  }

  /**
   * Generate cache key only for specific scenarios:
   * 1. All ads (no filters except pagination and sort)
   * 2. Category + Location only (no other filters)
   */
  private generateListCacheKey(filters: ListAdsV2Dto): string | null {
    const {
      category,
      location,
      search,
      minPrice,
      maxPrice,
      fuelTypeIds,
      transmissionTypeIds,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filters;

    // Scenario 1: All ads (no filters except pagination and sort)
    if (
      !category &&
      !location &&
      !search &&
      !minPrice &&
      !maxPrice &&
      !fuelTypeIds?.length &&
      !transmissionTypeIds?.length
    ) {
      return `ads:v2:list:all&page=${page || 1}&limit=${limit || 20}&sortBy=${sortBy || 'createdAt'}&sortOrder=${sortOrder || 'DESC'}`;
    }

    // Scenario 2: Category + Location only (no other filters)
    if (
      category &&
      location &&
      !search &&
      !minPrice &&
      !maxPrice &&
      !fuelTypeIds?.length &&
      !transmissionTypeIds?.length
    ) {
      return `ads:v2:list:category=${category}&location=${location}&page=${page || 1}&limit=${limit || 20}&sortBy=${sortBy || 'createdAt'}&sortOrder=${sortOrder || 'DESC'}`;
    }

    // All other combinations: NO CACHING
    return null;
  }

  /**
   * Fetch list data from database (original logic)
   */
  private async fetchListDataFromDatabase(
    filters: ListAdsV2Dto,
  ): Promise<CachedListData> {
    const {
      category,
      search,
      location,
      minPrice,
      maxPrice,
      fuelTypeIds,
      transmissionTypeIds,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // Build simplified aggregation pipeline
    const pipeline: any[] = [];

    // Base match - exclude deleted ads
    pipeline.push({
      $match: {
        isDeleted: { $ne: true },
        isActive: true,
      },
    });

    // Category filter
    if (category) {
      pipeline.push({
        $match: { category },
      });
    }

    // Location filter
    if (location) {
      pipeline.push({
        $match: {
          location: { $regex: location, $options: 'i' },
        },
      });
    }

    // Price filters (before lookups)
    if (minPrice || maxPrice) {
      const priceMatch: any = {};
      if (minPrice) priceMatch.$gte = minPrice;
      if (maxPrice) priceMatch.$lte = maxPrice;
      pipeline.push({
        $match: { price: priceMatch },
      });
    }

    // Basic search filter (before lookups)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            // Basic ad fields
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // User lookup
    pipeline.push({
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
    });
    pipeline.push({
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    });

    // Property details lookup
    pipeline.push({
      $lookup: {
        from: 'propertyads',
        localField: '_id',
        foreignField: 'ad',
        as: 'propertyDetails',
      },
    });

    // Vehicle details lookup
    pipeline.push({
      $lookup: {
        from: 'vehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'vehicleDetails',
      },
    });

    // Commercial vehicle details lookup
    pipeline.push({
      $lookup: {
        from: 'commercialvehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'commercialVehicleDetails',
      },
    });

    // Two-wheeler specific filters (only apply if category is two_wheeler)
    if (
      category === 'two_wheeler' &&
      (fuelTypeIds?.length || transmissionTypeIds?.length)
    ) {
      const twoWheelerMatch: any = {};

      if (fuelTypeIds?.length && transmissionTypeIds?.length) {
        twoWheelerMatch.vehicleDetails = {
          $elemMatch: {
            fuelTypeId: {
              $in: fuelTypeIds.map((id) => new Types.ObjectId(id)),
            },
            transmissionTypeId: {
              $in: transmissionTypeIds.map((id) => new Types.ObjectId(id)),
            },
          },
        };
      } else if (fuelTypeIds?.length) {
        twoWheelerMatch.vehicleDetails = {
          $elemMatch: {
            fuelTypeId: {
              $in: fuelTypeIds.map((id) => new Types.ObjectId(id)),
            },
          },
        };
      } else if (transmissionTypeIds?.length) {
        twoWheelerMatch.vehicleDetails = {
          $elemMatch: {
            transmissionTypeId: {
              $in: transmissionTypeIds.map((id) => new Types.ObjectId(id)),
            },
          },
        };
      }

      pipeline.push({
        $match: twoWheelerMatch,
      });
    }

    // No favorites lookup in base data - will be added per user

    // Add fields for better response structure
    pipeline.push({
      $addFields: {
        id: '$_id',
        postedAt: '$createdAt',
        user: {
          id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phoneNumber',
          profilePic: '$user.profilePic',
        },
        isFavorite: false, // Will be set per user
        propertyDetails: { $arrayElemAt: ['$propertyDetails', 0] },
        vehicleDetails: { $arrayElemAt: ['$vehicleDetails', 0] },
        commercialVehicleDetails: {
          $arrayElemAt: ['$commercialVehicleDetails', 0],
        },
      },
    });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        price: 1,
        images: 1,
        location: 1,
        category: 1,
        isActive: 1,
        soldOut: 1,
        postedBy: 1,
        createdAt: 1,
        updatedAt: 1,
        viewCount: 1,
        id: 1,
        postedAt: 1,
        user: 1,
        isFavorite: 1,
        propertyDetails: 1,
        vehicleDetails: 1,
        commercialVehicleDetails: 1,
      },
    });

    // Sort
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;
    pipeline.push({
      $sort: { [sortBy]: sortDirection },
    });

    // Count total documents
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute queries
    const [data, countResult] = await Promise.all([
      this.adRepo.aggregate(pipeline),
      this.adRepo.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Map the data to include vehicle inventory details
    const mappedData = await Promise.all(
      data.map((ad) => this.mapToDetailedResponseDto(ad)),
    );

    return {
      data: mappedData,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      cachedAt: Date.now(),
    };
  }

  private async mapToDetailedResponseDto(
    ad: any,
  ): Promise<DetailedAdResponseDto> {
    // Process vehicle details with inventory information
    const vehicleDetails = ad.vehicleDetails;
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
    const commercialVehicleDetails = ad.commercialVehicleDetails;
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
      isApproved: ad.isApproved || false,
      approvedBy: ad.approvedBy ? ad.approvedBy.toString() : undefined,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy.toString(),
      user: ad.user
        ? {
            id: ad.user._id.toString(),
            name: ad.user.name,
            email: ad.user.email,
            phone: ad.user.phone,
            profilePic: ad.user.profilePic,
          }
        : undefined,
      propertyDetails: ad.propertyDetails || undefined,
      vehicleDetails: processedVehicleDetails,
      commercialVehicleDetails: processedCommercialVehicleDetails,
      isFavorite: ad.isFavorite || false,
    };
  }

  /**
   * Get user's favorite ad IDs (with caching)
   */
  private async getUserFavorites(userId: string): Promise<string[]> {
    const cacheKey = `ads:v2:userFavorites:${userId}`;
    let favorites = await this.cache.get<string[]>(cacheKey);

    if (!favorites) {
      // Fetch from database
      const favoriteDocs = await this.favoriteModel
        .find({
          userId: new Types.ObjectId(userId),
        })
        .select('itemId')
        .lean();

      favorites = favoriteDocs.map((doc) => doc.itemId.toString());

      // Cache for 5 minutes - use RedisService directly
      await this.redisService.cacheSet(
        cacheKey,
        favorites,
        ListAdsUc.CACHE_TTL,
      );
    }

    return favorites;
  }

  /**
   * Add isFavorite field to ads based on user's favorites
   */
  private addIsFavoriteToAds(
    ads: DetailedAdResponseDto[],
    userFavorites: string[],
  ): DetailedAdResponseDto[] {
    return ads.map((ad) => ({
      ...ad,
      isFavorite: userFavorites.includes(ad.id),
    }));
  }
}
