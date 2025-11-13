import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Ad, AdDocument, AdCategory } from '../schemas/ad.schema';
import { PropertyAd, PropertyAdDocument, PropertyTypeEnum } from '../schemas/property-ad.schema';
import { VehicleAd, VehicleAdDocument } from '../schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdDocument,
} from '../schemas/commercial-vehicle-ad.schema';
import {
  Favorite,
  FavoriteDocument,
} from '../../favorites/schemas/schema.favorite';
import {
  ChatRoom,
  ChatRoomDocument,
} from '../../chat/schemas/chat-room.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../../chat/schemas/chat-message.schema';

import { FilterAdDto } from '../dto/common/filter-ad.dto';
import {
  AdResponseDto,
  DetailedAdResponseDto,
  PaginatedDetailedAdResponseDto,
} from '../dto/common/ad-response.dto';

import { CreateAdDto } from '../dto/common/create-ad.dto';

import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { RedisService } from '../../shared/redis.service';
import { CommercialVehicleDetectionService } from './commercial-vehicle-detection.service';
import { GeocodingService } from '../../common/services/geocoding.service';
import { LocationHierarchyService } from '../../common/services/location-hierarchy.service';
import { UserType } from '../../users/enums/user.types';

@Injectable()
export class AdsService {
  private static readonly CACHE_PREFIX = 'ads:';
  private static readonly TTL = {
    LIST: 120, // list queries
    BY_ID: 900, // detailed ad cache
  } as const;
  constructor(
    @InjectModel(Ad.name)
    private readonly adModel: Model<AdDocument>,
    @InjectModel(PropertyAd.name)
    private readonly propertyAdModel: Model<PropertyAdDocument>,
    @InjectModel(VehicleAd.name)
    private readonly vehicleAdModel: Model<VehicleAdDocument>,
    @InjectModel(CommercialVehicleAd.name)
    private readonly commercialVehicleAdModel: Model<CommercialVehicleAdDocument>,
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    private readonly vehicleInventoryService: VehicleInventoryService,
    private readonly redisService: RedisService,
    private readonly commercialVehicleDetectionService: CommercialVehicleDetectionService,
    private readonly geocodingService: GeocodingService,
    private readonly locationHierarchyService: LocationHierarchyService,
  ) {}

  /** ---------- HELPERS ---------- */
  private isValidId(id?: string) {
    return !!id && Types.ObjectId.isValid(id);
  }

  private toObjectId(id?: string) {
    return this.isValidId(id) ? new Types.ObjectId(id) : undefined;
  }

  private toObjectIdArray(ids?: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return undefined;
    const arr = ids
      .map((x) => this.toObjectId(x))
      .filter(Boolean) as Types.ObjectId[];
    return arr.length ? arr : undefined;
  }

  private nonEmpty<T extends object>(obj: T | undefined | null): T | undefined {
    return obj && Object.keys(obj).length > 0 ? obj : undefined;
  }

