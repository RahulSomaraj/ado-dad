import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ad, AdDocument, AdCategory } from '../schemas/ad.schema';
import { PropertyAd, PropertyAdDocument } from '../schemas/property-ad.schema';
import { VehicleAd, VehicleAdDocument } from '../schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdDocument,
} from '../schemas/commercial-vehicle-ad.schema';
import { FilterAdDto } from '../dto/common/filter-ad.dto';
import {
  AdResponseDto,
  PaginatedAdResponseDto,
  DetailedAdResponseDto,
  PaginatedDetailedAdResponseDto,
} from '../dto/common/ad-response.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { CreateAdDto } from '../dto/common/create-ad.dto';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { RedisService } from '../../shared/redis.service';
import { CommercialVehicleDetectionService } from './commercial-vehicle-detection.service';

interface MatchStage {
  isActive?: boolean;
  category?: AdCategory;
  $text?: { $search: string };
  location?: { $regex: string; $options: string };
  price?: { $gte?: number; $lte?: number };
  postedBy?: string;
}

interface PropertyMatchStage {
  propertyType?: string;
  bedrooms?: { $gte?: number; $lte?: number };
  bathrooms?: { $gte?: number; $lte?: number };
  areaSqft?: { $gte?: number; $lte?: number };
  isFurnished?: boolean;
  hasParking?: boolean;
  hasGarden?: boolean;
}

interface VehicleMatchStage {
  vehicleType?: string;
  manufacturerId?: string;
  modelId?: string;
  variantId?: string;
  year?: { $gte?: number; $lte?: number };
  mileage?: { $lte?: number };
  transmissionTypeId?: string;
  fuelTypeId?: string;
  color?: { $regex: string; $options: string };
  isFirstOwner?: boolean;
  hasInsurance?: boolean;
  hasRcBook?: boolean;
}

interface CommercialVehicleMatchStage {
  vehicleType?: string;
  bodyType?: string;
  payloadCapacity?: { $gte?: number; $lte?: number };
  axleCount?: number;
  hasFitness?: boolean;
  hasPermit?: boolean;
  seatingCapacity?: { $gte?: number; $lte?: number };
}

@Injectable()
export class AdsService {
  constructor(
    @InjectModel(Ad.name)
    private readonly adModel: Model<AdDocument>,
    @InjectModel(PropertyAd.name)
    private readonly propertyAdModel: Model<PropertyAdDocument>,
    @InjectModel(VehicleAd.name)
    private readonly vehicleAdModel: Model<VehicleAdDocument>,
    @InjectModel(CommercialVehicleAd.name)
    private readonly commercialVehicleAdModel: Model<CommercialVehicleAdDocument>,
    private readonly vehicleInventoryService: VehicleInventoryService,
    private readonly redisService: RedisService,
    private readonly commercialVehicleDetectionService: CommercialVehicleDetectionService,
  ) {
    // Create indexes for better performance
    this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    try {
      // Create compound indexes for common query patterns
      await this.adModel.collection.createIndex(
        { isActive: 1, category: 1, postedAt: -1 },
        { background: true },
      );

      await this.adModel.collection.createIndex(
        { isActive: 1, location: 1, price: 1 },
        { background: true },
      );

      await this.adModel.collection.createIndex(
        { postedBy: 1, isActive: 1 },
        { background: true },
      );

      // Text index for search
      await this.adModel.collection.createIndex(
        { title: 'text', description: 'text' },
        { background: true },
      );

      // Indexes for property ads
      await this.propertyAdModel.collection.createIndex(
        { ad: 1, propertyType: 1, bedrooms: 1, bathrooms: 1 },
        { background: true },
      );

      // Indexes for vehicle ads
      await this.vehicleAdModel.collection.createIndex(
        { ad: 1, vehicleType: 1, manufacturerId: 1, modelId: 1 },
        { background: true },
      );

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }
  async findAll(filters: FilterAdDto): Promise<PaginatedDetailedAdResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
    } = filters;
  
    const pipeline: any[] = [];
  
    // 🔍 Text Search
    if (search) {
      pipeline.push({ $match: { $text: { $search: search } } });
    }
  
