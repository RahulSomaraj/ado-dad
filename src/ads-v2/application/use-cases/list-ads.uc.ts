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
import { LocationHierarchyService } from '../../../common/services/location-hierarchy.service';

export interface PaginatedAdsResponse {
  data: DetailedAdResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  appliedRadiusKm?: number | null; // The radius that was actually used for geospatial query
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
  appliedRadiusKm?: number | null; // The radius that was actually used for geospatial query
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
    private readonly locationHierarchyService: LocationHierarchyService,
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
      appliedRadiusKm: baseData.appliedRadiusKm ?? null,
    };
  }

  /**
   * Generate cache key only for specific scenarios:
   * 1. All ads (no filters except pagination and sort)
   * 2. Category + Location only (no other filters)
   *
   * IMPORTANT: Geo queries (latitude/longitude) are NOT cached
   * because radius expansion makes results unpredictable
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
      listingType,
      latitude,
      longitude,
    } = filters;

    // 🔴 CRITICAL: Disable caching for geo queries
    // Geo queries use dynamic radius expansion, making results unpredictable
    if (latitude !== undefined && longitude !== undefined) {
      return null;
    }

    // Scenario 1: All ads (no filters except pagination and sort)
    if (
      !category &&
      !location &&
      !search &&
      !minPrice &&
      !maxPrice &&
      !fuelTypeIds?.length &&
      !transmissionTypeIds?.length &&
      !listingType
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
      !transmissionTypeIds?.length &&
      !listingType
    ) {
      return `ads:v2:list:category=${category}&location=${location}&page=${page || 1}&limit=${limit || 20}&sortBy=${sortBy || 'createdAt'}&sortOrder=${sortOrder || 'DESC'}`;
    }

    // All other combinations: NO CACHING
    return null;
  }

  /**
   * Fetch list data from database with automatic distance fallback
   */
  private async fetchListDataFromDatabase(
    filters: ListAdsV2Dto,
  ): Promise<CachedListData> {
    // If location coordinates are provided, try with automatic distance fallback
    if (filters.latitude !== undefined && filters.longitude !== undefined) {
      return await this.fetchWithDistanceFallback(filters);
    }

    // Otherwise, use the original logic
    return await this.fetchWithOriginalLogic(filters);
  }

  /**
   * Fetch with automatic distance fallback when results are insufficient
   * Expands radius until we have enough results or reach max radius
   */
  private async fetchWithDistanceFallback(
    filters: ListAdsV2Dto,
  ): Promise<CachedListData> {
    const distanceThresholds = [50, 100, 200, 500, 1000]; // km
    let bestResult: CachedListData | null = null;

    for (const distance of distanceThresholds) {
      try {
        const result = await this.fetchWithSpecificDistance(filters, distance);

        // First non-empty result becomes baseline
        if (!bestResult && result.total > 0) {
          bestResult = result;
        }

        // ✅ FIX: Stop expanding if we have enough results for the requested page
        // Must check: total >= page * limit to ensure enough data for pagination
        const requestedPage = filters.page || 1;
        const requestedLimit = filters.limit || 20;
        const requiredTotal = requestedPage * requestedLimit;

        if (result.total >= requiredTotal) {
          return result;
        }
      } catch (error) {
        console.warn(`Failed to fetch with distance ${distance}km:`, error);
        // Continue to next distance threshold
      }
    }

    // If we never hit minimum, return the best available result
    if (bestResult) {
      return bestResult;
    }

    // Final fallback: no geo filtering at all
    const { latitude, longitude, ...filtersWithoutLocation } = filters;
    return await this.fetchWithOriginalLogic(filtersWithoutLocation);
  }

  /**
   * Fetch with a specific distance threshold
   */
  private async fetchWithSpecificDistance(
    filters: ListAdsV2Dto,
    distanceKm: number,
  ): Promise<CachedListData> {
    const modifiedFilters = { ...filters };
    // Pass the distance to $geoNear for geospatial filtering
    return await this.fetchWithOriginalLogic(modifiedFilters, distanceKm);
  }

  /**
   * Fetch list data from database (original logic with optional distance override)
   */
  private async fetchWithOriginalLogic(
    filters: ListAdsV2Dto,
    customDistanceKm?: number,
  ): Promise<CachedListData> {
    const {
      category,
      search,
      location,
      latitude,
      longitude,
      minPrice,
      maxPrice,
      fuelTypeIds,
      transmissionTypeIds,
      manufacturerIds,
      modelIds,
      minYear,
      maxYear,
      propertyTypes,
      listingType,
      minBedrooms,
      maxBedrooms,
      minArea,
      maxArea,
      isFurnished,
      hasParking,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // ✅ CRITICAL FIX: Build basePipeline first (NO pagination, NO sort)
    // This ensures countPipeline gets accurate total count
    const basePipeline: any[] = [];

    // Use $geoNear when coordinates are provided (MUST be first stage)
    if (latitude !== undefined && longitude !== undefined) {
      const maxDistanceKm = customDistanceKm ?? 50; // Default 50km radius

      basePipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude], // [longitude, latitude] for GeoJSON
          },
          key: 'geoLocation', // Use the 2dsphere indexed field
          distanceField: 'distance', // Add distance field to each document
          spherical: true, // Use spherical geometry for accurate distance calculation
          distanceMultiplier: 0.001, // Convert meters to kilometers
          maxDistance: maxDistanceKm * 1000, // Convert km to meters for MongoDB
          query: {
            // Base filters applied within $geoNear
            // Note: geoLocation validation is handled by MongoDB's 2dsphere index
            // Removing explicit geoLocation check allows fallback to work correctly
            isDeleted: { $ne: true },
            isActive: true,
            isApproved: true,
            soldOut: { $ne: true },
          },
        },
      });
    } else {
      // No coordinates - use regular match for base filters
      basePipeline.push({
        $match: {
          isDeleted: { $ne: true },
          isActive: true,
          isApproved: true,
          soldOut: { $ne: true },
        },
      });
    }

    // Category filter
    if (category) {
      basePipeline.push({
        $match: { category },
      });
    }

    // Location filter
    if (location) {
      basePipeline.push({
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
      basePipeline.push({
        $match: { price: priceMatch },
      });
    }

    // Basic search filter (before lookups)
    if (search) {
      basePipeline.push({
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
    basePipeline.push({
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
              type: 1,
              createdAt: 1,
              isDeleted: 1,
            },
          },
        ],
      },
    });
    basePipeline.push({
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    });

    // Property details lookup
    basePipeline.push({
      $lookup: {
        from: 'propertyads',
        localField: '_id',
        foreignField: 'ad',
        as: 'propertyDetails',
      },
    });

    // Property-specific filters
    // ✅ FIX: Use $elemMatch since propertyDetails is still an array at filter time
    if (
      propertyTypes ||
      listingType ||
      minBedrooms !== undefined ||
      maxBedrooms !== undefined ||
      minArea !== undefined ||
      maxArea !== undefined ||
      isFurnished !== undefined ||
      hasParking !== undefined
    ) {
      // Ensure we are filtering only property ads when property filters are present
      basePipeline.push({ $match: { category: 'property' } });

      const elemMatchConditions: any = {};

      if (propertyTypes && propertyTypes.length > 0) {
        elemMatchConditions.propertyType = { $in: propertyTypes };
      }
      if (listingType) {
        elemMatchConditions.listingType = listingType;
      }
      if (minBedrooms !== undefined || maxBedrooms !== undefined) {
        elemMatchConditions.bedrooms = {};
        if (minBedrooms !== undefined)
          elemMatchConditions.bedrooms.$gte = minBedrooms;
        if (maxBedrooms !== undefined)
          elemMatchConditions.bedrooms.$lte = maxBedrooms;
      }
      if (minArea !== undefined || maxArea !== undefined) {
        elemMatchConditions.areaSqft = {};
        if (minArea !== undefined) elemMatchConditions.areaSqft.$gte = minArea;
        if (maxArea !== undefined) elemMatchConditions.areaSqft.$lte = maxArea;
      }
      if (isFurnished !== undefined) {
        elemMatchConditions.isFurnished = isFurnished;
      }
      if (hasParking !== undefined) {
        elemMatchConditions.hasParking = hasParking;
      }

      if (Object.keys(elemMatchConditions).length > 0) {
        // ✅ FIX: Use $elemMatch to correctly filter array field
        basePipeline.push({
          $match: {
            propertyDetails: {
              $elemMatch: elemMatchConditions,
            },
          },
        });
      }
    }

    // Vehicle details lookup
    basePipeline.push({
      $lookup: {
        from: 'vehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'vehicleDetails',
      },
    });

    // Commercial vehicle details lookup
    basePipeline.push({
      $lookup: {
        from: 'commercialvehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'commercialVehicleDetails',
      },
    });

    // Vehicle specific filters
    // ✅ FIX: Apply vehicle filters when vehicle filters are present, regardless of category
    // This matches OLX behavior where filters work even without explicit category selection
    if (
      fuelTypeIds?.length ||
      transmissionTypeIds?.length ||
      manufacturerIds?.length ||
      modelIds?.length ||
      minYear !== undefined ||
      maxYear !== undefined
    ) {
      const elemMatchConditions: any = {};

      if (fuelTypeIds?.length) {
        elemMatchConditions.fuelTypeId = {
          $in: fuelTypeIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (transmissionTypeIds?.length) {
        elemMatchConditions.transmissionTypeId = {
          $in: transmissionTypeIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (manufacturerIds?.length) {
        elemMatchConditions.manufacturerId = {
          $in: manufacturerIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (modelIds?.length) {
        elemMatchConditions.modelId = {
          $in: modelIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (minYear !== undefined || maxYear !== undefined) {
        elemMatchConditions.year = {};
        if (minYear !== undefined) elemMatchConditions.year.$gte = minYear;
        if (maxYear !== undefined) elemMatchConditions.year.$lte = maxYear;
      }

      if (Object.keys(elemMatchConditions).length > 0) {
        // ✅ FIX: Apply filters to both vehicle collections when category is not specified
        // If category is specified, still check both to handle edge cases
        if (category === 'commercial_vehicle') {
          // Only commercial vehicles
          basePipeline.push({
            $match: {
              commercialVehicleDetails: {
                $elemMatch: elemMatchConditions,
              },
            },
          });
        } else {
          // Apply to both vehicleDetails and commercialVehicleDetails
          // This handles: no category, private_vehicle, two_wheeler, or mixed scenarios
          basePipeline.push({
            $match: {
              $or: [
                { vehicleDetails: { $elemMatch: elemMatchConditions } },
                {
                  commercialVehicleDetails: { $elemMatch: elemMatchConditions },
                },
              ],
            },
          });
        }
      }
    }

    // No favorites lookup in base data - will be added per user

    // Add fields for better response structure
    basePipeline.push({
      $addFields: {
        id: '$_id',
        postedAt: '$createdAt',
        user: {
          id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          countryCode: '$user.countryCode',
          phoneNumber: '$user.phoneNumber',
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
    basePipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        price: 1,
        images: 1,
        location: 1,
        latitude: 1,
        longitude: 1,
        distance: 1, // Include distance field
        category: 1,
        isActive: 1,
        soldOut: 1,
        isApproved: 1, // Include isApproved field
        approvedBy: 1, // Include approvedBy field
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
        // distance field is already included above (added by $geoNear when coordinates are provided)
      },
    });

    // ✅ Clone basePipeline for data and count pipelines
    const dataPipeline = [...basePipeline];
    const countPipeline = [...basePipeline];

    // ✅ Apply sorting ONLY to dataPipeline
    // Priority: Search relevance > Distance > Recency
    if (search && latitude !== undefined && longitude !== undefined) {
      // When search + location: prioritize relevance (newest first), then distance
      // Users expect relevant results first, not just nearest
      dataPipeline.push({
        $sort: {
          createdAt: -1, // Newest/relevant first
          distance: 1, // Then nearest
          _id: -1, // Final tie-breaker for deterministic ordering
        },
      });
    } else if (latitude !== undefined && longitude !== undefined) {
      // Geospatial sorting (no search): distance first (nearest), then createdAt (newest)
      // Note: $geoNear ensures all results have a distance field
      dataPipeline.push({
        $sort: {
          distance: 1, // Nearest first (ascending distance)
          createdAt: -1, // Newest first within same distance
          _id: -1, // Final tie-breaker for deterministic ordering
        },
      });
    } else {
      // Regular sorting when no location filtering
      const sortDirection = sortOrder === 'ASC' ? 1 : -1;
      dataPipeline.push({
        $sort: {
          [sortBy]: sortDirection,
          _id: -1, // Tie-breaker for deterministic ordering
        },
      });
    }

    // ✅ Apply pagination ONLY to dataPipeline
    const skip = (page - 1) * limit;
    dataPipeline.push({ $skip: skip });
    dataPipeline.push({ $limit: limit });

    // ✅ Count pipeline: just add $count (no sort, no pagination)
    countPipeline.push({ $count: 'total' });

    // Execute queries
    const [data, countResult] = await Promise.all([
      this.adRepo.aggregate(dataPipeline),
      this.adRepo.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Batch fetch all inventory items to avoid N+1 queries
    const inventoryMaps = await this.batchFetchInventoryItems(data);

    // Map the data to include vehicle inventory details using pre-fetched data
    const mappedData = data.map((ad) =>
      this.mapToDetailedResponseDtoWithInventory(
        ad,
        inventoryMaps.manufacturers,
        inventoryMaps.models,
        inventoryMaps.variants,
        inventoryMaps.fuelTypes,
        inventoryMaps.transmissionTypes,
      ),
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
      appliedRadiusKm:
        latitude !== undefined && longitude !== undefined
          ? (customDistanceKm ?? 50)
          : null,
    };
  }

  /**
   * Batch fetch all inventory items for all ads to avoid N+1 queries
   */
  private async batchFetchInventoryItems(data: any[]): Promise<{
    manufacturers: Record<string, any>;
    models: Record<string, any>;
    variants: Record<string, any>;
    fuelTypes: Record<string, any>;
    transmissionTypes: Record<string, any>;
  }> {
    const manufacturerIds = new Set<string>();
    const modelIds = new Set<string>();
    const variantIds = new Set<string>();
    const fuelTypeIds = new Set<string>();
    const transmissionTypeIds = new Set<string>();

    // Collect all unique IDs from all ads
    for (const ad of data) {
      if (ad.vehicleDetails) {
        if (ad.vehicleDetails.manufacturerId)
          manufacturerIds.add(ad.vehicleDetails.manufacturerId.toString());
        if (ad.vehicleDetails.modelId)
          modelIds.add(ad.vehicleDetails.modelId.toString());
        if (ad.vehicleDetails.variantId)
          variantIds.add(ad.vehicleDetails.variantId.toString());
        if (ad.vehicleDetails.fuelTypeId)
          fuelTypeIds.add(ad.vehicleDetails.fuelTypeId.toString());
        if (ad.vehicleDetails.transmissionTypeId)
          transmissionTypeIds.add(
            ad.vehicleDetails.transmissionTypeId.toString(),
          );
      }
      if (ad.commercialVehicleDetails) {
        if (ad.commercialVehicleDetails.manufacturerId)
          manufacturerIds.add(
            ad.commercialVehicleDetails.manufacturerId.toString(),
          );
        if (ad.commercialVehicleDetails.modelId)
          modelIds.add(ad.commercialVehicleDetails.modelId.toString());
        if (ad.commercialVehicleDetails.variantId)
          variantIds.add(ad.commercialVehicleDetails.variantId.toString());
        if (ad.commercialVehicleDetails.fuelTypeId)
          fuelTypeIds.add(ad.commercialVehicleDetails.fuelTypeId.toString());
        if (ad.commercialVehicleDetails.transmissionTypeId)
          transmissionTypeIds.add(
            ad.commercialVehicleDetails.transmissionTypeId.toString(),
          );
      }
    }

    // Batch fetch all inventory items in parallel
    const [
      manufacturerResults,
      modelResults,
      variantResults,
      fuelTypeResults,
      transmissionTypeResults,
    ] = await Promise.all([
      manufacturerIds.size > 0
        ? this.inventory.getManufacturersByIds(Array.from(manufacturerIds))
        : Promise.resolve([]),
      modelIds.size > 0
        ? this.inventory.getModelsByIds(Array.from(modelIds))
        : Promise.resolve([]),
      variantIds.size > 0
        ? this.inventory.getVariantsByIds(Array.from(variantIds))
        : Promise.resolve([]),
      fuelTypeIds.size > 0
        ? this.inventory.getFuelTypesByIds(Array.from(fuelTypeIds))
        : Promise.resolve([]),
      transmissionTypeIds.size > 0
        ? this.inventory.getTransmissionTypesByIds(
            Array.from(transmissionTypeIds),
          )
        : Promise.resolve([]),
    ]);

    // Convert to maps keyed by ID string
    const manufacturers: Record<string, any> = {};
    manufacturerResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) manufacturers[id] = this.normalizeObjectIds(item);
    });

    const models: Record<string, any> = {};
    modelResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) models[id] = this.normalizeObjectIds(item);
    });

    const variants: Record<string, any> = {};
    variantResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) variants[id] = this.normalizeObjectIds(item);
    });

    const fuelTypes: Record<string, any> = {};
    fuelTypeResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) fuelTypes[id] = this.normalizeObjectIds(item);
    });

    const transmissionTypes: Record<string, any> = {};
    transmissionTypeResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) transmissionTypes[id] = this.normalizeObjectIds(item);
    });

    return {
      manufacturers,
      models,
      variants,
      fuelTypes,
      transmissionTypes,
    };
  }

  /**
   * Extract ObjectId string from buffer object or other formats
   */
  private extractObjectIdString(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      // If it's already a string, validate it's a valid ObjectId format
      if (Types.ObjectId.isValid(value)) {
        return value;
      }
      return value; // Return as-is even if not valid ObjectId format
    }

    // Handle buffer objects (from .lean())
    if (value && typeof value === 'object' && 'buffer' in value) {
      try {
        const buffer = (value as any).buffer;

        // Case 1: Direct Buffer instance
        if (Buffer.isBuffer(buffer)) {
          return new Types.ObjectId(buffer).toString();
        }

        // Case 2: Nested buffer object like { buffer: { 0: 104, 1: 181, ... } }
        if (
          typeof buffer === 'object' &&
          buffer !== null &&
          !Array.isArray(buffer)
        ) {
          // Extract numeric values from the buffer object
          const bufferArray: number[] = [];
          for (let i = 0; i < 12; i++) {
            if (buffer[i] !== undefined) {
              const num = Number(buffer[i]);
              if (!isNaN(num) && num >= 0 && num <= 255) {
                bufferArray.push(num);
              }
            }
          }

          // If we have 12 bytes, create ObjectId
          if (bufferArray.length === 12) {
            return new Types.ObjectId(Buffer.from(bufferArray)).toString();
          }

          // Try alternative: get all numeric values in order
          const allValues = Object.keys(buffer)
            .map((k) => Number(k))
            .filter((k) => !isNaN(k))
            .sort((a, b) => a - b)
            .map((k) => Number(buffer[k]))
            .filter((v) => !isNaN(v) && v >= 0 && v <= 255);

          if (allValues.length === 12) {
            return new Types.ObjectId(Buffer.from(allValues)).toString();
          }
        }
      } catch (error) {
        // Fall through to other methods
      }
    }

    // Try to validate and convert if it's a valid ObjectId format
    if (Types.ObjectId.isValid(value)) {
      try {
        return new Types.ObjectId(value).toString();
      } catch {
        // Fall through
      }
    }

    // Last resort: try toString if available
    if (typeof (value as any).toString === 'function') {
      const str = (value as any).toString();
      if (str !== '[object Object]' && Types.ObjectId.isValid(str)) {
        return str;
      }
    }

    // Final fallback
    return null;
  }

  /**
   * Normalize ObjectIds to strings recursively
   */
  private normalizeObjectIds(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeObjectIds(item));
    }
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;

    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle _id, ad, and all *Id fields (all are ObjectId fields)
      if (
        key === '_id' ||
        key === 'ad' ||
        key.endsWith('Id') ||
        key.endsWith('_id')
      ) {
        if (value === null || value === undefined) {
          normalized[key] = value;
        } else if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          // Check if it's a buffer object (from .lean())
          if ('buffer' in value) {
            try {
              const buffer = (value as any).buffer;
              if (Buffer.isBuffer(buffer)) {
                const objectId = new Types.ObjectId(buffer);
                normalized[key] = objectId.toString();
              } else if (typeof buffer === 'object' && buffer !== null) {
                // Handle nested buffer object like { buffer: { 0: 105, 1: 28, ... } }
                const bufferArray = Object.values(
                  buffer as Record<number, number>,
                )
                  .map((v) => Number(v))
                  .filter((v) => !isNaN(v));
                if (bufferArray.length === 12) {
                  // ObjectId is 12 bytes
                  const objectId = new Types.ObjectId(Buffer.from(bufferArray));
                  normalized[key] = objectId.toString();
                } else {
                  // Try to convert anyway or fallback to string
                  try {
                    const objectId = new Types.ObjectId(
                      Buffer.from(bufferArray),
                    );
                    normalized[key] = objectId.toString();
                  } catch {
                    normalized[key] = String(value);
                  }
                }
              } else {
                normalized[key] = String(value);
              }
            } catch {
              normalized[key] = String(value);
            }
          } else {
            // It's an object but not a buffer - might be an ObjectId instance or plain object
            // Try to convert it
            try {
              if (Types.ObjectId.isValid(value as any)) {
                const objectId = new Types.ObjectId(value as any);
                normalized[key] = objectId.toString();
              } else {
                normalized[key] = String(value);
              }
            } catch {
              normalized[key] = String(value);
            }
          }
        } else if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
          // Already a valid ObjectId string
          normalized[key] = value;
        } else if (typeof value === 'string') {
          // Regular string
          normalized[key] = value;
        } else if (
          (typeof value === 'string' || typeof value === 'number') &&
          Types.ObjectId.isValid(value)
        ) {
          try {
            const objectId = new Types.ObjectId(value);
            normalized[key] = objectId.toString();
          } catch {
            normalized[key] = String(value);
          }
        } else if (typeof (value as any).toString === 'function') {
          const str = (value as any).toString();
          normalized[key] = str === '[object Object]' ? String(value) : str;
        } else {
          normalized[key] = String(value);
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        normalized[key] = this.normalizeObjectIds(value);
      } else if (Array.isArray(value)) {
        normalized[key] = value.map((item) => this.normalizeObjectIds(item));
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  /**
   * Map ad to response DTO using pre-fetched inventory data
   */
  private mapToDetailedResponseDtoWithInventory(
    ad: any,
    manufacturers: Record<string, any>,
    models: Record<string, any>,
    variants: Record<string, any>,
    fuelTypes: Record<string, any>,
    transmissionTypes: Record<string, any>,
  ): DetailedAdResponseDto {
    // Process vehicle details with inventory information
    const vehicleDetails = ad.vehicleDetails;
    let processedVehicleDetails = vehicleDetails;

    if (vehicleDetails) {
      // First normalize all ObjectIds in vehicleDetails (including manufacturerId, modelId, etc.)
      const normalizedVehicleDetails = this.normalizeObjectIds(vehicleDetails);

      // Extract normalized IDs for lookup - ensure they are strings
      // Use extractObjectIdString to handle buffer objects directly
      const manufacturerIdStr = vehicleDetails.manufacturerId
        ? this.extractObjectIdString(vehicleDetails.manufacturerId)
        : null;
      const modelIdStr = vehicleDetails.modelId
        ? this.extractObjectIdString(vehicleDetails.modelId)
        : null;
      const variantIdStr = vehicleDetails.variantId
        ? this.extractObjectIdString(vehicleDetails.variantId)
        : null;
      const fuelTypeIdStr = vehicleDetails.fuelTypeId
        ? this.extractObjectIdString(vehicleDetails.fuelTypeId)
        : null;
      const transmissionTypeIdStr = vehicleDetails.transmissionTypeId
        ? this.extractObjectIdString(vehicleDetails.transmissionTypeId)
        : null;

      const manufacturer = manufacturerIdStr
        ? manufacturers[manufacturerIdStr] || {
            _id: manufacturerIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const model = modelIdStr
        ? models[modelIdStr] || {
            _id: modelIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const variant = variantIdStr
        ? variants[variantIdStr] || {
            _id: variantIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const fuelType = fuelTypeIdStr
        ? fuelTypes[fuelTypeIdStr] || {
            _id: fuelTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const transmissionType = transmissionTypeIdStr
        ? transmissionTypes[transmissionTypeIdStr] || {
            _id: transmissionTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;

      processedVehicleDetails = {
        ...normalizedVehicleDetails,
        manufacturerId: manufacturerIdStr || null,
        modelId: modelIdStr || null,
        variantId: variantIdStr || null,
        fuelTypeId: fuelTypeIdStr || null,
        transmissionTypeId: transmissionTypeIdStr || null,
        manufacturer: manufacturer || null,
        model: model || null,
        variant: variant || null,
        fuelType: fuelType || null,
        transmissionType: transmissionType || null,
      };
    }

    // Process commercial vehicle details with inventory information
    const commercialVehicleDetails = ad.commercialVehicleDetails;
    let processedCommercialVehicleDetails = commercialVehicleDetails;

    if (commercialVehicleDetails) {
      // First normalize all ObjectIds in commercialVehicleDetails
      const normalizedCommercialVehicleDetails = this.normalizeObjectIds(
        commercialVehicleDetails,
      );

      // Extract normalized IDs for lookup - ensure they are strings
      // Use extractObjectIdString to handle buffer objects directly
      const manufacturerIdStr = commercialVehicleDetails.manufacturerId
        ? this.extractObjectIdString(commercialVehicleDetails.manufacturerId)
        : null;
      const modelIdStr = commercialVehicleDetails.modelId
        ? this.extractObjectIdString(commercialVehicleDetails.modelId)
        : null;
      const variantIdStr = commercialVehicleDetails.variantId
        ? this.extractObjectIdString(commercialVehicleDetails.variantId)
        : null;
      const fuelTypeIdStr = commercialVehicleDetails.fuelTypeId
        ? this.extractObjectIdString(commercialVehicleDetails.fuelTypeId)
        : null;
      const transmissionTypeIdStr = commercialVehicleDetails.transmissionTypeId
        ? this.extractObjectIdString(
            commercialVehicleDetails.transmissionTypeId,
          )
        : null;

      const manufacturer = manufacturerIdStr
        ? manufacturers[manufacturerIdStr] || {
            _id: manufacturerIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const model = modelIdStr
        ? models[modelIdStr] || {
            _id: modelIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const variant = variantIdStr
        ? variants[variantIdStr] || {
            _id: variantIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const fuelType = fuelTypeIdStr
        ? fuelTypes[fuelTypeIdStr] || {
            _id: fuelTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const transmissionType = transmissionTypeIdStr
        ? transmissionTypes[transmissionTypeIdStr] || {
            _id: transmissionTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;

      processedCommercialVehicleDetails = {
        ...normalizedCommercialVehicleDetails,
        manufacturerId: manufacturerIdStr || null,
        modelId: modelIdStr || null,
        variantId: variantIdStr || null,
        fuelTypeId: fuelTypeIdStr || null,
        transmissionTypeId: transmissionTypeIdStr || null,
        manufacturer: manufacturer || null,
        model: model || null,
        variant: variant || null,
        fuelType: fuelType || null,
        transmissionType: transmissionType || null,
      };
    }

    // Normalize propertyDetails - ensure all fields are present and match expected format
    let propertyDetails = ad.propertyDetails;
    if (propertyDetails) {
      propertyDetails = this.normalizeObjectIds(propertyDetails);
      // Build propertyDetails with all fields from the database
      // Include optional fields only if they exist (bedrooms, bathrooms, floor may not exist for plot types)
      const normalizedPropertyDetails: any = {
        _id: propertyDetails._id || null,
        ad: propertyDetails.ad || null,
        propertyType: propertyDetails.propertyType || null,
        listingType: propertyDetails.listingType || null,
        areaSqft: propertyDetails.areaSqft ?? null,
        isFurnished: propertyDetails.isFurnished ?? false,
        hasParking: propertyDetails.hasParking ?? false,
        hasGarden: propertyDetails.hasGarden ?? false,
        amenities: Array.isArray(propertyDetails.amenities)
          ? propertyDetails.amenities
          : [],
        createdAt: propertyDetails.createdAt || null,
        updatedAt: propertyDetails.updatedAt || null,
        __v: propertyDetails.__v ?? 0,
      };

      // Include optional fields only if they exist in the data
      if (
        propertyDetails.bedrooms !== undefined &&
        propertyDetails.bedrooms !== null
      ) {
        normalizedPropertyDetails.bedrooms = propertyDetails.bedrooms;
      }
      if (
        propertyDetails.bathrooms !== undefined &&
        propertyDetails.bathrooms !== null
      ) {
        normalizedPropertyDetails.bathrooms = propertyDetails.bathrooms;
      }
      if (
        propertyDetails.floor !== undefined &&
        propertyDetails.floor !== null
      ) {
        normalizedPropertyDetails.floor = propertyDetails.floor;
      }

      propertyDetails = normalizedPropertyDetails;
    }

    // For property ads, vehicleDetails and commercialVehicleDetails should be undefined
    const finalVehicleDetails =
      ad.category === 'property' ? undefined : processedVehicleDetails;
    const finalCommercialVehicleDetails =
      ad.category === 'property'
        ? undefined
        : processedCommercialVehicleDetails;

    return {
      id: ad._id?.toString() || String(ad._id),
      title: ad.title,
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      latitude:
        ad.latitude !== null && ad.latitude !== undefined
          ? Number(ad.latitude)
          : (null as any),
      longitude:
        ad.longitude !== null && ad.longitude !== undefined
          ? Number(ad.longitude)
          : (null as any),
      distance:
        ad.distance !== null && ad.distance !== undefined
          ? Number(ad.distance)
          : (null as any),
      link: ad.link || '',
      category: ad.category,
      isActive: ad.isActive,
      soldOut: ad.soldOut || false,
      isApproved: ad.isApproved || false,
      approvedBy: ad.approvedBy ? ad.approvedBy.toString() : null,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy?.toString() || String(ad.postedBy),
      user: ad.user
        ? {
            id: ad.user._id?.toString() || String(ad.user._id),
            name: ad.user.name,
            email: ad.user.email,
            countryCode: ad.user.countryCode,
            phoneNumber: ad.user.phoneNumber,
            profilePic: ad.user.profilePic || 'default-profile-pic-url',
          }
        : undefined,
      propertyDetails: propertyDetails || undefined,
      vehicleDetails: finalVehicleDetails,
      commercialVehicleDetails: finalCommercialVehicleDetails,
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