  private normalize(obj: any): any {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.normalize(v));
    if (typeof obj === 'object') {
      const entries = Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, this.normalize(v)]);
      return Object.fromEntries(entries);
    }
    return obj;
  }

  private clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  private coerceSort(
    sortBy?: string,
    sortOrder?: string,
  ): { field: string; dir: 1 | -1 } {
    const allowed: Record<string, 1> = {
      createdAt: 1,
      updatedAt: 1,
      price: 1,
      title: 1,
      category: 1,
    };
    const field = sortBy && allowed[sortBy] ? sortBy : 'createdAt';
    const dir = sortOrder === 'ASC' ? 1 : -1;
    return { field, dir };
  }

  private key(parts: Record<string, unknown>): string {
    const norm = Object.keys(parts)
      .filter(
        (k) => parts[k] !== undefined && parts[k] !== null && parts[k] !== '',
      )
      .sort()
      .map((k) => `${k}=${JSON.stringify(parts[k])}`)
      .join('&');
    return `${AdsService.CACHE_PREFIX}${norm}`;
  }

  /** ---------- FIND ALL (robust lookups + neutral defaults, all filters, all lists, all categories) ---------- */
  async findAll(filters: FilterAdDto): Promise<PaginatedDetailedAdResponseDto> {
    // Build deterministic cache key
    const normalize = (obj: any): any => {
      if (obj == null) return obj;
      if (Array.isArray(obj)) return obj.map(normalize);
      if (typeof obj === 'object') {
        const entries = Object.entries(obj)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, normalize(v)]);
        return Object.fromEntries(entries);
      }
      return obj;
    };

    const safeFilters = this.normalize(filters);
    const cacheKey = this.key({ scope: 'findAll', ...safeFilters });

    // Try cache first
    const cached =
      await this.redisService.cacheGet<PaginatedDetailedAdResponseDto>(
        cacheKey,
      );
    if (cached) return cached;

    let {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      latitude,
      longitude,
    } = filters;
    const { field: sortField, dir: sortDirection } = this.coerceSort(
      sortBy,
      sortOrder,
    );
    page = this.clamp(Number(page) || 1, 1, 1e9);
    limit = this.clamp(Number(limit) || 20, 1, 100);

    // ------- Pipeline -------
    const pipeline: any[] = [];

    // Enhanced search: will be applied after lookups to include manufacturer, model, variant names
    // Store search term for later use
    const searchTerm = search && `${search}`.trim() ? `${search}`.trim() : null;

    // Base visibility: show only approved ads (except soft-deleted)
    pipeline.push({ $match: { isDeleted: { $ne: true }, isApproved: true } });

    // Optional category filter
    if (filters.category) {
      pipeline.push({ $match: { category: filters.category } });
    }

    // Hierarchical location-based filtering
    if (latitude !== undefined && longitude !== undefined) {
      // Get location hierarchy pipeline stages
      const locationPipeline =
        this.locationHierarchyService.getLocationAggregationPipeline(
          latitude,
          longitude,
        );

      // Add location filtering stages to pipeline
      pipeline.push(...locationPipeline);

      // Add location scoring for prioritization
      pipeline.push(
        this.locationHierarchyService.getLocationScoringStage(
          latitude,
          longitude,
        ),
      );
    }

    // user
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    );

    // manufacturer lookup for premium filtering
    pipeline.push(
      {
        $lookup: {
          from: 'manufacturers',
          localField: 'vehicleDetails.manufacturerId',
          foreignField: '_id',
          as: 'manufacturerInfo',
        },
      },
      {
        $lookup: {
          from: 'manufacturers',
          localField: 'commercialVehicleDetails.manufacturerId',
          foreignField: '_id',
          as: 'commercialManufacturerInfo',
        },
      },
    );

    // ---- Robust subdoc lookups (join by both 'ad' and 'adId' then merge) ----
    // Property
    pipeline.push(
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: '_propA',
        },
      },
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'adId',
          as: '_propB',
        },
      },
      {
        $addFields: { propertyDetails: { $setUnion: ['$_propA', '$_propB'] } },
      },
      { $project: { _propA: 0, _propB: 0 } },
    );

    // Vehicle
    pipeline.push(
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: '_vehA',
        },
      },
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'adId',
          as: '_vehB',
        },
      },
      { $addFields: { vehicleDetails: { $setUnion: ['$_vehA', '$_vehB'] } } },
      { $project: { _vehA: 0, _vehB: 0 } },
    );

    // Commercial vehicle
    pipeline.push(
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: '_cvehA',
        },
      },
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'adId',
          as: '_cvehB',
        },
      },
      {
        $addFields: {
          commercialVehicleDetails: { $setUnion: ['$_cvehA', '$_cvehB'] },
        },
      },
      { $project: { _cvehA: 0, _cvehB: 0 } },
    );

    // Optional vehicle filters (applies to vehicle subdocs only)
    const vehMatch: any = {};
    if (filters.vehicleType) vehMatch.vehicleType = filters.vehicleType;
    if (filters.manufacturerId) {
      const ids = Array.isArray(filters.manufacturerId)
        ? filters.manufacturerId
        : [filters.manufacturerId];
      const objIds = ids
        .map((id) => {
          try {
            return new Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (objIds.length) vehMatch.manufacturerId = { $in: objIds };
    }
    if (filters.modelId) {
      const ids = Array.isArray(filters.modelId)
        ? filters.modelId
        : [filters.modelId];
      const objIds = ids
        .map((id) => {
          try {
            return new Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (objIds.length) vehMatch.modelId = { $in: objIds };
    }
    if (filters.variantId) {
      const ids = Array.isArray(filters.variantId)
        ? filters.variantId
        : [filters.variantId];
      const objIds = ids
        .map((id) => {
          try {
            return new Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (objIds.length) vehMatch.variantId = { $in: objIds };
    }
    if (filters.transmissionTypeId) {
      const ids = Array.isArray(filters.transmissionTypeId)
        ? filters.transmissionTypeId
        : [filters.transmissionTypeId];
      const objIds = ids
        .map((id) => {
          try {
            return new Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (objIds.length) vehMatch.transmissionTypeId = { $in: objIds };
    }
    if (filters.fuelTypeId) {
      const ids = Array.isArray(filters.fuelTypeId)
        ? filters.fuelTypeId
        : [filters.fuelTypeId];
      const objIds = ids
        .map((id) => {
          try {
            return new Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (objIds.length) vehMatch.fuelTypeId = { $in: objIds };
    }
    if (filters.color)
      vehMatch.color = { $regex: filters.color, $options: 'i' };
    if (filters.maxMileage != null)
      vehMatch.mileage = { $lte: filters.maxMileage };
    if (filters.isFirstOwner != null)
      vehMatch.isFirstOwner = filters.isFirstOwner;
    if (filters.hasInsurance != null)
      vehMatch.hasInsurance = filters.hasInsurance;
    if (filters.hasRcBook != null) vehMatch.hasRcBook = filters.hasRcBook;
    if (filters.minYear != null || filters.maxYear != null) {
      vehMatch.year = {};
      if (filters.minYear != null) vehMatch.year.$gte = Number(filters.minYear);
      if (filters.maxYear != null) vehMatch.year.$lte = Number(filters.maxYear);
    }
    if (Object.keys(vehMatch).length) {
      pipeline.push({ $match: { vehicleDetails: { $elemMatch: vehMatch } } });
    }

    // Premium manufacturer filtering
    if (filters.isPremiumManufacturer !== undefined) {
      pipeline.push({
        $match: {
          $or: [
            // For vehicle ads
            {
              $and: [
                { vehicleDetails: { $exists: true, $ne: [] } },
                {
                  'manufacturerInfo.isPremium': filters.isPremiumManufacturer,
                },
              ],
            },
            // For commercial vehicle ads
            {
              $and: [
                { commercialVehicleDetails: { $exists: true, $ne: [] } },
                {
                  'commercialManufacturerInfo.isPremium':
                    filters.isPremiumManufacturer,
                },
              ],
            },
          ],
        },
      });
    }

    // ----- Sorting -----
    if (latitude !== undefined && longitude !== undefined) {
      // Prioritize by location score first, then by requested sort field
      pipeline.push({
        $sort: {
          locationScore: -1, // Higher location score first (district > state > country)
          [sortField]: sortDirection,
        },
      });
    } else {
      // Regular sorting when no location filtering
      pipeline.push({ $sort: { [sortField]: sortDirection } });
    }

    // Clean up manufacturer lookup arrays from output
    pipeline.push({
      $project: {
        manufacturerInfo: 0,
        commercialManufacturerInfo: 0,
        locationScore: 1, // Include location score for sorting
      },
    });

    // ----- Pagination-only response (no filters) -----
    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    });

    const result = await this.adModel
      .aggregate(pipeline)
      .collation({ locale: 'en', strength: 2 });
    const data = result?.[0]?.data ?? [];
    const total = result?.[0]?.total?.[0]?.count ?? 0;

    const dtoData = data.map((ad: any) => {
      const dto = this.mapToResponseDto(ad);
      dto.year =
        ad.vehicleDetails?.[0]?.year ??
        ad.commercialVehicleDetails?.[0]?.year ??
        null;
      return dto;
    });

    const response: PaginatedDetailedAdResponseDto = {
      data: dtoData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    // Cache list
    await this.redisService.cacheSet(cacheKey, response, AdsService.TTL.LIST);
    return response;
  }

  /** ---------- GET USER ADS ---------- */
  async getUserAds(
    userId: string,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      soldOut?: boolean;
    } = {},
  ): Promise<PaginatedDetailedAdResponseDto> {
    if (!this.isValidId(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }

    // Build deterministic cache key
    const safeFilters = this.normalize({ ...filters, userId });
    const cacheKey = this.key({ scope: 'getUserAds', ...safeFilters });

    // Try cache first
    const cached =
      await this.redisService.cacheGet<PaginatedDetailedAdResponseDto>(
        cacheKey,
      );
    if (cached) return cached;

    let {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      soldOut,
    } = filters;
    page = this.clamp(Number(page) || 1, 1, 1e9);
    limit = this.clamp(Number(limit) || 20, 1, 100);

    // ------- Pipeline -------
    const pipeline: any[] = [];

    // Match user's ads only (including approved status)
    const matchStage: any = {
      postedBy: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
      isApproved: true,
    };

    // // Add soldOut filter - default to false (exclude sold-out ads) unless explicitly requested
    // if (soldOut !== undefined) {
    //   matchStage.soldOut = soldOut;
    // } else {
    //   matchStage.soldOut = false; // Default: exclude sold-out ads
    // }

    pipeline.push({ $match: matchStage });

    // User lookup
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    );

    // Note: Manufacturer, model, fuel type, and transmission lookups removed
    // These will be fetched individually using VehicleInventoryService in the mapping function

    // ---- Robust subdoc lookups (join by both 'ad' and 'adId' then merge) ----
    // Property
    pipeline.push(
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      },
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'adId',
          as: 'propertyDetailsAlt',
        },
      },
      {
        $addFields: {
          propertyDetails: {
            $cond: {
              if: { $gt: [{ $size: '$propertyDetails' }, 0] },
              then: '$propertyDetails',
              else: '$propertyDetailsAlt',
            },
          },
        },
      },
      {
        $unwind: { path: '$propertyDetails', preserveNullAndEmptyArrays: true },
      },
    );

    // Vehicle
    pipeline.push(
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      },
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'adId',
          as: 'vehicleDetailsAlt',
        },
      },
      {
        $addFields: {
          vehicleDetails: {
            $cond: {
              if: { $gt: [{ $size: '$vehicleDetails' }, 0] },
              then: '$vehicleDetails',
              else: '$vehicleDetailsAlt',
            },
          },
        },
      },
      {
        $unwind: { path: '$vehicleDetails', preserveNullAndEmptyArrays: true },
      },
    );

    // Commercial Vehicle
    pipeline.push(
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails',
        },
      },
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'adId',
          as: 'commercialVehicleDetailsAlt',
        },
      },
      {
        $addFields: {
          commercialVehicleDetails: {
            $cond: {
              if: { $gt: [{ $size: '$commercialVehicleDetails' }, 0] },
              then: '$commercialVehicleDetails',
              else: '$commercialVehicleDetailsAlt',
            },
          },
        },
      },
      {
        $unwind: {
          path: '$commercialVehicleDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    // ----- Basic Search functionality -----
    if (search && search.trim()) {
      const searchTerm = search.trim();
      pipeline.push({
        $match: {
          $or: [
            // Search in ad description
            { description: { $regex: searchTerm, $options: 'i' } },
            // Search in location
            { location: { $regex: searchTerm, $options: 'i' } },
            // Search in price (convert to string for partial matching)
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$price' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            // Search in vehicle details
            { 'vehicleDetails.color': { $regex: searchTerm, $options: 'i' } },
            {
              'commercialVehicleDetails.color': {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            // Search in year (convert to string for partial matching)
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$vehicleDetails.year' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$commercialVehicleDetails.year' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            // Search in mileage (convert to string for partial matching)
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$vehicleDetails.mileage' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$commercialVehicleDetails.mileage' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            // Search in additional features
            {
              'vehicleDetails.additionalFeatures': {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            {
              'commercialVehicleDetails.additionalFeatures': {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            // Search in property details
            {
              'propertyDetails.propertyType': {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            // Search in commercial vehicle details
            {
              'commercialVehicleDetails.commercialVehicleType': {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            {
              'commercialVehicleDetails.bodyType': {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            // Search in payload capacity (convert to string for partial matching)
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $toString: '$commercialVehicleDetails.payloadCapacity',
                  },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            // Search in axle count (convert to string for partial matching)
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$commercialVehicleDetails.axleCount' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
            // Search in seating capacity (convert to string for partial matching)
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $toString: '$commercialVehicleDetails.seatingCapacity',
                  },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
          ],
        },
      });
    }

    // ----- Sorting -----
    const { field: sortField, dir: sortDirection } = this.coerceSort(
      sortBy,
      sortOrder,
    );
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Note: Manufacturer, model, fuel type, and transmission names will be added
    // in the mapping function using VehicleInventoryService (v2 approach)

    // ----- Pagination -----
    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    });

    const result = await this.adModel
      .aggregate(pipeline)
      .collation({ locale: 'en', strength: 2 });
    const data = result?.[0]?.data ?? [];
    const total = result?.[0]?.total?.[0]?.count ?? 0;

    // Map ads to DTOs with inventory details (v2 approach)
    const dtoData = await Promise.all(
      data.map(async (ad: any) => {
        const dto = await this.mapToResponseDtoWithInventory(ad);
        dto.year =
          ad.vehicleDetails?.[0]?.year ??
          ad.commercialVehicleDetails?.[0]?.year ??
          null;
        return dto;
      }),
    );

    const response: PaginatedDetailedAdResponseDto = {
      data: dtoData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    // Cache user ads list
    await this.redisService.cacheSet(cacheKey, response, AdsService.TTL.LIST);
    return response;
  }

  /** ---------- CHECK IF AD EXISTS ---------- */
  async exists(id: string): Promise<boolean> {
    if (!this.isValidId(id)) {
      return false;
    }
    const count = await this.adModel.countDocuments({
      _id: new Types.ObjectId(id),
      isDeleted: { $ne: true },
    });
    return count > 0;
  }

  /** ---------- FIND ONE ---------- */
  async findOne(id: string): Promise<DetailedAdResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException(`Invalid ad ID: ${id}`);
    }
    const pipeline = [
      { $match: { _id: new Types.ObjectId(id), isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Add approvedBy user lookup
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approvedByUser',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      {
        $unwind: { path: '$approvedByUser', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      },
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails',
        },
      },
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      },
    ];

    const results = await this.adModel.aggregate(pipeline);
    if (results.length === 0) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    const ad = results[0];
    const dto = this.mapToResponseDto(ad);
    dto.year =
      ad.vehicleDetails?.[0]?.year ??
      ad.commercialVehicleDetails?.[0]?.year ??
      null;

    return dto;
  }

  /** ---------- FIND BY IDS (with cache) ---------- */
  async findByIds(ids: string[]): Promise<AdResponseDto[]> {
    if (!ids || ids.length === 0) return [];

    const validIds = ids.filter((x) => this.isValidId(x));
    if (validIds.length === 0) return [];

    const cacheKeys = validIds.map(
      (id) => `${AdsService.CACHE_PREFIX}getById:${id}:anonymous`,
    );
    const cachedResults = await Promise.all(
      cacheKeys.map((key) =>
        this.redisService.cacheGet<DetailedAdResponseDto>(key),
      ),
    );

    const uncachedIds = validIds.filter((_, i) => !cachedResults[i]);
    const cachedAds = cachedResults.filter(Boolean) as DetailedAdResponseDto[];

    if (uncachedIds.length === 0) {
      return cachedAds.map((ad) => this.mapToResponseDto(ad));
    }

    const objectIds = uncachedIds.map((x) => new Types.ObjectId(x));
    const uncachedAds = await this.adModel
      .find({ _id: { $in: objectIds }, isDeleted: { $ne: true } })
      .populate('postedBy', 'name email phone')
      .exec();

    const adsToCache = uncachedAds.map((ad) => ({
      key: `${AdsService.CACHE_PREFIX}getById:${ad._id}:anonymous`,
      data: this.mapToResponseDto(ad),
      ttl: AdsService.TTL.BY_ID,
    }));
    await Promise.all(
      adsToCache.map(({ key, data, ttl }) =>
        this.redisService.cacheSet(key, data, ttl),
      ),
    );

    return [
      ...cachedAds.map((ad) => this.mapToResponseDto(ad)),
      ...uncachedAds.map((ad) => this.mapToResponseDto(ad)),
    ];
  }

  /** ---------- GET BY ID (detailed + cache) ---------- */
  async getAdById(id: string, userId?: string): Promise<DetailedAdResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException(`Invalid ad ID: ${id}`);
    }
    const cacheKey = `${AdsService.CACHE_PREFIX}getById:${id}:${userId || 'anonymous'}`;
    const cached =
      await this.redisService.cacheGet<DetailedAdResponseDto>(cacheKey);
    if (cached) return cached;

    // Enhanced pipeline with comprehensive lookups
    const pipeline = [
      { $match: { _id: new Types.ObjectId(id), isDeleted: { $ne: true } } },

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

    const results = await this.adModel.aggregate(pipeline);
    if (results.length === 0) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    const ad = results[0];

    // Increment view count
    await this.adModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $inc: { viewCount: 1 } },
    );

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
      itemId: new Types.ObjectId(id),
    });
    detailed.favoritesCount = favoritesCount;

    // Check if current user has favorited this ad
    if (userId) {
      const userFavorite = await this.favoriteModel.findOne({
        userId: new Types.ObjectId(userId),
        itemId: new Types.ObjectId(id),
      });
      detailed.isFavorited = !!userFavorite;
    }

    // Get chat relations
    await this.populateChatRelations(detailed, userId);

    // Get ratings and reviews (if rating system exists for ads)
    const ratings = await this.getAdRatings(id);
    if (ratings) {
      detailed.averageRating = ratings.averageRating;
      detailed.ratingsCount = ratings.ratingsCount;
      detailed.reviews = ratings.reviews;
    }

    // Add view count to response
    detailed.viewCount = (ad.viewCount || 0) + 1;

    await this.redisService.cacheSet(cacheKey, detailed, AdsService.TTL.BY_ID);
    return detailed;
  }

  /** ---------- CREATE (unified) ---------- */
  async createAd(
    createDto: CreateAdDto,
    userId: string,
  ): Promise<DetailedAdResponseDto> {
    // Auto-detect commercial vehicle intent
    if (createDto.data?.modelId) {
      const commercialDefaults =
        await this.commercialVehicleDetectionService.detectCommercialVehicleDefaults(
          createDto.data.modelId,
        );
      if (commercialDefaults.isCommercialVehicle && !createDto.category) {
        createDto.category = AdCategory.COMMERCIAL_VEHICLE;
      }
      if (commercialDefaults.isCommercialVehicle) {
        createDto.data = {
          ...createDto.data,
          commercialVehicleType:
            createDto.data.commercialVehicleType ??
            commercialDefaults.commercialVehicleType,
          bodyType: createDto.data.bodyType ?? commercialDefaults.bodyType,
          payloadCapacity:
            createDto.data.payloadCapacity ??
            commercialDefaults.payloadCapacity,
          payloadUnit:
            createDto.data.payloadUnit ?? commercialDefaults.payloadUnit,
          axleCount: createDto.data.axleCount ?? commercialDefaults.axleCount,
          seatingCapacity:
            createDto.data.seatingCapacity ??
            commercialDefaults.seatingCapacity,
        };
      }
    }

    // Auto-generate location from coordinates if not provided
    if (
      !createDto.data.location &&
      createDto.data.latitude &&
      createDto.data.longitude
    ) {
      try {
        const geocodingResult = await this.geocodingService.reverseGeocode(
          createDto.data.latitude,
          createDto.data.longitude,
        );
        createDto.data.location = geocodingResult.location;
      } catch (error) {
        // If geocoding fails, use coordinates as fallback
        createDto.data.location = `${createDto.data.latitude.toFixed(4)}, ${createDto.data.longitude.toFixed(4)}`;
      }
    }

    this.validateRequiredFields(createDto);

    let result: AdResponseDto;
    switch (createDto.category) {
      case AdCategory.PROPERTY:
        result = await this.createPropertyAdFromUnified(createDto.data, userId);
        break;
      case AdCategory.PRIVATE_VEHICLE:
        result = await this.createVehicleAdFromUnified(createDto.data, userId);
        break;
      case AdCategory.COMMERCIAL_VEHICLE:
        result = await this.createCommercialVehicleAdFromUnified(
          createDto.data,
          userId,
        );
        break;
      case AdCategory.TWO_WHEELER:
        result = await this.createTwoWheelerAdFromUnified(
          createDto.data,
          userId,
        );
        break;
      default:
        throw new BadRequestException(
          `Invalid ad category: ${createDto.category}`,
        );
    }

    await this.invalidateAdCache(undefined, userId);
    return result;
  }

  private validateRequiredFields(createDto: CreateAdDto): void {
    const { category, data } = createDto;

    if (!data?.description || data.price == null) {
      throw new BadRequestException(
        'Description and price are required for all ad types',
      );
    }

    // Location is required - either provided directly or generated from coordinates
    if (!data.location && (!data.latitude || !data.longitude)) {
      throw new BadRequestException(
        'Either location or both latitude and longitude are required',
      );
    }

    switch (category) {
      case AdCategory.PROPERTY:
        if(!data.propertyType) {
          throw new BadRequestException('propertyType is required');
        }

        if (!data.price) {
          throw new BadRequestException('price is required');
        }

        if (!data.location) {
            throw new BadRequestException('location is required');
        }

        if (data.areaSqft == null) {
            throw new BadRequestException('areaSqft is required');
         }
        if (!data.description) {
            throw new BadRequestException('description is required');
        } 
        if(data.propertyType === PropertyTypeEnum.APARTMENT ||data.propertyType === PropertyTypeEnum.HOUSE ||
          data.propertyType === PropertyTypeEnum.VILLA){
            if(data.bedrooms==null)
            {
              throw new BadRequestException('bedrooms is required for Apartment, House, Villa',);
            }
            if (data.bathrooms == null) {
              throw new BadRequestException('bathrooms is required for Apartment, House, Villa',);
            }
          }

        const nonResidentialTypes = ['plot', 'commercial', 'office', 'shop', 'warehouse'];
        if (nonResidentialTypes.includes(data.propertyType)) {
          if (data.bedrooms != null) throw new BadRequestException('bedrooms should not exist for Plot, Commercial, Office, Shop, Warehouse');
           if (data.bathrooms != null) throw new BadRequestException('bathrooms should not exist for Plot, Commercial, Office, Shop, Warehouse');  
        }
        break;

      case AdCategory.PRIVATE_VEHICLE:
      case AdCategory.TWO_WHEELER:
        if (
          !data.vehicleType ||
          !data.manufacturerId ||
          !data.modelId ||
          data.year == null ||
          data.mileage == null ||
          !data.transmissionTypeId ||
          !data.fuelTypeId ||
          !data.color
        ) {
          throw new BadRequestException(
            'Vehicle ads require: vehicleType, manufacturerId, modelId, year, mileage, transmissionTypeId, fuelTypeId, and color',
          );
        }
        break;

      case AdCategory.COMMERCIAL_VEHICLE:
        {
          const required = [
            'commercialVehicleType',
            'manufacturerId',
            'modelId',
            'year',
            'Mileage', // keep consistent if your DTO uses mileage (lowercase)
            'transmissionTypeId',
            'fuelTypeId',
            'color',
          ];
          const missing = [
            'commercialVehicleType',
            'manufacturerId',
            'modelId',
            'year',
            'mileage',
            'transmissionTypeId',
            'fuelTypeId',
            'color',
          ].filter((k) => !data[k]);

          if (missing.length > 0) {
            throw new BadRequestException(
              `Commercial vehicle ads require: ${missing.join(', ')}`,
            );
          }

          if (
            !data.commercialVehicleType &&
            !data.bodyType &&
            !data.payloadCapacity
          ) {
            throw new BadRequestException(
              'Commercial vehicle ads require commercial vehicle specific fields. Provide commercialVehicleType, bodyType, and payloadCapacity or ensure the model has metadata.',
            );
          }
        }
        break;
    }
  }

  private async createPropertyAdFromUnified(
    data: any,
    userId: string,
  ): Promise<DetailedAdResponseDto> {
    const ad = new this.adModel({
      title: '',
      description: data.description,
      price: data.price,
      images: data.images ?? [],
      location: data.location,
      link: data.link,
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.PROPERTY,
      soldOut: false, // Always set soldOut to false by default
      isApproved: false, // Always set isApproved to false by default
    });
    const savedAd = await ad.save();

    const propertyAd = new this.propertyAdModel({
      ad: savedAd._id as any,
      propertyType: data.propertyType,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      areaSqft: data.areaSqft,
      floor: data.floor,
      isFurnished: data.isFurnished,
      hasParking: data.hasParking,
      hasGarden: data.hasGarden,
      amenities: data.amenities ?? [],
    });
    await propertyAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  private async createVehicleAdFromUnified(
    data: any,
    userId: string,
  ): Promise<DetailedAdResponseDto> {
    const model = await this.vehicleInventoryService.findVehicleModelById(
      data.modelId,
    );
    const modelName = model
      ? (model as any).displayName || (model as any).name
      : 'Vehicle';
    const year = data.year ?? '';
    const title = `${modelName} ${year}`.trim();

    const ad = new this.adModel({
      title,
      description: data.description,
      price: data.price,
      images: data.images ?? [],
      location: data.location,
      link: data.link,
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.PRIVATE_VEHICLE,
      soldOut: false, // Always set soldOut to false by default
      isApproved: false, // Always set isApproved to false by default
    });
    const savedAd = await ad.save();

    const vehicleAd = new this.vehicleAdModel({
      ad: savedAd._id as Types.ObjectId,
      vehicleType: data.vehicleType,
      manufacturerId: new Types.ObjectId(data.manufacturerId),
      modelId: new Types.ObjectId(data.modelId),
      variantId: data.variantId
        ? new Types.ObjectId(data.variantId)
        : undefined,
      year: data.year,
      mileage: data.mileage,
      transmissionTypeId: new Types.ObjectId(data.transmissionTypeId),
      fuelTypeId: new Types.ObjectId(data.fuelTypeId),
      color: data.color,
      isFirstOwner: data.isFirstOwner ?? false,
      hasInsurance: data.hasInsurance ?? false,
      hasRcBook: data.hasRcBook ?? false,
      additionalFeatures: data.additionalFeatures ?? [],
    });
    await vehicleAd.save();

    return this.findOne((savedAd._id as Types.ObjectId).toString());
  }

  private async createCommercialVehicleAdFromUnified(
    data: any,
    userId: string,
  ): Promise<DetailedAdResponseDto> {
    await this.validateVehicleInventoryReferences(data);

    const model = await this.vehicleInventoryService.findVehicleModelById(
      data.modelId,
    );
    const modelName = model
      ? (model as any).displayName || (model as any).name
      : 'Vehicle';
    const year = data.year ?? '';
    const title = `${modelName} ${year}`.trim();

    const session = await this.adModel.startSession();
    session.startTransaction();
    try {
      const ad = new this.adModel({
        title,
        description: data.description,
        price: data.price,
        images: data.images ?? [],
        location: data.location,
        link: data.link,
        postedBy: new Types.ObjectId(userId),
        category: AdCategory.COMMERCIAL_VEHICLE,
        soldOut: false, // Always set soldOut to false by default
        isApproved: false, // Always set isApproved to false by default
      });
      const savedAd = await ad.save({ session });

      const commercialVehicleAd = new this.commercialVehicleAdModel({
        ad: savedAd._id as Types.ObjectId,
        commercialVehicleType: data.commercialVehicleType,
        bodyType: data.bodyType,
        manufacturerId: new Types.ObjectId(data.manufacturerId),
        modelId: new Types.ObjectId(data.modelId),
        variantId: data.variantId
          ? new Types.ObjectId(data.variantId)
          : undefined,
        year: data.year,
        mileage: data.mileage,
        payloadCapacity: data.payloadCapacity,
        payloadUnit: data.payloadUnit,
        axleCount: data.axleCount,
        transmissionTypeId: new Types.ObjectId(data.transmissionTypeId),
        fuelTypeId: new Types.ObjectId(data.fuelTypeId),
        color: data.color,
        hasInsurance: data.hasInsurance ?? false,
        hasFitness: data.hasFitness ?? false,
        hasPermit: data.hasPermit ?? false,
        additionalFeatures: data.additionalFeatures ?? [],
        seatingCapacity: data.seatingCapacity,
      });
      await commercialVehicleAd.save({ session });

      await session.commitTransaction();
      session.endSession();

      return this.findOne((savedAd._id as Types.ObjectId).toString());
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      // eslint-disable-next-line no-console
      console.error('❌ Error creating commercial vehicle ad:', e);
      throw e;
    }
  }

  private async createTwoWheelerAdFromUnified(
    data: any,
    userId: string,
  ): Promise<DetailedAdResponseDto> {
    const model = await this.vehicleInventoryService.findVehicleModelById(
      data.modelId,
    );
    const modelName = model
      ? (model as any).displayName || (model as any).name
      : 'Vehicle';
    const year = data.year ?? '';
    const title = `${modelName} ${year}`.trim();

    const ad = new this.adModel({
      title,
      description: data.description,
      price: data.price,
      images: data.images ?? [],
      location: data.location,
      link: data.link,
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.TWO_WHEELER,
      soldOut: false, // Always set soldOut to false by default
      isApproved: false, // Always set isApproved to false by default
    });
    const savedAd = await ad.save();

    const vehicleAd = new this.vehicleAdModel({
      ad: savedAd._id as any,
      vehicleType: data.vehicleType,
      manufacturerId: new Types.ObjectId(data.manufacturerId),
      modelId: new Types.ObjectId(data.modelId),
      variantId: data.variantId
        ? new Types.ObjectId(data.variantId)
        : undefined,
      year: data.year,
      mileage: data.mileage,
      transmissionTypeId: new Types.ObjectId(data.transmissionTypeId),
      fuelTypeId: new Types.ObjectId(data.fuelTypeId),
      color: data.color,
      isFirstOwner: data.isFirstOwner ?? false,
      hasInsurance: data.hasInsurance ?? false,
      hasRcBook: data.hasRcBook ?? false,
      additionalFeatures: data.additionalFeatures ?? [],
    });
    await vehicleAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  /** ---------- UPDATE / DELETE ---------- */
  async update(
    id: string,
    updateDto: any,
    userId: string,
    userType?: string,
  ): Promise<DetailedAdResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException(`Invalid ad ID: ${id}`);
    }
    // Allow if owner or Super Admin
    const ad = await this.adModel.findById(id);
    console.log('id', id);
    console.log('ad', ad);
    if (!ad) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }
    const isOwner = (ad.postedBy as any)?.toString?.() === userId;
    const isSuperAdmin = userType === 'SA';
    if (!isOwner && !isSuperAdmin) {
      throw new NotFoundException(
        `Advertisement with ID ${id} not found or you don't have permission to update it`,
      );
    }

    // 1) Update top-level ad fields (only allowed ones)
    const adUpdate: any = {};

    // Handle both old format (direct properties) and new format (nested in data)
    const updateData = updateDto.data || updateDto;

    // If data is empty object, treat it as no updates
    if (updateDto.data && Object.keys(updateDto.data).length === 0) {
      console.log('Empty data object provided, no updates to apply');
    }

    if (typeof updateData.description === 'string')
      adUpdate.description = updateData.description;
    if (typeof updateData.price === 'number') adUpdate.price = updateData.price;
    if (Array.isArray(updateData.images)) adUpdate.images = updateData.images;
    if (typeof updateData.location === 'string')
      adUpdate.location = updateData.location;
    if (typeof updateData.link === 'string') adUpdate.link = updateData.link;
    if (typeof updateData.isActive === 'boolean')
      adUpdate.isActive = updateData.isActive;
    if (Object.keys(adUpdate).length) {
      Object.assign(ad, adUpdate);
      await ad.save();
    }

    switch (ad.category) {
      case AdCategory.PROPERTY:
        await this.updatePropertyAd(id, updateData);
        break;
      case AdCategory.PRIVATE_VEHICLE:
      case AdCategory.TWO_WHEELER:
        await this.updateVehicleAdValidated(id, updateData, ad);
        break;
      case AdCategory.COMMERCIAL_VEHICLE:
        await this.updateCommercialVehicleAdValidated(id, updateData, ad);
        break;
    }

    await this.invalidateAdCache(id, userId);
    return this.findOne(id);
  }

  async delete(id: string, userId: string, userType?: string): Promise<void> {
    if (!this.isValidId(id)) {
      throw new BadRequestException(`Invalid ad ID: ${id}`);
    }
    // First, find the ad to check if it exists
    const ad = await this.adModel.findById(id);
    if (!ad) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is admin or super admin (they can delete any ad)
    if (userType === UserType.ADMIN || userType === UserType.SUPER_ADMIN) {
      await this.adModel.findByIdAndDelete(id);
      await this.invalidateAdCache(id, userId);
      return;
    }

    // For regular users, check if they are the owner of the ad
    if (ad.postedBy.toString() !== userId) {
      throw new NotFoundException(
        `You don't have permission to delete this advertisement. Only the owner, admin, or super admin can delete it.`,
      );
    }

    // User is the owner, proceed with deletion
    await this.adModel.findByIdAndDelete(id);
    await this.invalidateAdCache(id, userId);
  }

  /** ---------- APPROVAL WORKFLOW ---------- */
  async updateAdApproval(
    id: string,
    isApproved: boolean,
    approvedBy: string,
  ): Promise<DetailedAdResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException(`Invalid ad ID: ${id}`);
    }

    const ad = await this.adModel.findById(id);
    if (!ad) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Update the ad with approval information
    const updateData: any = {
      isApproved,
      updatedAt: new Date(),
    };

    if (isApproved) {
      updateData.approvedBy = new Types.ObjectId(approvedBy);
    } else {
      updateData.approvedBy = null;
    }

    await this.adModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Invalidate cache to ensure fresh data
    await this.invalidateAdCache(id, approvedBy);

    return this.findOne(id);
  }

  /** ---------- ADMIN ONLY - ALL ADS (INCLUDING UNAPPROVED) ---------- */
  async getAllAdsForAdmin(
    filters: FilterAdDto,
  ): Promise<PaginatedDetailedAdResponseDto> {
    // Build deterministic cache key
    const normalize = (obj: any): any => {
      if (obj == null) return obj;
      if (Array.isArray(obj)) return obj.map(normalize);
      if (typeof obj === 'object') {
        const entries = Object.entries(obj)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, normalize(v)]);
        return Object.fromEntries(entries);
      }
      return obj;
    };

    const safeFilters = this.normalize(filters);
    const cacheKey = this.key({ scope: 'getAllAdsForAdmin', ...safeFilters });

    // Try cache first
    const cached =
      await this.redisService.cacheGet<PaginatedDetailedAdResponseDto>(
        cacheKey,
      );
    if (cached) return cached;

    let {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      latitude,
      longitude,
    } = filters;
    const { field: sortField, dir: sortDirection } = this.coerceSort(
      sortBy,
      sortOrder,
    );
    page = this.clamp(Number(page) || 1, 1, 1e9);
    limit = this.clamp(Number(limit) || 20, 1, 100);

    // ------- Pipeline -------
    const pipeline: any[] = [];

    // Enhanced search: will be applied after lookups to include manufacturer, model, variant names
    // Store search term for later use
    const searchTerm = search && `${search}`.trim() ? `${search}`.trim() : null;

    // Base visibility: show all ads (including unapproved) except soft-deleted
    pipeline.push({ $match: { isDeleted: { $ne: true } } });

    // Optional category filter
    if (filters.category) {
      pipeline.push({ $match: { category: filters.category } });
    }

    // Hierarchical location-based filtering
    if (latitude !== undefined && longitude !== undefined) {
      // Get location hierarchy pipeline stages
      const locationPipeline =
        this.locationHierarchyService.getLocationAggregationPipeline(
          latitude,
          longitude,
        );

      // Add location filtering stages to pipeline
      pipeline.push(...locationPipeline);

      // Add location scoring for prioritization
      pipeline.push(
        this.locationHierarchyService.getLocationScoringStage(
          latitude,
          longitude,
        ),
      );
    }

    // user
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    );

    // Add approvedBy user lookup for admin view
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approvedByUser',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      {
        $unwind: { path: '$approvedByUser', preserveNullAndEmptyArrays: true },
      },
    );

    // Add vehicle details lookup (unwind to get single object)
    pipeline.push(
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      },
      {
        $unwind: { path: '$vehicleDetails', preserveNullAndEmptyArrays: true },
      },
    );

    // Add commercial vehicle details lookup (unwind to get single object)
    pipeline.push(
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails',
        },
      },
      {
        $unwind: {
          path: '$commercialVehicleDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    // Add property details lookup (unwind to get single object)
    pipeline.push(
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      },
      {
        $unwind: { path: '$propertyDetails', preserveNullAndEmptyArrays: true },
      },
    );

    // Apply search filter if provided
    if (searchTerm) {
      pipeline.push({
        $match: {
          $or: [
            { description: { $regex: searchTerm, $options: 'i' } },
            { title: { $regex: searchTerm, $options: 'i' } },
            { location: { $regex: searchTerm, $options: 'i' } },
            { 'user.name': { $regex: searchTerm, $options: 'i' } },
            { 'user.email': { $regex: searchTerm, $options: 'i' } },
          ],
        },
      });
    }

    // Sort
    if (latitude !== undefined && longitude !== undefined) {
      // Prioritize by location score first, then by requested sort field
      pipeline.push({
        $sort: {
          locationScore: -1, // Higher location score first (district > state > country)
          [sortField]: sortDirection,
        },
      });
    } else {
      // Regular sorting when no location filtering
      pipeline.push({ $sort: { [sortField]: sortDirection } });
    }

    // Facet for pagination
    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    });

    const [result] = await this.adModel.aggregate(pipeline);
    const data = result.data || [];
    const total = result.total[0]?.count || 0;

    // Map to response DTOs with inventory details
    const dtoData = await Promise.all(
      data.map(async (ad: any) => {
        const dto = await this.mapToResponseDtoWithInventory(ad);
        dto.year =
          ad.vehicleDetails?.year ?? ad.commercialVehicleDetails?.year ?? null;
        return dto;
      }),
    );

    const totalPages = Math.ceil(total / limit);

    const response: PaginatedDetailedAdResponseDto = {
      data: dtoData,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // Cache the result
    await this.redisService.cacheSet(cacheKey, response, AdsService.TTL.LIST);
    return response;
  }

  /** ---------- REDIS / CACHING UTILS ---------- */
  private async invalidateAdCache(
    adId?: string,
    userId?: string,
  ): Promise<void> {
    try {
      // Invalidate general ad listings
      const findAllKeys = await this.redisService.keys(
        `${AdsService.CACHE_PREFIX}findAll*`,
      );
      if (findAllKeys.length > 0) {
        await Promise.all(
          findAllKeys.map((k) => this.redisService.cacheDel(k)),
        );
      }

      // Invalidate user-specific ad listings
      const getUserAdsKeys = await this.redisService.keys(
        `${AdsService.CACHE_PREFIX}getUserAds*`,
      );
      if (getUserAdsKeys.length > 0) {
        await Promise.all(
          getUserAdsKeys.map((k) => this.redisService.cacheDel(k)),
        );
      }

      // Invalidate admin all ads cache
      const adminAllAdsKeys = await this.redisService.keys(
        `${AdsService.CACHE_PREFIX}getAllAdsForAdmin*`,
      );
      if (adminAllAdsKeys.length > 0) {
        await Promise.all(
          adminAllAdsKeys.map((k) => this.redisService.cacheDel(k)),
        );
      }

      // Invalidate specific ad details if adId provided
      if (adId) {
        const idKeys = await this.redisService.keys(
          `${AdsService.CACHE_PREFIX}getById:${adId}:*`,
        );
        if (idKeys?.length) {
          await Promise.all(idKeys.map((k) => this.redisService.cacheDel(k)));
        }
      }

      // Invalidate user-specific caches if userId provided
      if (userId) {
        const userKeys = await this.redisService.keys(
          `${AdsService.CACHE_PREFIX}*userId*${userId}*`,
        );
        if (userKeys.length > 0) {
          await Promise.all(userKeys.map((k) => this.redisService.cacheDel(k)));
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error invalidating ad cache:', err);
    }
  }

  async warmUpCache(): Promise<void> {
    try {
      const popularQueries: FilterAdDto[] = [
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' },
        {
          page: 1,
          limit: 20,
          category: AdCategory.PRIVATE_VEHICLE,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 20,
          category: AdCategory.PROPERTY,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 20,
          category: AdCategory.COMMERCIAL_VEHICLE,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 20,
          category: AdCategory.TWO_WHEELER,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
      ];
      await Promise.all(popularQueries.map((q) => this.findAll(q)));
      // eslint-disable-next-line no-console
      console.log('✅ Ads cache warmed up successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error warming up ads cache:', error);
    }
  }

  /** ---------- CHAT RELATIONS ENRICHMENT ---------- */
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

  /** ---------- VEHICLE INVENTORY ENRICHMENT ---------- */
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
          const m = await this.vehicleInventoryService.findManufacturerById(
            vehicleDetails.manufacturerId,
          );
          inv.manufacturer = {
            id: (m as any)._id?.toString?.() ?? '',
            name: (m as any).name,
            country: (m as any).originCountry,
          };
        } catch {}
      }

      if (vehicleDetails.modelId) {
        try {
          const model = await this.vehicleInventoryService.findVehicleModelById(
            vehicleDetails.modelId,
          );
          inv.model = {
            id: (model as any)._id?.toString?.() ?? '',
            name: (model as any).name,
            manufacturerId: (model as any).manufacturer?.toString?.(),
          };
        } catch {}
      }

      if (vehicleDetails.variantId) {
        try {
          const v = await this.vehicleInventoryService.findVehicleVariantById(
            vehicleDetails.variantId,
          );
          inv.variant = {
            id: (v as any)._id?.toString?.() ?? '',
            name: (v as any).name,
            modelId: (v as any).vehicleModel?.toString?.(),
            price: (v as any).price,
          };
        } catch {}
      }

      if (vehicleDetails.transmissionTypeId) {
        try {
          const t = await this.vehicleInventoryService.findTransmissionTypeById(
            vehicleDetails.transmissionTypeId,
          );
          inv.transmissionType = {
            id: (t as any)._id?.toString?.() ?? '',
            name: (t as any).name,
            description: (t as any).description,
          };
        } catch {}
      }

      if (vehicleDetails.fuelTypeId) {
        try {
          const f = await this.vehicleInventoryService.findFuelTypeById(
            vehicleDetails.fuelTypeId,
          );
          inv.fuelType = {
            id: (f as any)._id?.toString?.() ?? '',
            name: (f as any).name,
            description: (f as any).description,
          };
        } catch {}
      }

      if (Object.keys(inv).length > 0) {
        if (detailedAd.vehicleDetails) {
          (detailedAd.vehicleDetails as any).inventory = inv;
        } else if (detailedAd.commercialVehicleDetails) {
          (detailedAd.commercialVehicleDetails as any).inventory = inv;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error populating vehicle inventory details:', error);
    }
  }

  /** ---------- DTO MAPPERS ---------- */
  private mapToResponseDto(ad: any): DetailedAdResponseDto {
    return {
      id: (ad._id as any).toString(),
      description: ad.description,
      price: ad.price,
      images: ad.images,
      location: ad.location,
      link: ad.link || '',
      category: ad.category,
      isActive: ad.isActive,
      soldOut: ad.soldOut || false,
      isApproved: ad.isApproved || false,
      approvedBy: ad.approvedBy ? (ad.approvedBy as any).toString() : undefined,
      postedAt: ad.createdAt, // expose createdAt as postedAt
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy,
      user: ad.user
        ? {
            id: (ad.user._id as any)?.toString?.(),
            name: ad.user.name,
            email: ad.user.email,
            phone: ad.user.phone,
          }
        : undefined,
      approvedByUser: ad.approvedByUser
        ? {
            id: (ad.approvedByUser._id as any)?.toString?.(),
            name: ad.approvedByUser.name,
            email: ad.approvedByUser.email,
          }
        : undefined,
      vehicleDetails: ad.vehicleDetails || [],
      commercialVehicleDetails: ad.commercialVehicleDetails || [],
      propertyDetails: ad.propertyDetails || [],
    };
  }

  /**
   * Map ad to response DTO with inventory details (v2 approach)
   */
  private async mapToResponseDtoWithInventory(
    ad: any,
  ): Promise<DetailedAdResponseDto> {
    const base = this.mapToResponseDto(ad);

    // Vehicle details processing with inventory information

    // Process vehicle details with inventory information
    const vehicleDetails = ad.vehicleDetails;
    let processedVehicleDetails = vehicleDetails;

    if (vehicleDetails && Object.keys(vehicleDetails).length > 0) {
      // Fetch vehicle inventory details individually with error handling
      const [manufacturer, model, variant, fuelType, transmissionType] =
        await Promise.all([
          vehicleDetails.manufacturerId
            ? this.vehicleInventoryService
                .findManufacturerById(vehicleDetails.manufacturerId)
                .catch(() => ({
                  _id: vehicleDetails.manufacturerId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          vehicleDetails.modelId
            ? this.vehicleInventoryService
                .findVehicleModelById(vehicleDetails.modelId)
                .catch(() => ({
                  _id: vehicleDetails.modelId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          vehicleDetails.variantId
            ? this.vehicleInventoryService
                .findVehicleVariantById(vehicleDetails.variantId)
                .catch(() => ({
                  _id: vehicleDetails.variantId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          vehicleDetails.fuelTypeId
            ? this.vehicleInventoryService
                .findFuelTypeById(vehicleDetails.fuelTypeId)
                .catch(() => ({
                  _id: vehicleDetails.fuelTypeId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          vehicleDetails.transmissionTypeId
            ? this.vehicleInventoryService
                .findTransmissionTypeById(vehicleDetails.transmissionTypeId)
                .catch(() => ({
                  _id: vehicleDetails.transmissionTypeId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
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
    const commercialVehicleDetails = ad.commercialVehicleDetails;
    let processedCommercialVehicleDetails = commercialVehicleDetails;

    if (
      commercialVehicleDetails &&
      Object.keys(commercialVehicleDetails).length > 0
    ) {
      // Fetch commercial vehicle inventory details individually with error handling
      const [manufacturer, model, variant, fuelType, transmissionType] =
        await Promise.all([
          commercialVehicleDetails.manufacturerId
            ? this.vehicleInventoryService
                .findManufacturerById(commercialVehicleDetails.manufacturerId)
                .catch(() => ({
                  _id: commercialVehicleDetails.manufacturerId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          commercialVehicleDetails.modelId
            ? this.vehicleInventoryService
                .findVehicleModelById(commercialVehicleDetails.modelId)
                .catch(() => ({
                  _id: commercialVehicleDetails.modelId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          commercialVehicleDetails.variantId
            ? this.vehicleInventoryService
                .findVehicleVariantById(commercialVehicleDetails.variantId)
                .catch(() => ({
                  _id: commercialVehicleDetails.variantId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          commercialVehicleDetails.fuelTypeId
            ? this.vehicleInventoryService
                .findFuelTypeById(commercialVehicleDetails.fuelTypeId)
                .catch(() => ({
                  _id: commercialVehicleDetails.fuelTypeId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
          commercialVehicleDetails.transmissionTypeId
            ? this.vehicleInventoryService
                .findTransmissionTypeById(
                  commercialVehicleDetails.transmissionTypeId,
                )
                .catch(() => ({
                  _id: commercialVehicleDetails.transmissionTypeId,
                  name: 'Not Found',
                  displayName: 'Not Found',
                }))
            : Promise.resolve(undefined),
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
      ...base,
      vehicleDetails: processedVehicleDetails || undefined,
      commercialVehicleDetails: processedCommercialVehicleDetails || undefined,
    };
  }

  /**
   * Update soldOut status for an advertisement
   * This method is intentionally lightweight to support a public PATCH endpoint
   */
  async updateSoldOut(
    id: string,
    soldOut: boolean,
    requesterId?: string,
    requesterType?: string,
  ): Promise<DetailedAdResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException(`Invalid ad ID: ${id}`);
    }

    // Ensure ad exists first
    const ad = await this.adModel.findById(id).lean();
    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    // Authorization: Admin/Super Admin full access; others must own the ad
    const isPrivileged =
      requesterType === 'admin' || requesterType === 'super_admin';
    const isOwner =
      requesterId && ad.postedBy?.toString?.() === requesterId.toString();
    if (!isPrivileged && !isOwner) {
      throw new ForbiddenException(
        'You are not allowed to update sold-out status for this advertisement',
      );
    }

    const updated = await this.adModel.findByIdAndUpdate(
      id,
      { $set: { soldOut, updatedAt: new Date() } },
      { new: true },
    );

    // Reuse aggregation-based fetch to return enriched data consistently
    return await this.findOne(id);
  }

  private mapToDetailedResponseDto(ad: any): DetailedAdResponseDto {
    const base = this.mapToResponseDto(ad);

    const detailed: DetailedAdResponseDto = {
      ...base,
      postedBy: (ad.postedBy as any)?.toString?.() ?? base.postedBy,
    };

    if (ad.propertyDetails?.[0]) {
      const p = ad.propertyDetails[0];
      detailed.propertyDetails = {
        propertyType: p.propertyType,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaSqft: p.areaSqft,
        floor: p.floor,
        isFurnished: p.isFurnished,
        hasParking: p.hasParking,
        hasGarden: p.hasGarden,
        amenities: p.amenities,
      } as any;
    }

    if (ad.vehicleDetails?.[0]) {
      const v = ad.vehicleDetails[0];
      detailed.vehicleDetails = {
        vehicleType: v.vehicleType,
        manufacturerId: v.manufacturerId,
        modelId: v.modelId,
        variantId: v.variantId,
        year: v.year,
        mileage: v.mileage,
        transmissionTypeId: v.transmissionTypeId,
        fuelTypeId: v.fuelTypeId,
        color: v.color,
        isFirstOwner: v.isFirstOwner,
        hasInsurance: v.hasInsurance,
        hasRcBook: v.hasRcBook,
        additionalFeatures: v.additionalFeatures,
      } as any;
    }

    if (ad.commercialVehicleDetails?.[0]) {
      const c = ad.commercialVehicleDetails[0];
      detailed.commercialVehicleDetails = {
        vehicleType: c.vehicleType,
        commercialVehicleType: c.commercialVehicleType,
        bodyType: c.bodyType,
        manufacturerId: c.manufacturerId,
        modelId: c.modelId,
        variantId: c.variantId,
        year: c.year,
        mileage: c.mileage,
        payloadCapacity: c.payloadCapacity,
        payloadUnit: c.payloadUnit,
        axleCount: c.axleCount,
        transmissionTypeId: c.transmissionTypeId,
        fuelTypeId: c.fuelTypeId,
        color: c.color,
        hasInsurance: c.hasInsurance,
        hasFitness: c.hasFitness,
        hasPermit: c.hasPermit,
        additionalFeatures: c.additionalFeatures,
        seatingCapacity: c.seatingCapacity,
      } as any;
    }

    return detailed;
  }

  /** ---------- SUBDOC UPDATES ---------- */
  private async updatePropertyAd(id: string, updateDto: any): Promise<void> {
    const doc = await this.propertyAdModel.findOne({ ad: id });
    if (doc) {
      const allowed: any = {};
      if (updateDto.propertyType) allowed.propertyType = updateDto.propertyType;
      if (typeof updateDto.bedrooms === 'number')
        allowed.bedrooms = updateDto.bedrooms;
      if (typeof updateDto.bathrooms === 'number')
        allowed.bathrooms = updateDto.bathrooms;
      if (typeof updateDto.areaSqft === 'number')
        allowed.areaSqft = updateDto.areaSqft;
      if (typeof updateDto.floor === 'number') allowed.floor = updateDto.floor;
      if (typeof updateDto.isFurnished === 'boolean')
        allowed.isFurnished = updateDto.isFurnished;
      if (typeof updateDto.hasParking === 'boolean')
        allowed.hasParking = updateDto.hasParking;
      if (typeof updateDto.hasGarden === 'boolean')
        allowed.hasGarden = updateDto.hasGarden;
      if (Array.isArray(updateDto.amenities))
        allowed.amenities = updateDto.amenities;
      Object.assign(doc, allowed);
      await doc.save();
    }
  }

  private async updateVehicleAdValidated(
    id: string,
    updateDto: any,
    ad: AdDocument,
  ): Promise<void> {
    const doc = await this.vehicleAdModel.findOne({ ad: id });
    if (!doc) return;

    const update: any = {};
    if (updateDto.vehicleType) update.vehicleType = updateDto.vehicleType;
    if (updateDto.manufacturerId) {
      await this.vehicleInventoryService.findManufacturerById(
        updateDto.manufacturerId,
      );
      update.manufacturerId = new Types.ObjectId(updateDto.manufacturerId);
    }
    if (updateDto.modelId) {
      await this.vehicleInventoryService.findVehicleModelById(
        updateDto.modelId,
      );
      update.modelId = new Types.ObjectId(updateDto.modelId);
    }
    if (updateDto.variantId)
      update.variantId = new Types.ObjectId(updateDto.variantId);
    if (typeof updateDto.year === 'number') update.year = updateDto.year;
    if (typeof updateDto.mileage === 'number')
      update.mileage = updateDto.mileage;
    if (updateDto.transmissionTypeId) {
      await this.vehicleInventoryService.findTransmissionTypeById(
        updateDto.transmissionTypeId,
      );
      update.transmissionTypeId = new Types.ObjectId(
        updateDto.transmissionTypeId,
      );
    }
    if (updateDto.fuelTypeId) {
      await this.vehicleInventoryService.findFuelTypeById(updateDto.fuelTypeId);
      update.fuelTypeId = new Types.ObjectId(updateDto.fuelTypeId);
    }
    if (typeof updateDto.color === 'string') update.color = updateDto.color;
    if (typeof updateDto.isFirstOwner === 'boolean')
      update.isFirstOwner = updateDto.isFirstOwner;
    if (typeof updateDto.hasInsurance === 'boolean')
      update.hasInsurance = updateDto.hasInsurance;
    if (typeof updateDto.hasRcBook === 'boolean')
      update.hasRcBook = updateDto.hasRcBook;
    if (Array.isArray(updateDto.additionalFeatures))
      update.additionalFeatures = updateDto.additionalFeatures;

    Object.assign(doc, update);
    await doc.save();

    // Update ad title if model/year changed
    if (updateDto.modelId || updateDto.year) {
      const modelId = updateDto.modelId
        ? updateDto.modelId
        : (doc.modelId as any)?.toString?.();
      if (modelId) {
        const model =
          await this.vehicleInventoryService.findVehicleModelById(modelId);
        const modelName =
          (model as any)?.displayName || (model as any)?.name || 'Vehicle';
        const year = updateDto.year ?? doc.year ?? '';
        const title = `${modelName} ${year}`.trim();
        await this.adModel.updateOne({ _id: ad._id }, { title });
      }
    }
  }

  private async updateCommercialVehicleAdValidated(
    id: string,
    updateDto: any,
    ad: AdDocument,
  ): Promise<void> {
    const doc = await this.commercialVehicleAdModel.findOne({ ad: id });
    if (!doc) return;

    const update: any = {};
    if (updateDto.commercialVehicleType)
      update.commercialVehicleType = updateDto.commercialVehicleType;
    if (updateDto.bodyType) update.bodyType = updateDto.bodyType;
    if (updateDto.manufacturerId) {
      await this.vehicleInventoryService.findManufacturerById(
        updateDto.manufacturerId,
      );
      update.manufacturerId = new Types.ObjectId(updateDto.manufacturerId);
    }
    if (updateDto.modelId) {
      await this.vehicleInventoryService.findVehicleModelById(
        updateDto.modelId,
      );
      update.modelId = new Types.ObjectId(updateDto.modelId);
    }
    if (updateDto.variantId)
      update.variantId = new Types.ObjectId(updateDto.variantId);
    if (typeof updateDto.year === 'number') update.year = updateDto.year;
    if (typeof updateDto.mileage === 'number')
      update.mileage = updateDto.mileage;
    if (typeof updateDto.payloadCapacity === 'number')
      update.payloadCapacity = updateDto.payloadCapacity;
    if (typeof updateDto.payloadUnit === 'string')
      update.payloadUnit = updateDto.payloadUnit;
    if (typeof updateDto.axleCount === 'number')
      update.axleCount = updateDto.axleCount;
    if (updateDto.transmissionTypeId) {
      await this.vehicleInventoryService.findTransmissionTypeById(
        updateDto.transmissionTypeId,
      );
      update.transmissionTypeId = new Types.ObjectId(
        updateDto.transmissionTypeId,
      );
    }
    if (updateDto.fuelTypeId) {
      await this.vehicleInventoryService.findFuelTypeById(updateDto.fuelTypeId);
      update.fuelTypeId = new Types.ObjectId(updateDto.fuelTypeId);
    }
    if (typeof updateDto.color === 'string') update.color = updateDto.color;
    if (typeof updateDto.hasInsurance === 'boolean')
      update.hasInsurance = updateDto.hasInsurance;
    if (typeof updateDto.hasFitness === 'boolean')
      update.hasFitness = updateDto.hasFitness;
    if (typeof updateDto.hasPermit === 'boolean')
      update.hasPermit = updateDto.hasPermit;
    if (Array.isArray(updateDto.additionalFeatures))
      update.additionalFeatures = updateDto.additionalFeatures;
    if (typeof updateDto.seatingCapacity === 'number')
      update.seatingCapacity = updateDto.seatingCapacity;

    Object.assign(doc, update);
    await doc.save();

    // Update ad title if model/year changed
    if (updateDto.modelId || updateDto.year) {
      const modelId = updateDto.modelId
        ? updateDto.modelId
        : (doc.modelId as any)?.toString?.();
      if (modelId) {
        const model =
          await this.vehicleInventoryService.findVehicleModelById(modelId);
        const modelName =
          (model as any)?.displayName || (model as any)?.name || 'Vehicle';
        const year = updateDto.year ?? doc.year ?? '';
        const title = `${modelName} ${year}`.trim();
        await this.adModel.updateOne({ _id: ad._id }, { title });
      }
    }
  }

  /** ---------- RATINGS AND REVIEWS ---------- */
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

  /** ---------- INVENTORY VALIDATION ---------- */
  private async validateVehicleInventoryReferences(
    createDto: any,
  ): Promise<void> {
    try {
      const {
        manufacturerId,
        modelId,
        variantId,
        transmissionTypeId,
        fuelTypeId,
      } = createDto || {};

      if (!manufacturerId || !modelId || !transmissionTypeId || !fuelTypeId) {
        throw new BadRequestException(
          'Missing required vehicle inventory references',
        );
      }

      await this.vehicleInventoryService.findManufacturerById(manufacturerId);
      await this.vehicleInventoryService.findVehicleModelById(modelId);

      if (variantId) {
        await this.vehicleInventoryService.findVehicleVariantById(variantId);
      }

      await this.vehicleInventoryService.findTransmissionTypeById(
        transmissionTypeId,
      );
      await this.vehicleInventoryService.findFuelTypeById(fuelTypeId);
    } catch (error: any) {
      const msg = error?.message ?? 'Unknown error';
      throw new BadRequestException(
        `Invalid vehicle inventory reference: ${msg}`,
      );
    }
  }
}
