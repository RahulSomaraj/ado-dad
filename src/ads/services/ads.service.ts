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
    // Fire-and-forget; logs on failure
    this.createIndexes();
  }

  /** ---------- INDEXES ---------- */
  private async createIndexes(): Promise<void> {
    try {
      // Main ads collection
      await this.adModel.collection.createIndex(
        { isActive: 1, category: 1, createdAt: -1 },
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
      await this.adModel.collection.createIndex(
        { title: 'text', description: 'text' },
        { background: true },
      );

      // Property subdocs
      await this.propertyAdModel.collection.createIndex(
        { ad: 1, propertyType: 1, bedrooms: 1, bathrooms: 1 },
        { background: true },
      );

      // Vehicle subdocs
      await this.vehicleAdModel.collection.createIndex(
        { ad: 1, vehicleType: 1, manufacturerId: 1, modelId: 1 },
        { background: true },
      );

      // Commercial vehicle subdocs
      await this.commercialVehicleAdModel.collection.createIndex(
        { ad: 1, manufacturerId: 1, modelId: 1, year: 1 },
        { background: true },
      );

      // Nice ✨
      // eslint-disable-next-line no-console
      console.log('✅ Database indexes created successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error creating indexes:', error);
    }
  }

  /** ---------- HELPERS ---------- */
  private toObjectId(id?: string) {
    try {
      return id ? new Types.ObjectId(id) : undefined;
    } catch {
      return undefined;
    }
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

  /** ---------- FIND ALL (OPTIMIZED) ---------- */
  async findAll(filters: FilterAdDto): Promise<PaginatedDetailedAdResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
    } = filters;

    const sortDirection = sortOrder === 'ASC' ? 1 : -1;

    // 1) Root match
    const rootMatch: any = { isActive: filters.isActive ?? true };
    if (filters.category) rootMatch.category = filters.category;
    if (filters.location) {
      rootMatch.location = { $regex: filters.location, $options: 'i' };
    }
    if (filters.minPrice != null || filters.maxPrice != null) {
      rootMatch.price = {};
      if (filters.minPrice != null) rootMatch.price.$gte = filters.minPrice;
      if (filters.maxPrice != null) rootMatch.price.$lte = filters.maxPrice;
    }
    if (filters.postedBy) {
      const postedBy = this.toObjectId(filters.postedBy);
      if (postedBy) rootMatch.postedBy = postedBy;
    }

    const textMatch = search ? { $text: { $search: search } } : undefined;

    // 2) Which lookups are needed?
    const needsUser = true;

    const needsProperty = !!(
      filters.propertyType ||
      filters.minBedrooms != null ||
      filters.maxBedrooms != null ||
      filters.minBathrooms != null ||
      filters.maxBathrooms != null ||
      filters.minArea != null ||
      filters.maxArea != null ||
      filters.isFurnished !== undefined ||
      filters.hasParking !== undefined ||
      filters.hasGarden !== undefined
    );

    const hasVehicleishFilter = !!(
      filters.vehicleType ||
      filters.manufacturerId ||
      filters.modelId ||
      filters.variantId ||
      filters.transmissionTypeId ||
      filters.fuelTypeId ||
      filters.color ||
      filters.maxMileage !== undefined ||
      filters.isFirstOwner !== undefined ||
      filters.hasInsurance !== undefined ||
      filters.hasRcBook !== undefined ||
      filters.minYear != null ||
      filters.maxYear != null
    );

    const hasCommercialishFilter = !!(
      filters.commercialVehicleType ||
      filters.bodyType ||
      filters.minPayloadCapacity != null ||
      filters.maxPayloadCapacity != null ||
      filters.axleCount != null ||
      filters.hasFitness !== undefined ||
      filters.hasPermit !== undefined ||
      filters.minSeatingCapacity != null ||
      filters.maxSeatingCapacity != null ||
      filters.manufacturerId ||
      filters.modelId ||
      filters.variantId ||
      filters.transmissionTypeId ||
      filters.fuelTypeId ||
      filters.color ||
      filters.minYear != null ||
      filters.maxYear != null ||
      filters.maxMileage !== undefined
    );

    const category = filters.category;
    const doVehicleLookup =
      category === AdCategory.PRIVATE_VEHICLE ||
      category === AdCategory.TWO_WHEELER ||
      (!category && (hasVehicleishFilter || hasCommercialishFilter));
    const doCommercialLookup =
      category === AdCategory.COMMERCIAL_VEHICLE ||
      (!category && (hasVehicleishFilter || hasCommercialishFilter));
    const doPropertyLookup =
      category === AdCategory.PROPERTY || (!category && needsProperty);

    // 3) Identity filters (cross-category)
    const manufacturerIdsObj = this.toObjectIdArray(filters.manufacturerId);
    const modelIdsObj = this.toObjectIdArray(filters.modelId);
    const variantIdObj = this.toObjectId(filters.variantId);

    const identityObj: any = {};
    if (manufacturerIdsObj)
      identityObj.manufacturerId = { $in: manufacturerIdsObj };
    if (modelIdsObj) identityObj.modelId = { $in: modelIdsObj };
    if (variantIdObj) identityObj.variantId = variantIdObj;

    const hasIdentityFilter = !!this.nonEmpty(identityObj);
    const appliedCrossCategoryIdentityFilter = !category && hasIdentityFilter;

    // 4) Subdoc matchers
    const vehicleMatch: any = {};
    if (filters.vehicleType) vehicleMatch.vehicleType = filters.vehicleType;
    if (!appliedCrossCategoryIdentityFilter) {
      if (manufacturerIdsObj)
        vehicleMatch.manufacturerId = { $in: manufacturerIdsObj };
      if (modelIdsObj) vehicleMatch.modelId = { $in: modelIdsObj };
      if (variantIdObj) vehicleMatch.variantId = variantIdObj;
    }
    if (filters.transmissionTypeId) {
      const t = this.toObjectId(filters.transmissionTypeId);
      if (t) vehicleMatch.transmissionTypeId = t;
    }
    if (filters.fuelTypeId) {
      const f = this.toObjectId(filters.fuelTypeId);
      if (f) vehicleMatch.fuelTypeId = f;
    }
    if (filters.color)
      vehicleMatch.color = { $regex: filters.color, $options: 'i' };
    if (filters.maxMileage != null)
      vehicleMatch.mileage = { $lte: filters.maxMileage };
    if (filters.isFirstOwner != null)
      vehicleMatch.isFirstOwner = filters.isFirstOwner;
    if (filters.hasInsurance != null)
      vehicleMatch.hasInsurance = filters.hasInsurance;
    if (filters.hasRcBook != null) vehicleMatch.hasRcBook = filters.hasRcBook;
    if (filters.minYear != null || filters.maxYear != null) {
      vehicleMatch.year = {};
      if (filters.minYear != null)
        vehicleMatch.year.$gte = Number(filters.minYear);
      if (filters.maxYear != null)
        vehicleMatch.year.$lte = Number(filters.maxYear);
    }

    const commercialMatch: any = {};
    if (filters.commercialVehicleType)
      commercialMatch.commercialVehicleType = filters.commercialVehicleType;
    if (filters.bodyType) commercialMatch.bodyType = filters.bodyType;
    if (!appliedCrossCategoryIdentityFilter) {
      if (manufacturerIdsObj)
        commercialMatch.manufacturerId = { $in: manufacturerIdsObj };
      if (modelIdsObj) commercialMatch.modelId = { $in: modelIdsObj };
      if (variantIdObj) commercialMatch.variantId = variantIdObj;
    }
    if (filters.transmissionTypeId) {
      const t = this.toObjectId(filters.transmissionTypeId);
      if (t) commercialMatch.transmissionTypeId = t;
    }
    if (filters.fuelTypeId) {
      const f = this.toObjectId(filters.fuelTypeId);
      if (f) commercialMatch.fuelTypeId = f;
    }
    if (filters.color)
      commercialMatch.color = { $regex: filters.color, $options: 'i' };
    if (filters.maxMileage != null)
      commercialMatch.mileage = { $lte: filters.maxMileage };
    if (
      filters.minPayloadCapacity != null ||
      filters.maxPayloadCapacity != null
    ) {
      commercialMatch.payloadCapacity = {};
      if (filters.minPayloadCapacity != null)
        commercialMatch.payloadCapacity.$gte = filters.minPayloadCapacity;
      if (filters.maxPayloadCapacity != null)
        commercialMatch.payloadCapacity.$lte = filters.maxPayloadCapacity;
    }
    if (filters.axleCount != null)
      commercialMatch.axleCount = filters.axleCount;
    if (filters.hasFitness != null)
      commercialMatch.hasFitness = filters.hasFitness;
    if (filters.hasPermit != null)
      commercialMatch.hasPermit = filters.hasPermit;
    if (
      filters.minSeatingCapacity != null ||
      filters.maxSeatingCapacity != null
    ) {
      commercialMatch.seatingCapacity = {};
      if (filters.minSeatingCapacity != null)
        commercialMatch.seatingCapacity.$gte = filters.minSeatingCapacity;
      if (filters.maxSeatingCapacity != null)
        commercialMatch.seatingCapacity.$lte = filters.maxSeatingCapacity;
    }
    if (filters.minYear != null || filters.maxYear != null) {
      commercialMatch.year = {};
      if (filters.minYear != null)
        commercialMatch.year.$gte = Number(filters.minYear);
      if (filters.maxYear != null)
        commercialMatch.year.$lte = Number(filters.maxYear);
    }

    const propertyMatch: any = {};
    if (filters.propertyType) propertyMatch.propertyType = filters.propertyType;
    if (filters.minBedrooms != null || filters.maxBedrooms != null) {
      propertyMatch.bedrooms = {};
      if (filters.minBedrooms != null)
        propertyMatch.bedrooms.$gte = filters.minBedrooms;
      if (filters.maxBedrooms != null)
        propertyMatch.bedrooms.$lte = filters.maxBedrooms;
    }
    if (filters.minBathrooms != null || filters.maxBathrooms != null) {
      propertyMatch.bathrooms = {};
      if (filters.minBathrooms != null)
        propertyMatch.bathrooms.$gte = filters.minBathrooms;
      if (filters.maxBathrooms != null)
        propertyMatch.bathrooms.$lte = filters.maxBathrooms;
    }
    if (filters.minArea != null || filters.maxArea != null) {
      propertyMatch.areaSqft = {};
      if (filters.minArea != null)
        propertyMatch.areaSqft.$gte = filters.minArea;
      if (filters.maxArea != null)
        propertyMatch.areaSqft.$lte = filters.maxArea;
    }
    if (filters.isFurnished != null)
      propertyMatch.isFurnished = filters.isFurnished;
    if (filters.hasParking != null)
      propertyMatch.hasParking = filters.hasParking;
    if (filters.hasGarden != null) propertyMatch.hasGarden = filters.hasGarden;

    // 5) Pipeline
    const pipeline: any[] = [];
    if (textMatch) pipeline.push({ $match: textMatch });
    pipeline.push({ $match: rootMatch });

    if (needsUser) {
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
    }

    if (doPropertyLookup) {
      pipeline.push({
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      });
    }

    if (doVehicleLookup) {
      pipeline.push({
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      });
    }

    if (doCommercialLookup) {
      pipeline.push({
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails',
        },
      });
    }

    if (category === AdCategory.COMMERCIAL_VEHICLE) {
      pipeline.push({ $match: { commercialVehicleDetails: { $ne: [] } } });
    }

    if (appliedCrossCategoryIdentityFilter) {
      const orConditions: any[] = [];
      if (doVehicleLookup)
        orConditions.push({ vehicleDetails: { $elemMatch: identityObj } });
      if (doCommercialLookup)
        orConditions.push({
          commercialVehicleDetails: { $elemMatch: identityObj },
        });
      if (orConditions.length) pipeline.push({ $match: { $or: orConditions } });
    }

    if (
      !appliedCrossCategoryIdentityFilter &&
      this.nonEmpty(vehicleMatch) &&
      doVehicleLookup
    ) {
      pipeline.push({
        $match: { vehicleDetails: { $elemMatch: vehicleMatch } },
      });
    }

    if (
      !appliedCrossCategoryIdentityFilter &&
      this.nonEmpty(commercialMatch) &&
      doCommercialLookup
    ) {
      pipeline.push({
        $match: { commercialVehicleDetails: { $elemMatch: commercialMatch } },
      });
    }

    if (this.nonEmpty(propertyMatch) && doPropertyLookup) {
      pipeline.push({
        $match: { propertyDetails: { $elemMatch: propertyMatch } },
      });
    }

    // Sorting + pagination (+ optional text score)
    if (search && sortBy === 'textScore') {
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
    }
    const sortStage =
      search && sortBy === 'textScore'
        ? { score: { $meta: 'textScore' } }
        : { [sortBy]: sortDirection };

    pipeline.push({
      $facet: {
        data: [
          { $sort: sortStage },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const result = await this.adModel.aggregate(pipeline);
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

    return {
      data: dtoData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  /** ---------- FIND ONE ---------- */
  async findOne(id: string): Promise<AdResponseDto> {
    const pipeline = [
      { $match: { _id: new Types.ObjectId(id) } },
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

    const cacheKeys = ids.map((id) => `ads:getById:${id}`);
    const cachedResults = await Promise.all(
      cacheKeys.map((key) =>
        this.redisService.cacheGet<DetailedAdResponseDto>(key),
      ),
    );

    const uncachedIds = ids.filter((_, i) => !cachedResults[i]);
    const cachedAds = cachedResults.filter(Boolean) as DetailedAdResponseDto[];

    if (uncachedIds.length === 0) {
      return cachedAds.map((ad) => this.mapToResponseDto(ad));
    }

    const objectIds = uncachedIds.map((x) => new Types.ObjectId(x));
    const uncachedAds = await this.adModel
      .find({ _id: { $in: objectIds } })
      .populate('postedBy', 'name email phone')
      .exec();

    const adsToCache = uncachedAds.map((ad) => ({
      key: `ads:getById:${ad._id}`,
      data: this.mapToResponseDto(ad),
      ttl: 900,
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
  async getAdById(id: string): Promise<DetailedAdResponseDto> {
    const cacheKey = `ads:getById:${id}`;
    const cached =
      await this.redisService.cacheGet<DetailedAdResponseDto>(cacheKey);
    if (cached) return cached;

    const pipeline = [
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
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
    const detailed = this.mapToDetailedResponseDto(ad);

    if (
      ad.category === AdCategory.PRIVATE_VEHICLE ||
      ad.category === AdCategory.TWO_WHEELER ||
      ad.category === AdCategory.COMMERCIAL_VEHICLE
    ) {
      await this.populateVehicleInventoryDetails(detailed);
    }

    await this.redisService.cacheSet(cacheKey, detailed, 900);
    return detailed;
  }

  /** ---------- CREATE (unified) ---------- */
  async createAd(
    createDto: CreateAdDto,
    userId: string,
  ): Promise<AdResponseDto> {
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

    await this.invalidateAdCache();
    return result;
  }

  private validateRequiredFields(createDto: CreateAdDto): void {
    const { category, data } = createDto;

    if (!data?.description || data.price == null || !data.location) {
      throw new BadRequestException(
        'Description, price, and location are required for all ad types',
      );
    }

    switch (category) {
      case AdCategory.PROPERTY:
        if (
          !data.propertyType ||
          data.bedrooms == null ||
          data.bathrooms == null ||
          data.areaSqft == null
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
  ): Promise<AdResponseDto> {
    const ad = new this.adModel({
      title: '',
      description: data.description,
      price: data.price,
      images: data.images ?? [],
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
      amenities: data.amenities ?? [],
    });
    await propertyAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  private async createVehicleAdFromUnified(
    data: any,
    userId: string,
  ): Promise<AdResponseDto> {
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
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.PRIVATE_VEHICLE,
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
  ): Promise<AdResponseDto> {
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
        postedBy: new Types.ObjectId(userId),
        category: AdCategory.COMMERCIAL_VEHICLE,
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
  ): Promise<AdResponseDto> {
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
      postedBy: new Types.ObjectId(userId),
      category: AdCategory.TWO_WHEELER,
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
  ): Promise<AdResponseDto> {
    const ad = await this.adModel.findOne({ _id: id, postedBy: userId });
    if (!ad) {
      throw new NotFoundException(
        `Advertisement with ID ${id} not found or you don't have permission to update it`,
      );
    }

    Object.assign(ad, updateDto);
    await ad.save();

    switch (ad.category) {
      case AdCategory.PROPERTY:
        await this.updatePropertyAd(id, updateDto);
        break;
      case AdCategory.PRIVATE_VEHICLE:
      case AdCategory.TWO_WHEELER:
        await this.updateVehicleAd(id, updateDto);
        break;
      case AdCategory.COMMERCIAL_VEHICLE:
        await this.updateCommercialVehicleAd(id, updateDto);
        break;
    }

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
    await this.invalidateAdCache(id);
  }

  /** ---------- REDIS / CACHING UTILS ---------- */
  private async invalidateAdCache(adId?: string): Promise<void> {
    try {
      const keys = await this.redisService.keys('ads:findAll:*');
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
      if (adId) {
        await this.redisService.cacheDel(`ads:getById:${adId}`);
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
      category: ad.category,
      isActive: ad.isActive,
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
      vehicleDetails: ad.vehicleDetails || [],
      commercialVehicleDetails: ad.commercialVehicleDetails || [],
      propertyDetails: ad.propertyDetails || [],
    };
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
      Object.assign(doc, updateDto);
      await doc.save();
    }
  }

  private async updateVehicleAd(id: string, updateDto: any): Promise<void> {
    const doc = await this.vehicleAdModel.findOne({ ad: id });
    if (doc) {
      Object.assign(doc, updateDto);
      await doc.save();
    }
  }

  private async updateCommercialVehicleAd(
    id: string,
    updateDto: any,
  ): Promise<void> {
    const doc = await this.commercialVehicleAdModel.findOne({ ad: id });
    if (doc) {
      Object.assign(doc, updateDto);
      await doc.save();
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