    // 🧾 Basic filters
    const matchStage: any = { isActive: filters.isActive ?? true };
    if (filters.category) matchStage.category = filters.category;
    if (filters.location) {
      matchStage.location = { $regex: filters.location, $options: 'i' };
    }
    if (filters.minPrice || filters.maxPrice) {
      matchStage.price = {};
      if (filters.minPrice !== undefined) matchStage.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) matchStage.price.$lte = filters.maxPrice;
    }
    if (filters.postedBy) {
      matchStage.postedBy = new Types.ObjectId(filters.postedBy);
    }
  
    pipeline.push({ $match: matchStage });
  
    // 👤 User lookup
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
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    );
  
    // 🏠 Property lookup
    pipeline.push({
      $lookup: {
        from: 'propertyads',
        localField: '_id',
        foreignField: 'ad',
        as: 'propertyDetails',
      },
    });
  
    // 🚗 Vehicle lookup
    pipeline.push({
      $lookup: {
        from: 'vehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'vehicleDetails',
      },
    });
  
    // 🚛 Commercial vehicle lookup
    pipeline.push({
      $lookup: {
        from: 'commercialvehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'commercialVehicleDetails',
      },
    });

    // 🏠 Property filters (only apply if property filters are provided)
    if (filters.propertyType || filters.minBedrooms || filters.maxBedrooms || 
        filters.minBathrooms || filters.maxBathrooms || filters.minArea || filters.maxArea ||
        filters.isFurnished !== undefined || filters.hasParking !== undefined || filters.hasGarden !== undefined) {
      
      const propertyMatch: any = {};
      if (filters.propertyType) propertyMatch.propertyType = filters.propertyType;
      if (filters.minBedrooms || filters.maxBedrooms) {
        propertyMatch.bedrooms = {};
        if (filters.minBedrooms) propertyMatch.bedrooms.$gte = filters.minBedrooms;
        if (filters.maxBedrooms) propertyMatch.bedrooms.$lte = filters.maxBedrooms;
      }
      if (filters.minBathrooms || filters.maxBathrooms) {
        propertyMatch.bathrooms = {};
        if (filters.minBathrooms) propertyMatch.bathrooms.$gte = filters.minBathrooms;
        if (filters.maxBathrooms) propertyMatch.bathrooms.$lte = filters.maxBathrooms;
      }
      if (filters.minArea || filters.maxArea) {
        propertyMatch.areaSqft = {};
        if (filters.minArea) propertyMatch.areaSqft.$gte = filters.minArea;
        if (filters.maxArea) propertyMatch.areaSqft.$lte = filters.maxArea;
      }
      if (filters.isFurnished !== undefined) propertyMatch.isFurnished = filters.isFurnished;
      if (filters.hasParking !== undefined) propertyMatch.hasParking = filters.hasParking;
      if (filters.hasGarden !== undefined) propertyMatch.hasGarden = filters.hasGarden;

      pipeline.push({
        $match: {
          propertyDetails: { $elemMatch: propertyMatch },
        },
      });
    }
  
    // 🚗 Vehicle filters (only apply if vehicle filters are provided)
    if (filters.vehicleType || filters.manufacturerId || filters.modelId || filters.variantId ||
        filters.transmissionTypeId || filters.fuelTypeId || filters.color || filters.maxMileage !== undefined ||
        filters.isFirstOwner !== undefined || filters.hasInsurance !== undefined || filters.hasRcBook !== undefined ||
        filters.minYear || filters.maxYear) {
      
      const vehicleMatch: any = {};
      if (filters.vehicleType) vehicleMatch.vehicleType = filters.vehicleType;
      if (filters.manufacturerId) vehicleMatch.manufacturerId = new Types.ObjectId(filters.manufacturerId);
      if (filters.modelId) vehicleMatch.modelId = new Types.ObjectId(filters.modelId);
      if (filters.variantId) vehicleMatch.variantId = new Types.ObjectId(filters.variantId);
      if (filters.transmissionTypeId) vehicleMatch.transmissionTypeId = new Types.ObjectId(filters.transmissionTypeId);
      if (filters.fuelTypeId) vehicleMatch.fuelTypeId = new Types.ObjectId(filters.fuelTypeId);
      if (filters.color) vehicleMatch.color = { $regex: filters.color, $options: 'i' };
      if (filters.maxMileage !== undefined) vehicleMatch.mileage = { $lte: filters.maxMileage };
      if (filters.isFirstOwner !== undefined) vehicleMatch.isFirstOwner = filters.isFirstOwner;
      if (filters.hasInsurance !== undefined) vehicleMatch.hasInsurance = filters.hasInsurance;
      if (filters.hasRcBook !== undefined) vehicleMatch.hasRcBook = filters.hasRcBook;
      
      // Year filter
      if (filters.minYear || filters.maxYear) {
        vehicleMatch.year = {};
        if (filters.minYear) vehicleMatch.year.$gte = Number(filters.minYear);
        if (filters.maxYear) vehicleMatch.year.$lte = Number(filters.maxYear);
      }

      pipeline.push({
        $match: {
          vehicleDetails: { $elemMatch: vehicleMatch },
        },
      });
    }

    // 🚛 Commercial vehicle filters (only apply if commercial vehicle filters are provided)
    if (filters.commercialVehicleType || filters.bodyType || filters.minPayloadCapacity || filters.maxPayloadCapacity ||
        filters.axleCount || filters.hasFitness !== undefined || filters.hasPermit !== undefined ||
        filters.minSeatingCapacity || filters.maxSeatingCapacity) {
      
      const commercialMatch: any = {};
      if (filters.commercialVehicleType) commercialMatch.commercialVehicleType = filters.commercialVehicleType;
      if (filters.bodyType) commercialMatch.bodyType = filters.bodyType;
      if (filters.minPayloadCapacity || filters.maxPayloadCapacity) {
        commercialMatch.payloadCapacity = {};
        if (filters.minPayloadCapacity) commercialMatch.payloadCapacity.$gte = filters.minPayloadCapacity;
        if (filters.maxPayloadCapacity) commercialMatch.payloadCapacity.$lte = filters.maxPayloadCapacity;
      }
      if (filters.axleCount) commercialMatch.axleCount = filters.axleCount;
      if (filters.hasFitness !== undefined) commercialMatch.hasFitness = filters.hasFitness;
      if (filters.hasPermit !== undefined) commercialMatch.hasPermit = filters.hasPermit;
      if (filters.minSeatingCapacity || filters.maxSeatingCapacity) {
        commercialMatch.seatingCapacity = {};
        if (filters.minSeatingCapacity) commercialMatch.seatingCapacity.$gte = filters.minSeatingCapacity;
        if (filters.maxSeatingCapacity) commercialMatch.seatingCapacity.$lte = filters.maxSeatingCapacity;
      }

      pipeline.push({
        $match: {
          commercialVehicleDetails: { $elemMatch: commercialMatch },
        },
      });
    }
  
    // 📊 Count total
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.adModel.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;
  
    // 📦 Pagination & sorting
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortDirection } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });
  
    // 🚀 Fetch ads
    const ads = await this.adModel.aggregate(pipeline);
  
    return {
      data: ads.map((ad) => {
        const dto = this.mapToResponseDto(ad);
        dto.year =
          ad.vehicleDetails?.[0]?.year ||
          ad.commercialVehicleDetails?.[0]?.year ||
          null;
        return dto;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
  

  async findOne(id: string): Promise<AdResponseDto> {
    try {
      // Use aggregation pipeline to get ad with all details
      const pipeline = [
        {
          $match: { _id: new Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'postedBy',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
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
      
      // Add year from vehicle details if available
      dto.year = ad.vehicleDetails?.[0]?.year || 
                 ad.commercialVehicleDetails?.[0]?.year || 
                 null;

      return dto;
    } catch (error) {
      console.error('❌ Error in findOne:', error);
      throw error;
    }
  }

  async findByIds(ids: string[]): Promise<AdResponseDto[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    // Try to get from cache first
    const cacheKeys = ids.map((id) => `ads:getById:${id}`);
    const cachedResults = await Promise.all(
      cacheKeys.map((key) =>
        this.redisService.cacheGet<DetailedAdResponseDto>(key),
      ),
    );

    const uncachedIds = ids.filter((_, index) => !cachedResults[index]);
    const cachedAds = cachedResults.filter((result) => result !== null);

    if (uncachedIds.length === 0) {
      return cachedAds.map((ad) => this.mapToResponseDto(ad));
    }

    // Fetch uncached ads from database
    const uncachedAds = await this.adModel
      .find({ _id: { $in: uncachedIds } })
      .populate('postedBy', 'name email phone')
      .exec();

    // Cache the newly fetched ads
    const adsToCache = uncachedAds.map((ad) => ({
      key: `ads:getById:${ad._id}`,
      data: this.mapToResponseDto(ad),
      ttl: 900, // 15 minutes
    }));

    await Promise.all(
      adsToCache.map(({ key, data, ttl }) =>
        this.redisService.cacheSet(key, data, ttl),
      ),
    );

    return [
      ...cachedAds,
      ...uncachedAds.map((ad) => this.mapToResponseDto(ad)),
    ];
  }

  async getAdById(id: string): Promise<DetailedAdResponseDto> {
    // Generate cache key
    const cacheKey = `ads:getById:${id}`;

    // Try to get from cache first
    const cachedResult =
      await this.redisService.cacheGet<DetailedAdResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Use optimized aggregation pipeline with projections
    const pipeline = [
      {
        $match: { _id: new (require('mongoose').Types.ObjectId)(id) },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
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
    ];

    const results = await this.adModel.aggregate(pipeline);

    if (results.length === 0) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    const ad = results[0];
    const detailedAd = this.mapToDetailedResponseDto(ad);

    // Populate vehicle inventory details if it's a vehicle ad
    if (
      ad.category === AdCategory.PRIVATE_VEHICLE ||
      ad.category === AdCategory.TWO_WHEELER ||
      ad.category === AdCategory.COMMERCIAL_VEHICLE
    ) {
      await this.populateVehicleInventoryDetails(detailedAd);
    }

    // Cache the result for 15 minutes (longer TTL for individual ads)
    await this.redisService.cacheSet(cacheKey, detailedAd, 900);

    return detailedAd;
  }

  private normalizeFilters(filters: FilterAdDto): any {
    // Normalize filters to improve cache hit rate
    const normalized = { ...filters };

    // Remove undefined values
    Object.keys(normalized).forEach((key) => {
      if (normalized[key] === undefined || normalized[key] === null) {
        delete normalized[key];
      }
    });

    // Normalize string values (trim, lowercase)
    if (normalized.search) {
      normalized.search = normalized.search.trim().toLowerCase();
    }
    if (normalized.location) {
      normalized.location = normalized.location.trim().toLowerCase();
    }
    if (normalized.color) {
      normalized.color = normalized.color.trim().toLowerCase();
    }

    // Round numeric values to reduce cache key variations
    if (normalized.minPrice) {
      normalized.minPrice = Math.floor(normalized.minPrice / 1000) * 1000;
    }
    if (normalized.maxPrice) {
      normalized.maxPrice = Math.ceil(normalized.maxPrice / 1000) * 1000;
    }
    if (normalized.minBedrooms) {
      normalized.minBedrooms = Math.floor(normalized.minBedrooms);
    }
    if (normalized.maxBedrooms) {
      normalized.maxBedrooms = Math.ceil(normalized.maxBedrooms);
    }
    if (normalized.minYear) {
      normalized.minYear = Math.floor(normalized.minYear);
    }
    if (normalized.maxYear) {
      normalized.maxYear = Math.ceil(normalized.maxYear);
    }

    // Sort object keys for consistent cache keys
    return Object.keys(normalized)
      .sort()
      .reduce((obj, key) => {
        obj[key] = normalized[key];
        return obj;
      }, {});
  }

  private shouldCacheQuery(filters: FilterAdDto): boolean {
    // Don't cache complex queries that are likely to have low cache hit rates
    const filterCount = Object.keys(filters).filter(
      (key) => filters[key] !== undefined && filters[key] !== null,
    ).length;

    // Skip caching for very complex queries
    if (filterCount > 6) {
      return false;
    }

    // Skip caching for search queries (too dynamic)
    if (filters.search) {
      return false;
    }

    // Skip caching for specific filters that are rarely repeated
    if (
      filters.postedBy ||
      filters.manufacturerId ||
      filters.modelId ||
      filters.variantId
    ) {
      return false;
    }

    // Cache simple queries and moderate complexity queries
    return true;
  }

  private calculateCacheTTL(filters: FilterAdDto): number {
    // Base TTL of 3 minutes
    let ttl = 180;

    // Reduce TTL for complex queries (more filters = more dynamic data)
    const filterCount = Object.keys(filters).filter(
      (key) => filters[key] !== undefined && filters[key] !== null,
    ).length;

    if (filterCount > 5) {
      ttl = 60; // 1 minute for complex queries
    } else if (filterCount > 3) {
      ttl = 120; // 2 minutes for moderate queries
    }

    // Reduce TTL for search queries (more dynamic)
    if (filters.search) {
      ttl = Math.min(ttl, 60); // Max 1 minute for search
    }

    // Increase TTL for simple queries (more stable)
    if (filterCount <= 2 && !filters.search) {
      ttl = 300; // 5 minutes for simple queries
    }

    return ttl;
  }

  private async invalidateAdCache(adId?: string): Promise<void> {
    try {
      // Invalidate all ads cache
      const keys = await this.redisService.keys('ads:findAll:*');
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redisService.cacheDel(key)));
      }

      // Invalidate specific ad cache if ID provided
      if (adId) {
        await this.redisService.cacheDel(`ads:getById:${adId}`);
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Error invalidating ad cache:', error);
    }
  }

  async warmUpCache(): Promise<void> {
    try {
      console.log('🔥 Warming up ads cache...');

      // Warm up popular queries
      const popularQueries: FilterAdDto[] = [
        { page: 1, limit: 20, sortBy: 'postedAt', sortOrder: 'DESC' },
        {
          page: 1,
          limit: 20,
          category: AdCategory.PRIVATE_VEHICLE,
          sortBy: 'postedAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 20,
          category: AdCategory.PROPERTY,
          sortBy: 'postedAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 20,
          category: AdCategory.COMMERCIAL_VEHICLE,
          sortBy: 'postedAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 20,
          category: AdCategory.TWO_WHEELER,
          sortBy: 'postedAt',
          sortOrder: 'DESC',
        },
      ];

      await Promise.all(popularQueries.map((query) => this.findAll(query)));

      console.log('✅ Ads cache warmed up successfully');
    } catch (error) {
      console.error('❌ Error warming up ads cache:', error);
    }
  }

  private async populateVehicleInventoryDetails(
    detailedAd: DetailedAdResponseDto,
  ): Promise<void> {
    try {
      const vehicleDetails =
        detailedAd.vehicleDetails || detailedAd.commercialVehicleDetails;
      if (!vehicleDetails) return;

      const inventoryDetails: any = {};

      // Populate manufacturer
      if (vehicleDetails.manufacturerId) {
        try {
          const manufacturer =
            await this.vehicleInventoryService.findManufacturerById(
              vehicleDetails.manufacturerId,
            );
          inventoryDetails.manufacturer = {
            id: (manufacturer as any)._id.toString(),
            name: manufacturer.name,
            country: manufacturer.originCountry,
          };
        } catch (error) {
          // Manufacturer not found, skip
        }
      }

      // Populate model
      if (vehicleDetails.modelId) {
        try {
          const model = await this.vehicleInventoryService.findVehicleModelById(
            vehicleDetails.modelId,
          );
          inventoryDetails.model = {
            id: (model as any)._id.toString(),
            name: model.name,
            manufacturerId: (model.manufacturer as any).toString(),
          };
        } catch (error) {
          // Model not found, skip
        }
      }

      // Populate variant
      if (vehicleDetails.variantId) {
        try {
          const variant =
            await this.vehicleInventoryService.findVehicleVariantById(
              vehicleDetails.variantId,
            );
          inventoryDetails.variant = {
            id: (variant as any)._id.toString(),
            name: variant.name,
            modelId: (variant.vehicleModel as any).toString(),
            price: variant.price,
          };
        } catch (error) {
          // Variant not found, skip
        }
      }

      // Populate transmission type
      if (vehicleDetails.transmissionTypeId) {
        try {
          const transmissionType =
            await this.vehicleInventoryService.findTransmissionTypeById(
              vehicleDetails.transmissionTypeId,
            );
          inventoryDetails.transmissionType = {
            id: (transmissionType as any)._id.toString(),
            name: transmissionType.name,
            description: transmissionType.description,
          };
        } catch (error) {
          // Transmission type not found, skip
        }
      }

      // Populate fuel type
      if (vehicleDetails.fuelTypeId) {
        try {
          const fuelType = await this.vehicleInventoryService.findFuelTypeById(
            vehicleDetails.fuelTypeId,
          );
          inventoryDetails.fuelType = {
            id: (fuelType as any)._id.toString(),
            name: fuelType.name,
            description: fuelType.description,
          };
        } catch (error) {
          // Fuel type not found, skip
        }
      }

      // Assign inventory details to the appropriate vehicle details
      if (Object.keys(inventoryDetails).length > 0) {
        if (detailedAd.vehicleDetails) {
          detailedAd.vehicleDetails.inventory = inventoryDetails;
        } else if (detailedAd.commercialVehicleDetails) {
          detailedAd.commercialVehicleDetails.inventory = inventoryDetails;
        }
      }
    } catch (error) {
      // If there's any error in populating inventory details, continue without them
      console.error('Error populating vehicle inventory details:', error);
    }
  }

  private mapToDetailedResponseDto(ad: any): DetailedAdResponseDto {
    const baseAd = this.mapToResponseDto(ad);

    const detailedAd: DetailedAdResponseDto = {
      ...baseAd,
      postedBy: (ad.postedBy as any).toString(),
    };

    // Add property details if available
    if (ad.propertyDetails && ad.propertyDetails.length > 0) {
      const propertyDetail = ad.propertyDetails[0];
      detailedAd.propertyDetails = {
        propertyType: propertyDetail.propertyType,
        bedrooms: propertyDetail.bedrooms,
        bathrooms: propertyDetail.bathrooms,
        areaSqft: propertyDetail.areaSqft,
        floor: propertyDetail.floor,
        isFurnished: propertyDetail.isFurnished,
        hasParking: propertyDetail.hasParking,
        hasGarden: propertyDetail.hasGarden,
        amenities: propertyDetail.amenities,
      };
    }

    // Add vehicle details if available
    if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
      const vehicleDetail = ad.vehicleDetails[0];
      detailedAd.vehicleDetails = {
        vehicleType: vehicleDetail.vehicleType,
        manufacturerId: vehicleDetail.manufacturerId,
        modelId: vehicleDetail.modelId,
        variantId: vehicleDetail.variantId,
        year: vehicleDetail.year,
        mileage: vehicleDetail.mileage,
        transmissionTypeId: vehicleDetail.transmissionTypeId,
        fuelTypeId: vehicleDetail.fuelTypeId,
        color: vehicleDetail.color,
        isFirstOwner: vehicleDetail.isFirstOwner,
        hasInsurance: vehicleDetail.hasInsurance,
        hasRcBook: vehicleDetail.hasRcBook,
        additionalFeatures: vehicleDetail.additionalFeatures,
      };
    }

    // Add commercial vehicle details if available
    if (ad.commercialVehicleDetails && ad.commercialVehicleDetails.length > 0) {
      const commercialVehicleDetail = ad.commercialVehicleDetails[0];
      detailedAd.commercialVehicleDetails = {
        vehicleType: commercialVehicleDetail.vehicleType,
        commercialVehicleType: commercialVehicleDetail.commercialVehicleType,
        bodyType: commercialVehicleDetail.bodyType,
        manufacturerId: commercialVehicleDetail.manufacturerId,
        modelId: commercialVehicleDetail.modelId,
        variantId: commercialVehicleDetail.variantId,
        year: commercialVehicleDetail.year,
        mileage: commercialVehicleDetail.mileage,
        payloadCapacity: commercialVehicleDetail.payloadCapacity,
        payloadUnit: commercialVehicleDetail.payloadUnit,
        axleCount: commercialVehicleDetail.axleCount,
        transmissionTypeId: commercialVehicleDetail.transmissionTypeId,
        fuelTypeId: commercialVehicleDetail.fuelTypeId,
        color: commercialVehicleDetail.color,
        hasInsurance: commercialVehicleDetail.hasInsurance,
        hasFitness: commercialVehicleDetail.hasFitness,
        hasPermit: commercialVehicleDetail.hasPermit,
        additionalFeatures: commercialVehicleDetail.additionalFeatures,
        seatingCapacity: commercialVehicleDetail.seatingCapacity,
      };
    }

    return detailedAd;
  }

  // Unified method to create any type of ad
  async createAd(
    createDto: CreateAdDto,
    userId: string,
  ): Promise<AdResponseDto> {
    // Auto-detect commercial vehicle if modelId is provided
    if (createDto.data.modelId) {
      const commercialDefaults =
        await this.commercialVehicleDetectionService.detectCommercialVehicleDefaults(
          createDto.data.modelId,
        );

      // If commercial vehicle detected and no category specified, set it automatically
      if (commercialDefaults.isCommercialVehicle && !createDto.category) {
        createDto.category = AdCategory.COMMERCIAL_VEHICLE;
      }

      // Auto-populate commercial vehicle fields if commercial vehicle detected
      if (commercialDefaults.isCommercialVehicle) {
        createDto.data = {
          ...createDto.data,
          commercialVehicleType:
            createDto.data.commercialVehicleType ||
            commercialDefaults.commercialVehicleType,
          bodyType: createDto.data.bodyType || commercialDefaults.bodyType,
          payloadCapacity:
            createDto.data.payloadCapacity ||
            commercialDefaults.payloadCapacity,
          payloadUnit:
            createDto.data.payloadUnit || commercialDefaults.payloadUnit,
          axleCount: createDto.data.axleCount || commercialDefaults.axleCount,
          seatingCapacity:
            createDto.data.seatingCapacity ||
            commercialDefaults.seatingCapacity,
        };
      }
    }

    // Validate required fields based on category
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

    // Invalidate cache after creating new ad
    await this.invalidateAdCache();

    return result;
  }

  private validateRequiredFields(createDto: CreateAdDto): void {
    const { category, data } = createDto;

    // Validate base required fields (remove title)
    if (!data.description || !data.price || !data.location) {
      throw new BadRequestException(
        'Description, price, and location are required for all ad types',
      );
    }

    // Validate category-specific required fields
    switch (category) {
      case AdCategory.PROPERTY:
        if (
          !data.propertyType ||
          !data.bedrooms ||
          !data.bathrooms ||
          !data.areaSqft
        ) {
          throw new BadRequestException(
            'Property ads require: propertyType, bedrooms, bathrooms, and areaSqft',
          );
        }
        break;

      case AdCategory.PRIVATE_VEHICLE:
      case AdCategory.TWO_WHEELER:
        if (
          !data.vehicleType ||
          !data.manufacturerId ||
          !data.modelId ||
          !data.year ||
          !data.mileage ||
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
        // For commercial vehicles, some fields can be auto-populated
        const requiredFields = [
          'commercialVehicleType',
          'manufacturerId',
          'modelId',
          'year',
          'mileage',
          'transmissionTypeId',
          'fuelTypeId',
          'color',
        ];

        const missingFields = requiredFields.filter((field) => !data[field]);

        if (missingFields.length > 0) {
          throw new BadRequestException(
            `Commercial vehicle ads require: ${missingFields.join(', ')}`,
          );
        }

        // Check if commercial vehicle specific fields are present (either provided or auto-populated)
        if (
          !data.commercialVehicleType &&
          !data.bodyType &&
          !data.payloadCapacity
        ) {
          throw new BadRequestException(
            'Commercial vehicle ads require commercial vehicle specific fields. Please provide commercialVehicleType, bodyType, and payloadCapacity, or ensure the vehicle model has commercial vehicle metadata.',
          );
        }
        break;
    }
  }

  private async createPropertyAdFromUnified(
    data: any,
    userId: string,
  ): Promise<AdResponseDto> {
    const ad = new this.adModel({
      title: '', // No user-supplied title
      description: data.description,
      price: data.price,
      images: data.images || [],
      location: data.location,
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.PROPERTY,
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
      amenities: data.amenities || [],
    });

    await propertyAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  private async createVehicleAdFromUnified(
    data: any,
    userId: string,
  ): Promise<AdResponseDto> {
    try {
      // Fetch model name for title
      const model = await this.vehicleInventoryService.findVehicleModelById(
        data.modelId,
      );
      const modelName = model ? model.displayName || model.name : 'Vehicle';
      const year = data.year || '';
      const title = `${modelName} ${year}`.trim();

      console.log('🔍 Creating vehicle ad with title:', title);

      // Create the main ad document first
      const ad = new this.adModel({
        title,
        description: data.description,
        price: data.price,
        images: data.images || [],
        location: data.location,
        postedBy: new Types.ObjectId(userId),
        category: AdCategory.PRIVATE_VEHICLE,
      });

      console.log('💾 Saving main ad document...');
      const savedAd = await ad.save();
      console.log('✅ Main ad saved with ID:', savedAd._id);

      // Create the vehicle-specific details
      const vehicleAd = new this.vehicleAdModel({
        ad: savedAd._id as Types.ObjectId,
        vehicleType: data.vehicleType,
        manufacturerId: new Types.ObjectId(data.manufacturerId),
        modelId: new Types.ObjectId(data.modelId),
        variantId: data.variantId ? new Types.ObjectId(data.variantId) : undefined,
        year: data.year,
        mileage: data.mileage,
        transmissionTypeId: new Types.ObjectId(data.transmissionTypeId),
        fuelTypeId: new Types.ObjectId(data.fuelTypeId),
        color: data.color,
        isFirstOwner: data.isFirstOwner || false,
        hasInsurance: data.hasInsurance || false,
        hasRcBook: data.hasRcBook || false,
        additionalFeatures: data.additionalFeatures || [],
      });

      console.log('💾 Saving vehicle details...');
      await vehicleAd.save();
      console.log('✅ Vehicle details saved');

      // Verify the ad exists in the main collection
      const verifyAd = await this.adModel.findById(savedAd._id);
      if (!verifyAd) {
        throw new Error('Ad was not properly saved to the main collection');
      }
      console.log('✅ Ad verified in main collection');

      // Return the created ad
      const result = await this.findOne((savedAd._id as Types.ObjectId).toString());
      console.log('✅ Ad creation completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Error creating vehicle ad:', error);
      throw error;
    }
  }

  private async createCommercialVehicleAdFromUnified(
    data: any,
    userId: string,
  ): Promise<AdResponseDto> {
    await this.validateVehicleInventoryReferences(data);
    // Fetch model name for title
    const model = await this.vehicleInventoryService.findVehicleModelById(
      data.modelId,
    );
    const modelName = model ? model.displayName || model.name : 'Vehicle';
    const year = data.year || '';
    const title = `${modelName} ${year}`.trim();

    const ad = new this.adModel({
      title,
      description: data.description,
      price: data.price,
      images: data.images || [],
      location: data.location,
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.COMMERCIAL_VEHICLE,
    });

    const savedAd = await ad.save();

    const commercialVehicleAd = new this.commercialVehicleAdModel({
      ad: savedAd._id as any,
      commercialVehicleType: data.commercialVehicleType,
      bodyType: data.bodyType,
      manufacturerId: data.manufacturerId,
      modelId: data.modelId,
      variantId: data.variantId,
      year: data.year,
      mileage: data.mileage,
      payloadCapacity: data.payloadCapacity,
      payloadUnit: data.payloadUnit,
      axleCount: data.axleCount,
      transmissionTypeId: data.transmissionTypeId,
      fuelTypeId: data.fuelTypeId,
      color: data.color,
      hasInsurance: data.hasInsurance,
      hasFitness: data.hasFitness,
      hasPermit: data.hasPermit,
      additionalFeatures: data.additionalFeatures || [],
      seatingCapacity: data.seatingCapacity,
    });

    await commercialVehicleAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  private async createTwoWheelerAdFromUnified(
    data: any,
    userId: string,
  ): Promise<AdResponseDto> {
    // Fetch model name for title
    const model = await this.vehicleInventoryService.findVehicleModelById(
      data.modelId,
    );
    const modelName = model ? model.displayName || model.name : 'Vehicle';
    const year = data.year || '';
    const title = `${modelName} ${year}`.trim();

    const ad = new this.adModel({
      title,
      description: data.description,
      price: data.price,
      images: data.images || [],
      location: data.location,
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.TWO_WHEELER,
    });

    const savedAd = await ad.save();

    const vehicleAd = new this.vehicleAdModel({
      ad: savedAd._id as any,
      vehicleType: data.vehicleType,
      manufacturerId: data.manufacturerId,
      modelId: data.modelId,
      variantId: data.variantId,
      year: data.year,
      mileage: data.mileage,
      transmissionTypeId: data.transmissionTypeId,
      fuelTypeId: data.fuelTypeId,
      color: data.color,
      isFirstOwner: data.isFirstOwner,
      hasInsurance: data.hasInsurance,
      hasRcBook: data.hasRcBook,
      additionalFeatures: data.additionalFeatures || [],
    });

    await vehicleAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  async update(
    id: string,
    updateDto: any,
    userId: string,
  ): Promise<AdResponseDto> {
    const ad = await this.adModel.findOne({ _id: id, postedBy: userId });

    if (!ad) {
      throw new NotFoundException(
        `Advertisement with ID ${id} not found or you don't have permission to update it`,
      );
    }

    // Update base ad properties
    Object.assign(ad, updateDto);
    await ad.save();

    // Update specific ad type properties based on category
    switch (ad.category) {
      case AdCategory.PROPERTY:
        await this.updatePropertyAd(id, updateDto);
        break;
      case AdCategory.PRIVATE_VEHICLE:
        await this.updateVehicleAd(id, updateDto);
        break;
      case AdCategory.COMMERCIAL_VEHICLE:
        await this.updateCommercialVehicleAd(id, updateDto);
        break;
    }

    // Invalidate cache after updating ad
    await this.invalidateAdCache(id);

    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ad = await this.adModel.findOne({ _id: id, postedBy: userId });

    if (!ad) {
      throw new NotFoundException(
        `Advertisement with ID ${id} not found or you don't have permission to delete it`,
      );
    }

    await this.adModel.findByIdAndDelete(id);

    // Invalidate cache after deleting ad
    await this.invalidateAdCache(id);
  }

  private async validateVehicleInventoryReferences(
    createDto: any,
  ): Promise<void> {
    try {
      // Extract the required fields regardless of DTO type
      const manufacturerId = createDto.manufacturerId;
      const modelId = createDto.modelId;
      const variantId = createDto.variantId;
      const transmissionTypeId = createDto.transmissionTypeId;
      const fuelTypeId = createDto.fuelTypeId;

      if (!manufacturerId || !modelId || !transmissionTypeId || !fuelTypeId) {
        throw new BadRequestException(
          'Missing required vehicle inventory references',
        );
      }

      // Validate manufacturer exists
      await this.vehicleInventoryService.findManufacturerById(manufacturerId);

      // Validate model exists
      await this.vehicleInventoryService.findVehicleModelById(modelId);

      // Validate variant exists if provided
      if (variantId) {
        await this.vehicleInventoryService.findVehicleVariantById(variantId);
      }

      // Validate transmission type exists
      await this.vehicleInventoryService.findTransmissionTypeById(
        transmissionTypeId,
      );

      // Validate fuel type exists
      await this.vehicleInventoryService.findFuelTypeById(fuelTypeId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Invalid vehicle inventory reference: ${errorMessage}`,
      );
    }
  }

  private mapToResponseDto(ad: any): DetailedAdResponseDto {
    return {
      id: (ad._id as any).toString(),
      description: ad.description,
      price: ad.price,
      images: ad.images,
      location: ad.location,
      category: ad.category,
      isActive: ad.isActive,
      postedAt: ad.createdAt, // Map createdAt to postedAt for API consistency
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy,
      user: ad.user
        ? {
            id: (ad.user._id as any).toString(),
            name: ad.user.name,
            email: ad.user.email,
            phone: ad.user.phone,
          }
        : undefined,
      // Include vehicle details
      vehicleDetails: ad.vehicleDetails || [],
      commercialVehicleDetails: ad.commercialVehicleDetails || [],
      propertyDetails: ad.propertyDetails || [],
    };
  }

  private async updatePropertyAd(id: string, updateDto: any): Promise<void> {
    const propertyAd = await this.propertyAdModel.findOne({ ad: id });
    if (propertyAd) {
      Object.assign(propertyAd, updateDto);
      await propertyAd.save();
    }
  }

  private async updateVehicleAd(id: string, updateDto: any): Promise<void> {
    const vehicleAd = await this.vehicleAdModel.findOne({ ad: id });
    if (vehicleAd) {
      Object.assign(vehicleAd, updateDto);
      await vehicleAd.save();
    }
  }

  private async updateCommercialVehicleAd(
    id: string,
    updateDto: any,
  ): Promise<void> {
    const commercialVehicleAd = await this.commercialVehicleAdModel.findOne({
      ad: id,
    });
    if (commercialVehicleAd) {
      Object.assign(commercialVehicleAd, updateDto);
      await commercialVehicleAd.save();
    }
  }
}
