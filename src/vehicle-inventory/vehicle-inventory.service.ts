import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PipelineStage, SortOrder } from 'mongoose';
import {
  VehicleModel,
  VehicleModelDocument,
} from './schemas/vehicle-model.schema';
import {
  VehicleVariant,
  VehicleVariantDocument,
} from './schemas/vehicle-variant.schema';
import { FuelType, FuelTypeDocument } from './schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeDocument,
} from './schemas/transmission-type.schema';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { FilterVehicleModelDto } from './dto/filter-vehicle-model.dto';
import { FilterVehicleVariantDto } from './dto/filter-vehicle-variant.dto';
import { RedisService } from '../shared/redis.service';
import { ManufacturersService } from './manufacturers.service';
import { PaginatedVehicleModelResponseDto } from './dto/vehicle-model-response.dto';
import { PaginatedVehicleVariantResponseDto } from './dto/vehicle-variant-response.dto';
import { parseFile } from 'src/utils/file-parser.util';
import { Manufacturer, ManufacturerDocument } from './schemas/manufacturer.schema';
import { resolveHttpAuthSchemeConfig } from '@aws-sdk/client-ses/dist-types/auth/httpAuthSchemeProvider';

@Injectable()
export class VehicleInventoryService {
  private static readonly CACHE_TTL = {
    LIST_SHORT: 180, // 3 minutes (frequent UI queries)
    LIST_MED: 300, // 5 minutes
    LOOKUPS: 600, // 10 minutes
  } as const;

  private cacheVersion = 1; // bump to invalidate broadly

  constructor(
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<ManufacturerDocument>,
    @InjectModel(VehicleModel.name)
    private readonly vehicleModelModel: Model<VehicleModelDocument>,
    @InjectModel(VehicleVariant.name)
    private readonly vehicleVariantModel: Model<VehicleVariantDocument>,
    @InjectModel(FuelType.name)
    private readonly fuelTypeModel: Model<FuelTypeDocument>,
    @InjectModel(TransmissionType.name)
    private readonly transmissionTypeModel: Model<TransmissionTypeDocument>,
    private readonly redisService: RedisService,
    private readonly manufacturersService: ManufacturersService,
  ) {}

  // ---- helpers ------------------------------------------------------------
  private key(parts: Record<string, unknown>): string {
    const norm = Object.keys(parts)
      .filter(
        (k) => parts[k] !== undefined && parts[k] !== null && parts[k] !== '',
      )
      .sort()
      .map((k) => `${k}=${JSON.stringify(parts[k])}`)
      .join('&');
    return `v${this.cacheVersion}:${norm}`;
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

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }
    return new Types.ObjectId(id);
  }

  private async invalidateInventoryCaches(): Promise<void> {
    try {
      this.cacheVersion++; // coarse global bust
      const patterns = ['vi:models:*', 'vi:variants:*', 'vi:lookups:*'];
      for (const p of patterns) {
        const keys = await this.redisService.keys(p);
        if (keys?.length)
          await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch {
      // non-fatal
    }
  }

  // Vehicle Model methods
  async createVehicleModel(
    createVehicleModelDto: CreateVehicleModelDto,
  ): Promise<VehicleModel> {
    try {
      const vehicleModel = new this.vehicleModelModel(createVehicleModelDto);
      return await vehicleModel.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        throw new BadRequestException(
          `Vehicle model with ${field} '${error.keyValue[field]}' already exists`,
        );
      }
      if (error.name === 'ValidationError') {
        // Mongoose validation error
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message,
        );
        throw new BadRequestException(
          `Validation failed: ${validationErrors.join(', ')}`,
        );
      }
      throw error;
    }
  }

  async findAllVehicleModels(manufacturerId?: string): Promise<VehicleModel[]> {
    const filter: any = { isActive: true, isDeleted: false };
    if (manufacturerId) {
      filter.manufacturer = manufacturerId;
    }

    console.log('🔍 Simple findAllVehicleModels filter:', filter);

    const cacheKey = `vi:models:simple:${manufacturerId || 'all'}`;
    const cached = await this.redisService.cacheGet<VehicleModel[]>(cacheKey);
    if (cached) return cached;

    const models = await this.vehicleModelModel
      .find(filter)
      .populate('manufacturer', 'name displayName logo')
      .sort({ displayName: 1 })
      .exec();

    console.log('🔍 Simple findAllVehicleModels result count:', models.length);
    await this.redisService.cacheSet(cacheKey, models, 300);
    return models;
  }

  async findVehicleModelById(id: string): Promise<VehicleModel> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid vehicle model ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    const vehicleModel = await this.vehicleModelModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .populate('manufacturer', 'name displayName logo')
      .exec();
    if (!vehicleModel) {
      throw new NotFoundException(`Vehicle model with id ${id} not found`);
    }
    return vehicleModel;
  }

  async updateVehicleModel(
    id: string,
    updateVehicleModelDto: UpdateVehicleModelDto,
  ): Promise<VehicleModel> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid vehicle model ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    try {
      const vehicleModel = await this.vehicleModelModel
        .findOneAndUpdate(
          { _id: id, isActive: true, isDeleted: false },
          { $set: updateVehicleModelDto },
          { new: true, runValidators: true },
        )
        .populate('manufacturer', 'name displayName logo')
        .exec();

      if (!vehicleModel) {
        throw new NotFoundException(`Vehicle model with id ${id} not found`);
      }

      return vehicleModel;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          'Vehicle model with this name already exists',
        );
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async findVehicleModelsWithFilters(
    filters: FilterVehicleModelDto,
  ): Promise<PaginatedVehicleModelResponseDto> {
    // cache
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
    // Bump cache key version to avoid serving older cached payloads that missed manufacturer join
    const cacheKey = `vi:models:list:v2:${JSON.stringify(normalize(filters))}`;
    const cached =
      await this.redisService.cacheGet<PaginatedVehicleModelResponseDto>(
        cacheKey,
      );
    if (cached) return cached;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt', // Changed default to createdAt for newest first
      sortOrder = 'DESC', // DESC for newest first
    } = filters;

    // Convert string parameters to numbers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Handle text search first (must be the first stage if present)
    if (filters.search && filters.search.trim()) {
      pipeline.push({
        $match: {
          $text: { $search: filters.search },
        },
      });
    }

    // Add basic filters
    const matchStage: any = { isDeleted: false };
    if (!filters.includeInactive) {
      matchStage.isActive = true;
    }

    if (filters.manufacturerId) {
      matchStage.manufacturer = new Types.ObjectId(filters.manufacturerId);
    }

    if (filters.vehicleType) {
      matchStage.vehicleType = filters.vehicleType;
    }

    if (filters.segment && filters.segment.trim() !== '') {
      matchStage.segment = { $regex: filters.segment, $options: 'i' };
    }

    if (filters.bodyType && filters.bodyType.trim() !== '') {
      matchStage.bodyType = { $regex: filters.bodyType, $options: 'i' };
    }

    if (filters.minLaunchYear !== undefined) {
      matchStage.launchYear = {
        ...matchStage.launchYear,
        $gte: filters.minLaunchYear,
      };
    }

    if (filters.maxLaunchYear !== undefined) {
      matchStage.launchYear = {
        ...matchStage.launchYear,
        $lte: filters.maxLaunchYear,
      };
    }

    if (filters.isActive !== undefined) {
      matchStage.isActive = filters.isActive;
    }

    pipeline.push({ $match: matchStage });

    // Normalize manufacturer to ObjectId so the lookup always works
    pipeline.push({
      $addFields: {
        manufacturer: {
          $cond: [
            { $eq: [{ $type: '$manufacturer' }, 'string'] }, // if it's a string
            { $toObjectId: '$manufacturer' },                // convert to ObjectId
            '$manufacturer',                                // otherwise leave as-is
          ],
        },
      },
    });


    // Add manufacturer lookup
    pipeline.push({
      $lookup: {
        from: 'manufacturers',
        localField: 'manufacturer',
        foreignField: '_id',
        as: 'manufacturer',
      },
    });

    pipeline.push({
      $unwind: { path: '$manufacturer', preserveNullAndEmptyArrays: true },
    });

    // Add manufacturer filters
    const manufacturerMatchStage: any = {};

    if (filters.manufacturerName && filters.manufacturerName.trim() !== '') {
      manufacturerMatchStage['manufacturer.name'] = {
        $regex: filters.manufacturerName,
        $options: 'i',
      };
    }

    if (
      filters.manufacturerCountry &&
      filters.manufacturerCountry.trim() !== ''
    ) {
      manufacturerMatchStage['manufacturer.originCountry'] = {
        $regex: filters.manufacturerCountry,
        $options: 'i',
      };
    }

    if (filters.manufacturerCategory) {
      // Note: Manufacturer category filtering is now handled by ManufacturersService
      // This would need to be implemented as a separate lookup or moved to a different approach
      console.warn(
        'Manufacturer category filtering is deprecated in VehicleInventoryService',
      );
    }

    if (filters.manufacturerRegion) {
      // Note: Manufacturer region filtering is now handled by ManufacturersService
      // This would need to be implemented as a separate lookup or moved to a different approach
      console.warn(
        'Manufacturer region filtering is deprecated in VehicleInventoryService',
      );
    }

    if (Object.keys(manufacturerMatchStage).length > 0) {
      pipeline.push({ $match: manufacturerMatchStage });
    }

    // Add variant lookup for advanced filtering
    pipeline.push({
      $lookup: {
        from: 'vehiclevariants',
        localField: '_id',
        foreignField: 'vehicleModel',
        as: 'variants',
      },
    });

    // Add fuel type lookup
    pipeline.push({
      $lookup: {
        from: 'fueltypes',
        localField: 'variants.fuelType',
        foreignField: '_id',
        as: 'fuelTypes',
      },
    });

    // Add transmission type lookup
    pipeline.push({
      $lookup: {
        from: 'transmissiontypes',
        localField: 'variants.transmissionType',
        foreignField: '_id',
        as: 'transmissionTypes',
      },
    });

    // Add variant-based filters ONLY if there are actual filters to apply
    const variantMatchStage: any = {};
    let hasVariantFilters = false;

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      variantMatchStage['variants.price'] = {};
      if (filters.minPrice !== undefined) {
        variantMatchStage['variants.price'].$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        variantMatchStage['variants.price'].$lte = filters.maxPrice;
      }
      hasVariantFilters = true;
    }

    if (filters.fuelType && filters.fuelType.trim() !== '') {
      variantMatchStage['fuelTypes.name'] = {
        $regex: filters.fuelType,
        $options: 'i',
      };
      hasVariantFilters = true;
    }

    if (filters.transmissionType && filters.transmissionType.trim() !== '') {
      variantMatchStage['transmissionTypes.name'] = {
        $regex: filters.transmissionType,
        $options: 'i',
      };
      hasVariantFilters = true;
    }

    if (filters.featurePackage && filters.featurePackage.trim() !== '') {
      variantMatchStage['variants.featurePackage'] = filters.featurePackage;
      hasVariantFilters = true;
    }

    if (
      filters.minSeatingCapacity !== undefined ||
      filters.maxSeatingCapacity !== undefined
    ) {
      variantMatchStage['variants.seatingCapacity'] = {};
      if (filters.minSeatingCapacity !== undefined) {
        variantMatchStage['variants.seatingCapacity'].$gte =
          filters.minSeatingCapacity;
      }
      if (filters.maxSeatingCapacity !== undefined) {
        variantMatchStage['variants.seatingCapacity'].$lte =
          filters.maxSeatingCapacity;
      }
      hasVariantFilters = true;
    }

    if (
      filters.minEngineCapacity !== undefined ||
      filters.maxEngineCapacity !== undefined
    ) {
      variantMatchStage['variants.engineSpecs.capacity'] = {};
      if (filters.minEngineCapacity !== undefined) {
        variantMatchStage['variants.engineSpecs.capacity'].$gte =
          filters.minEngineCapacity;
      }
      if (filters.maxEngineCapacity !== undefined) {
        variantMatchStage['variants.engineSpecs.capacity'].$lte =
          filters.maxEngineCapacity;
      }
      hasVariantFilters = true;
    }

    if (filters.minMileage !== undefined || filters.maxMileage !== undefined) {
      variantMatchStage['variants.performanceSpecs.mileage'] = {};
      if (filters.minMileage !== undefined) {
        variantMatchStage['variants.performanceSpecs.mileage'].$gte =
          filters.minMileage;
      }
      if (filters.maxMileage !== undefined) {
        variantMatchStage['variants.performanceSpecs.mileage'].$lte =
          filters.maxMileage;
      }
      hasVariantFilters = true;
    }

    if (filters.turbocharged !== undefined) {
      variantMatchStage['variants.engineSpecs.turbocharged'] =
        filters.turbocharged;
      hasVariantFilters = true;
    }

    // Add feature-based filters
    const featureFilters = this.getFeatureFilters(filters);
    if (Object.keys(featureFilters).length > 0) {
      Object.assign(variantMatchStage, featureFilters);
      hasVariantFilters = true;
    }

    // Only apply variant match stage if we have actual filters
    if (hasVariantFilters) {
      pipeline.push({ $match: variantMatchStage });
    }

    // Add computed fields
    pipeline.push({
      $addFields: {
        variantCount: { $size: '$variants' },
        priceRange: {
          min: { $min: '$variants.price' },
          max: { $max: '$variants.price' },
        },
        availableFuelTypes: { $setUnion: '$fuelTypes.name' },
        availableTransmissionTypes: { $setUnion: '$transmissionTypes.name' },
        // Include model-level fuel types and transmission types
        fuelTypes: { $ifNull: ['$fuelTypes', []] },
        transmissionTypes: { $ifNull: ['$transmissionTypes', []] },
      },
    });

    console.log('🔍 Variant filter check:', {
      hasVariantFilters,
      filters: {
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        fuelType: filters.fuelType,
        transmissionType: filters.transmissionType,
        featurePackage: filters.featurePackage,
        minSeatingCapacity: filters.minSeatingCapacity,
        maxSeatingCapacity: filters.maxSeatingCapacity,
        minEngineCapacity: filters.minEngineCapacity,
        maxEngineCapacity: filters.maxEngineCapacity,
        minMileage: filters.minMileage,
        maxMileage: filters.maxMileage,
        turbocharged: filters.turbocharged,
        featureFiltersCount: Object.keys(this.getFeatureFilters(filters))
          .length,
      },
    });

    // Only apply variant filter if we have actual variant-based filters
    if (hasVariantFilters) {
      console.log('🔍 Applying variant filter: variantCount > 0');
      pipeline.push({
        $match: {
          variantCount: { $gt: 0 },
        },
      });
    } else {
      console.log('🔍 No variant filters applied, including all models');
    }

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.vehicleModelModel.aggregate(countPipeline);
    const total =
      countResult.length > 0 ? (countResult[0] as { total: number }).total : 0;

    // Add sorting
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;
    let sortField = sortBy;

    // Handle nested sorting for manufacturer fields
    if (sortBy.startsWith('manufacturer.')) {
      sortField = sortBy;
    }

    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Add pagination
    pipeline.push({ $skip: (pageNum - 1) * limitNum });
    pipeline.push({ $limit: limitNum });

    // Clean up the output
    pipeline.push({
      $project: {
        variants: 0, // Remove variants array from final output
        // Keep the computed fuelTypes and transmissionTypes fields
        // Remove the lookup fuelTypes and transmissionTypes arrays
        'fuelTypes.name': 0,
        'transmissionTypes.name': 0,
      },
    });

    // Execute the main query
    const vehicleModels = await this.vehicleModelModel.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const response: PaginatedVehicleModelResponseDto = {
      data: vehicleModels,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext,
      hasPrev,
    };

    await this.redisService.cacheSet(cacheKey, response, 180);
    return response;
  }

  // ===== Cache invalidation helpers =====
  private async invalidateVehicleInventoryCache(): Promise<void> {
    try {
      const patterns = ['vi:models:*', 'vi:manufacturers:*'];
      for (const p of patterns) {
        const keys = await this.redisService.keys(p);
        if (keys?.length) {
          await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error invalidating vehicle inventory cache:', e);
    }
  }

  private getFeatureFilters(filters: FilterVehicleModelDto): any {
    const featureFilters: any = {};

    // Safety features
    if (filters.hasABS !== undefined) {
      featureFilters['variants.features.safety.abs'] = filters.hasABS;
    }
    if (filters.hasAirbags !== undefined) {
      featureFilters['variants.features.safety.driverAirbag'] = { $gt: 0 };
    }

    // Comfort features
    if (filters.hasAutomaticClimateControl !== undefined) {
      featureFilters['variants.features.comfort.automaticClimateControl'] =
        filters.hasAutomaticClimateControl;
    }
    if (filters.hasLeatherSeats !== undefined) {
      featureFilters['variants.features.comfort.leatherSeats'] =
        filters.hasLeatherSeats;
    }
    if (filters.hasCruiseControl !== undefined) {
      featureFilters['variants.features.comfort.cruiseControl'] =
        filters.hasCruiseControl;
    }
    if (filters.hasKeylessEntry !== undefined) {
      featureFilters['variants.features.comfort.keylessEntry'] =
        filters.hasKeylessEntry;
    }
    if (filters.hasPushButtonStart !== undefined) {
      featureFilters['variants.features.comfort.pushButtonStart'] =
        filters.hasPushButtonStart;
    }

    // Exterior features
    if (filters.hasSunroof !== undefined) {
      featureFilters['variants.features.exterior.sunroof'] = filters.hasSunroof;
    }
    if (filters.hasAlloyWheels !== undefined) {
      featureFilters['variants.features.exterior.alloyWheels'] =
        filters.hasAlloyWheels;
    }
    if (filters.hasLEDHeadlamps !== undefined) {
      featureFilters['variants.features.exterior.ledHeadlamps'] =
        filters.hasLEDHeadlamps;
    }

    // Technology features
    if (filters.hasTouchscreen !== undefined) {
      featureFilters['variants.features.technology.touchscreen'] =
        filters.hasTouchscreen;
    }
    if (filters.hasAndroidAuto !== undefined) {
      featureFilters['variants.features.technology.androidAuto'] =
        filters.hasAndroidAuto;
    }
    if (filters.hasAppleCarPlay !== undefined) {
      featureFilters['variants.features.technology.appleCarplay'] =
        filters.hasAppleCarPlay;
    }
    if (filters.hasNavigation !== undefined) {
      featureFilters['variants.features.technology.navigation'] =
        filters.hasNavigation;
    }
    if (filters.hasWirelessCharging !== undefined) {
      featureFilters['variants.features.technology.wirelessCharging'] =
        filters.hasWirelessCharging;
    }
    if (filters.hasBluetooth !== undefined) {
      featureFilters['variants.features.technology.bluetooth'] =
        filters.hasBluetooth;
    }
    if (filters.hasUSBCharging !== undefined) {
      featureFilters['variants.features.technology.usbCharging'] =
        filters.hasUSBCharging;
    }
    if (filters.hasAMFMRadio !== undefined) {
      featureFilters['variants.features.technology.amFmRadio'] =
        filters.hasAMFMRadio;
    }
    if (filters.hasCDPlayer !== undefined) {
      featureFilters['variants.features.technology.cdPlayer'] =
        filters.hasCDPlayer;
    }
    if (filters.hasAUXInput !== undefined) {
      featureFilters['variants.features.technology.auxInput'] =
        filters.hasAUXInput;
    }
    if (filters.hasSubwoofer !== undefined) {
      featureFilters['variants.features.technology.subwoofer'] =
        filters.hasSubwoofer;
    }
    if (filters.hasPremiumAudio !== undefined) {
      featureFilters['variants.features.technology.premiumAudio'] =
        filters.hasPremiumAudio;
    }
    if (filters.hasDigitalInstrumentCluster !== undefined) {
      featureFilters['variants.features.technology.digitalInstrumentCluster'] =
        filters.hasDigitalInstrumentCluster;
    }
    if (filters.hasHeadsUpDisplay !== undefined) {
      featureFilters['variants.features.technology.headsUpDisplay'] =
        filters.hasHeadsUpDisplay;
    }
    if (filters.hasMultiInformationDisplay !== undefined) {
      featureFilters['variants.features.technology.multiInformationDisplay'] =
        filters.hasMultiInformationDisplay;
    }
    if (filters.hasRearEntertainment !== undefined) {
      featureFilters['variants.features.technology.rearEntertainment'] =
        filters.hasRearEntertainment;
    }

    // Parking features
    if (filters.hasParkingSensors !== undefined) {
      featureFilters['variants.features.parking.parkingSensors'] =
        filters.hasParkingSensors;
    }
    if (filters.hasParkingCamera !== undefined) {
      featureFilters['variants.features.parking.parkingCamera'] =
        filters.hasParkingCamera;
    }
    if (filters.has360DegreeCamera !== undefined) {
      featureFilters['variants.features.parking.threeSixtyDegreeCamera'] =
        filters.has360DegreeCamera;
    }
    if (filters.hasAutomaticParking !== undefined) {
      featureFilters['variants.features.parking.automaticParking'] =
        filters.hasAutomaticParking;
    }

    // Performance features
    if (filters.hasSportMode !== undefined) {
      featureFilters['variants.features.performance.sportMode'] =
        filters.hasSportMode;
    }
    if (filters.hasEcoMode !== undefined) {
      featureFilters['variants.features.performance.ecoMode'] =
        filters.hasEcoMode;
    }
    if (filters.hasPaddleShifters !== undefined) {
      featureFilters['variants.features.performance.paddleShifters'] =
        filters.hasPaddleShifters;
    }
    if (filters.hasLaunchControl !== undefined) {
      featureFilters['variants.features.performance.launchControl'] =
        filters.hasLaunchControl;
    }
    if (filters.hasAdaptiveSuspension !== undefined) {
      featureFilters['variants.features.performance.adaptiveSuspension'] =
        filters.hasAdaptiveSuspension;
    }
    if (filters.hasSportSuspension !== undefined) {
      featureFilters['variants.features.performance.sportSuspension'] =
        filters.hasSportSuspension;
    }
    if (filters.hasHeightAdjustableSuspension !== undefined) {
      featureFilters[
        'variants.features.performance.heightAdjustableSuspension'
      ] = filters.hasHeightAdjustableSuspension;
    }

    // Convenience features
    if (filters.hasPowerWindows !== undefined) {
      featureFilters['variants.features.convenience.powerWindows'] =
        filters.hasPowerWindows;
    }
    if (filters.hasOneTouchUpDown !== undefined) {
      featureFilters['variants.features.convenience.oneTouchUpDown'] =
        filters.hasOneTouchUpDown;
    }
    if (filters.hasPowerSteering !== undefined) {
      featureFilters['variants.features.convenience.powerSteering'] =
        filters.hasPowerSteering;
    }
    if (filters.hasElectricPowerSteering !== undefined) {
      featureFilters['variants.features.convenience.electricPowerSteering'] =
        filters.hasElectricPowerSteering;
    }
    if (filters.hasTiltSteering !== undefined) {
      featureFilters['variants.features.convenience.tiltSteering'] =
        filters.hasTiltSteering;
    }
    if (filters.hasTelescopicSteering !== undefined) {
      featureFilters['variants.features.convenience.telescopicSteering'] =
        filters.hasTelescopicSteering;
    }
    if (filters.hasSteeringMountedControls !== undefined) {
      featureFilters['variants.features.convenience.steeringMountedControls'] =
        filters.hasSteeringMountedControls;
    }
    if (filters.hasAutoDimmingIrvm !== undefined) {
      featureFilters['variants.features.convenience.autoDimmingIrvm'] =
        filters.hasAutoDimmingIrvm;
    }
    if (filters.hasAutoFoldingIrvm !== undefined) {
      featureFilters['variants.features.convenience.autoFoldingIrvm'] =
        filters.hasAutoFoldingIrvm;
    }
    if (filters.hasVanityMirrors !== undefined) {
      featureFilters['variants.features.convenience.vanityMirrors'] =
        filters.hasVanityMirrors;
    }
    if (filters.hasCooledGloveBox !== undefined) {
      featureFilters['variants.features.convenience.cooledGloveBox'] =
        filters.hasCooledGloveBox;
    }
    if (filters.hasSunglassHolder !== undefined) {
      featureFilters['variants.features.convenience.sunglassHolder'] =
        filters.hasSunglassHolder;
    }
    if (filters.hasUmbrellaHolder !== undefined) {
      featureFilters['variants.features.convenience.umbrellaHolder'] =
        filters.hasUmbrellaHolder;
    }
    if (filters.hasBootLight !== undefined) {
      featureFilters['variants.features.convenience.bootLight'] =
        filters.hasBootLight;
    }
    if (filters.hasPuddleLamps !== undefined) {
      featureFilters['variants.features.convenience.puddleLamps'] =
        filters.hasPuddleLamps;
    }
    if (filters.hasWelcomeLight !== undefined) {
      featureFilters['variants.features.convenience.welcomeLight'] =
        filters.hasWelcomeLight;
    }
    if (filters.hasFootwellLighting !== undefined) {
      featureFilters['variants.features.convenience.footwellLighting'] =
        filters.hasFootwellLighting;
    }

    // Security features
    if (filters.hasEngineImmobilizer !== undefined) {
      featureFilters['variants.features.security.engineImmobilizer'] =
        filters.hasEngineImmobilizer;
    }
    if (filters.hasSecurityAlarm !== undefined) {
      featureFilters['variants.features.security.securityAlarm'] =
        filters.hasSecurityAlarm;
    }
    if (filters.hasPanicAlarm !== undefined) {
      featureFilters['variants.features.security.panicAlarm'] =
        filters.hasPanicAlarm;
    }
    if (filters.hasTheftAlarm !== undefined) {
      featureFilters['variants.features.security.theftAlarm'] =
        filters.hasTheftAlarm;
    }
    if (filters.hasVehicleTracking !== undefined) {
      featureFilters['variants.features.security.vehicleTracking'] =
        filters.hasVehicleTracking;
    }
    if (filters.hasGPSTracking !== undefined) {
      featureFilters['variants.features.security.gpsTracking'] =
        filters.hasGPSTracking;
    }
    if (filters.hasRemoteLocking !== undefined) {
      featureFilters['variants.features.security.remoteLocking'] =
        filters.hasRemoteLocking;
    }
    if (filters.hasRemoteUnlocking !== undefined) {
      featureFilters['variants.features.security.remoteUnlocking'] =
        filters.hasRemoteUnlocking;
    }
    if (filters.hasRemoteStart !== undefined) {
      featureFilters['variants.features.security.remoteStart'] =
        filters.hasRemoteStart;
    }
    if (filters.hasRemoteClimateControl !== undefined) {
      featureFilters['variants.features.security.remoteClimateControl'] =
        filters.hasRemoteClimateControl;
    }
    if (filters.hasGeofencing !== undefined) {
      featureFilters['variants.features.security.geofencing'] =
        filters.hasGeofencing;
    }
    if (filters.hasValetMode !== undefined) {
      featureFilters['variants.features.security.valetMode'] =
        filters.hasValetMode;
    }

    // Maintenance features
    if (filters.hasServiceReminder !== undefined) {
      featureFilters['variants.features.maintenance.serviceReminder'] =
        filters.hasServiceReminder;
    }
    if (filters.hasMaintenanceSchedule !== undefined) {
      featureFilters['variants.features.maintenance.maintenanceSchedule'] =
        filters.hasMaintenanceSchedule;
    }
    if (filters.hasDiagnosticSystem !== undefined) {
      featureFilters['variants.features.maintenance.diagnosticSystem'] =
        filters.hasDiagnosticSystem;
    }
    if (filters.hasCheckEngineLight !== undefined) {
      featureFilters['variants.features.maintenance.checkEngineLight'] =
        filters.hasCheckEngineLight;
    }
    if (filters.hasLowFuelWarning !== undefined) {
      featureFilters['variants.features.maintenance.lowFuelWarning'] =
        filters.hasLowFuelWarning;
    }
    if (filters.hasLowOilWarning !== undefined) {
      featureFilters['variants.features.maintenance.lowOilWarning'] =
        filters.hasLowOilWarning;
    }
    if (filters.hasLowTyrePressureWarning !== undefined) {
      featureFilters['variants.features.maintenance.lowTyrePressureWarning'] =
        filters.hasLowTyrePressureWarning;
    }
    if (filters.hasLowWiperFluidWarning !== undefined) {
      featureFilters['variants.features.maintenance.lowWiperFluidWarning'] =
        filters.hasLowWiperFluidWarning;
    }
    if (filters.hasBatteryWarning !== undefined) {
      featureFilters['variants.features.maintenance.batteryWarning'] =
        filters.hasBatteryWarning;
    }
    if (filters.hasDoorOpenWarning !== undefined) {
      featureFilters['variants.features.maintenance.doorOpenWarning'] =
        filters.hasDoorOpenWarning;
    }
    if (filters.hasSeatbeltWarning !== undefined) {
      featureFilters['variants.features.maintenance.seatbeltWarning'] =
        filters.hasSeatbeltWarning;
    }
    if (filters.hasHandbrakeWarning !== undefined) {
      featureFilters['variants.features.maintenance.handbrakeWarning'] =
        filters.hasHandbrakeWarning;
    }

    return featureFilters;
  }

  // Vehicle Variant methods
  async createVehicleVariant(
    createVehicleVariantDto: CreateVehicleVariantDto,
  ): Promise<VehicleVariant> {
    try {
      const vehicleVariant = new this.vehicleVariantModel(
        createVehicleVariantDto,
      );
      return await vehicleVariant.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        throw new BadRequestException(
          `Vehicle variant with ${field} '${error.keyValue[field]}' already exists`,
        );
      }
      if (error.name === 'ValidationError') {
        // Mongoose validation error
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message,
        );
        throw new BadRequestException(
          `Validation failed: ${validationErrors.join(', ')}`,
        );
      }
      throw error;
    }
  }

  async findAllVehicleVariants(
    modelId?: string | undefined,
    fuelTypeId?: string | undefined,
    transmissionTypeId?: string | undefined,
    maxPrice?: number | undefined,
  ): Promise<VehicleVariant[]> {
    console.log('findAllVehicleVariants called with:', {
      modelId,
      fuelTypeId,
      transmissionTypeId,
      maxPrice,
    });

    // Validation logs
    if (modelId) {
      console.log('Validating modelId:', modelId);
      if (!Types.ObjectId.isValid(modelId)) {
        console.error('Invalid modelId:', modelId);
        throw new BadRequestException(
          `Invalid modelId format: ${modelId}. Expected a valid MongoDB ObjectId.`,
        );
      } else if (fuelTypeId) {
        console.log('Validating fuelTypeId:', fuelTypeId);
        if (!Types.ObjectId.isValid(fuelTypeId)) {
          console.error('Invalid fuelTypeId:', fuelTypeId);
          throw new BadRequestException(
            `Invalid fuelTypeId format: ${fuelTypeId}. Expected a valid MongoDB ObjectId.`,
          );
        } else if (transmissionTypeId) {
          console.log('Validating transmissionTypeId:', transmissionTypeId);
          if (!Types.ObjectId.isValid(transmissionTypeId)) {
            console.error('Invalid transmissionTypeId:', transmissionTypeId);
            throw new BadRequestException(
              `Invalid transmissionTypeId format: ${transmissionTypeId}. Expected a valid MongoDB ObjectId.`,
            );
          }
        }
      }
    } else if (fuelTypeId) {
      console.log('Validating fuelTypeId:', fuelTypeId);
      if (!Types.ObjectId.isValid(fuelTypeId)) {
        console.error('Invalid fuelTypeId:', fuelTypeId);
        throw new BadRequestException(
          `Invalid fuelTypeId format: ${fuelTypeId}. Expected a valid MongoDB ObjectId.`,
        );
      } else if (transmissionTypeId) {
        console.log('Validating transmissionTypeId:', transmissionTypeId);
        if (!Types.ObjectId.isValid(transmissionTypeId)) {
          console.error('Invalid transmissionTypeId:', transmissionTypeId);
          throw new BadRequestException(
            `Invalid transmissionTypeId format: ${transmissionTypeId}. Expected a valid MongoDB ObjectId.`,
          );
        }
      }
    } else if (transmissionTypeId) {
      console.log('Validating transmissionTypeId:', transmissionTypeId);
      if (!Types.ObjectId.isValid(transmissionTypeId)) {
        console.error('Invalid transmissionTypeId:', transmissionTypeId);
        throw new BadRequestException(
          `Invalid transmissionTypeId format: ${transmissionTypeId}. Expected a valid MongoDB ObjectId.`,
        );
      }
    }

    const filter: any = { isActive: true, isDeleted: false };
    console.log('Initial filter:', filter);

    if (modelId) {
      filter.vehicleModel = new Types.ObjectId(modelId);
      console.log('Added modelId to filter:', filter);
    }
    if (fuelTypeId) {
      filter.fuelType = new Types.ObjectId(fuelTypeId);
      console.log('Added fuelTypeId to filter:', filter);
    }
    if (transmissionTypeId) {
      filter.transmissionType = new Types.ObjectId(transmissionTypeId);
      console.log('Added transmissionTypeId to filter:', filter);
    }
    if (typeof maxPrice === 'number') {
      filter.price = { $lte: maxPrice };
      console.log('Added maxPrice to filter:', filter);
    }

    try {
      console.log('Querying vehicleVariantModel with filter:', filter);
      const result = await this.vehicleVariantModel
        .find(filter)
        .populate('vehicleModel', 'name displayName')
        .populate('fuelType', 'name displayName')
        .populate('transmissionType', 'name displayName')
        .sort({ price: 1 })
        .exec();
      console.log('Query successful, result count:', result.length);
      return result;
    } catch (error) {
      console.error('Error during vehicleVariantModel query:', error);
      throw error;
    }
  }

  async findVehicleVariantById(id: string): Promise<VehicleVariant> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid variant ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    const vehicleVariant = await this.vehicleVariantModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .exec();
    if (!vehicleVariant) {
      throw new NotFoundException(`Vehicle variant with id ${id} not found`);
    }
    return vehicleVariant;
  }

  // Lookup methods
  async findFuelTypeById(id: string): Promise<FuelType> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid fuel type ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    const fuelType = await this.fuelTypeModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .exec();
    if (!fuelType) {
      throw new NotFoundException(`Fuel type with id ${id} not found`);
    }
    return fuelType;
  }

  async findTransmissionTypeById(id: string): Promise<TransmissionType> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid transmission type ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    const transmissionType = await this.transmissionTypeModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .exec();
    if (!transmissionType) {
      throw new NotFoundException(`Transmission type with id ${id} not found`);
    }
    return transmissionType;
  }

  // Lookup methods for fuel types and transmission types
  async getFuelTypes(): Promise<FuelType[]> {
    return this.fuelTypeModel
      .find({ isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async getTransmissionTypes(): Promise<TransmissionType[]> {
    return this.transmissionTypeModel
      .find({ isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findAllVehicleVariantsWithPagination(
    filters: FilterVehicleVariantDto,
  ): Promise<PaginatedVehicleVariantResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'price',
      sortOrder = 'ASC',
    } = filters;

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Handle text search first (must be the first stage if present)
    if (filters.search) {
      pipeline.push({
        $match: {
          $text: { $search: filters.search },
        },
      });
    }

    // Add basic filters
    const matchStage: any = { isActive: true, isDeleted: false };

    if (filters.modelId) {
      matchStage.vehicleModel = new Types.ObjectId(filters.modelId);
    }

    if (filters.fuelTypeId) {
      matchStage.fuelType = new Types.ObjectId(filters.fuelTypeId);
    }

    if (filters.transmissionTypeId) {
      matchStage.transmissionType = new Types.ObjectId(
        filters.transmissionTypeId,
      );
    }

    // Handle price range
    if (
      typeof filters.minPrice === 'number' ||
      typeof filters.maxPrice === 'number'
    ) {
      matchStage.price = {};
      if (typeof filters.minPrice === 'number') {
        matchStage.price.$gte = filters.minPrice;
      }
      if (typeof filters.maxPrice === 'number') {
        matchStage.price.$lte = filters.maxPrice;
      }
    }

    pipeline.push({ $match: matchStage });

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.vehicleVariantModel.aggregate(countPipeline);
    const total =
      countResult.length > 0 ? (countResult[0] as { total: number }).total : 0;

    // Add sorting
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortDirection } });

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Add population
    pipeline.push({
      $lookup: {
        from: 'vehiclemodels',
        localField: 'vehicleModel',
        foreignField: '_id',
        as: 'vehicleModel',
      },
    });
    pipeline.push({
      $lookup: {
        from: 'fueltypes',
        localField: 'fuelType',
        foreignField: '_id',
        as: 'fuelType',
      },
    });
    pipeline.push({
      $lookup: {
        from: 'transmissiontypes',
        localField: 'transmissionType',
        foreignField: '_id',
        as: 'transmissionType',
      },
    });

    // Unwind the arrays
    pipeline.push({
      $unwind: { path: '$vehicleModel', preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: '$fuelType', preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: '$transmissionType', preserveNullAndEmptyArrays: true },
    });

    // Project only needed fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        displayName: 1,
        price: 1,
        isActive: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
        'vehicleModel._id': 1,
        'vehicleModel.name': 1,
        'vehicleModel.displayName': 1,
        'fuelType._id': 1,
        'fuelType.name': 1,
        'fuelType.displayName': 1,
        'transmissionType._id': 1,
        'transmissionType.name': 1,
        'transmissionType.displayName': 1,
      },
    });

    // Execute the main query
    const vehicleVariants = await this.vehicleVariantModel.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: vehicleVariants,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  // Proxy methods for manufacturer operations (for backward compatibility)
  async createManufacturer(createManufacturerDto: any): Promise<any> {
    return this.manufacturersService.createManufacturer(createManufacturerDto);
  }

  async findAllManufacturers(): Promise<any[]> {
    return this.manufacturersService.findAllManufacturers();
  }

  async findManufacturerById(id: string): Promise<any> {
    return this.manufacturersService.findManufacturerById(id);
  }

  async updateManufacturer(
    id: string,
    updateManufacturerDto: any,
  ): Promise<any> {
    return this.manufacturersService.updateManufacturer(
      id,
      updateManufacturerDto,
    );
  }

  async deleteManufacturer(id: string): Promise<{ message: string }> {
    return this.manufacturersService.deleteManufacturer(id);
  }

  async findManufacturersWithFilters(filters: any): Promise<any> {
    return this.manufacturersService.findManufacturersWithFilters(filters);
  }

  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  }

  async createVehicleVariantCsv(
    buffer: Buffer,
    fileType: 'csv',
    modelId: string, // ✅ model id provided by user
  ) {
    const rows = (await parseFile(buffer, fileType)) as Record<string, any>[];

    if (!rows || rows.length === 0) {
      throw new BadRequestException('Empty or invalid CSV file');
    }

    const normalizedModelId = String(modelId);

    // --- Step 0: Validate provided modelId exists ---
    const modelDoc = await this.vehicleModelModel
      .findOne({ _id: normalizedModelId, isDeleted: false })
      .lean();

    if (!modelDoc) {
      throw new BadRequestException('Invalid vehicleModel ID provided');
    }

    // --- Step 1: Deduplicate (by name + provided modelId) ---
    const seen = new Set<string>();
    const uniqueRows: Record<string, any>[] = [];

    for (const row of rows) {
      if (!row.name) continue; // we no longer depend on row.vehicleModel

      const key = `${row.name.trim().toLowerCase()}-${normalizedModelId}`;
      if (seen.has(key)) continue;

      seen.add(key);
      uniqueRows.push(row);
    }

    if (uniqueRows.length === 0) {
      throw new BadRequestException('No valid rows found in CSV');
    }

    // --- Step 2: Validate referenced foreign keys (fuelType, transmissionType) ---
    // CSV now contains *names* like "petrol", "diesel", "cvt", "automatic_8", etc.

    const fuelTypeNames = [
      ...new Set(
        uniqueRows
          .map(r => r.fuelType)
          .filter(Boolean)
          .map(v => String(v).trim().toLowerCase()),
      ),
    ];

    const transmissionNames = [
      ...new Set(
        uniqueRows
          .map(r => r.transmissionType)
          .filter(Boolean)
          .map(v => String(v).trim().toLowerCase()),
      ),
    ];

    const validFuelTypes = await this.fuelTypeModel
      .find({ name: { $in: fuelTypeNames }, isDeleted: false })
      .lean();

    const validTransTypes = await this.transmissionTypeModel
      .find({ name: { $in: transmissionNames }, isDeleted: false })
      .lean();

    // maps keyed by lowercase `name`
    const fuelMap = new Map(
      validFuelTypes.map(f => [String(f.name).toLowerCase(), f]),
    );
    const transMap = new Map(
      validTransTypes.map(t => [String(t.name).toLowerCase(), t]),
    );

    const validVariants: any[] = [];
    const skipped: any[] = [];

    // helpers
    const parseBool = (v: any) => this.parseBoolean(v);

    const parseNumber = (v: any) =>
      v === undefined || v === null || v === '' ? undefined : Number(v);

    const parseArray = (v: any) =>
      v ? String(v).split(',').map(i => i.trim()).filter(Boolean) : [];

    // --- Step 3: Build validated variant objects ---
    for (const row of uniqueRows) {
      const fuelKey = row.fuelType
        ? String(row.fuelType).trim().toLowerCase()
        : undefined;
      const transKey = row.transmissionType
        ? String(row.transmissionType).trim().toLowerCase()
        : undefined;

      if (!fuelKey || !fuelMap.has(fuelKey)) {
        skipped.push({ row, reason: 'Invalid or missing fuelType name' });
        continue;
      }
      if (!transKey || !transMap.has(transKey)) {
        skipped.push({ row, reason: 'Invalid or missing transmissionType name' });
        continue;
      }

      const fuelDoc = fuelMap.get(fuelKey)!;
      const transDoc = transMap.get(transKey)!;

      const variant = {
        name: row.name.trim().toLowerCase(),
        displayName: row.displayName?.trim() || row.name.trim(),
        vehicleModel: normalizedModelId, // ✅ always the user-provided modelId

        // store ObjectId refs while CSV uses names
        fuelType: fuelDoc._id,
        transmissionType: transDoc._id,

        featurePackage: row.featurePackage || null,

        engineSpecs: {
          capacity: parseNumber(row.engine_capacity),
          maxPower: parseNumber(row.engine_maxPower),
          maxTorque: parseNumber(row.engine_maxTorque),
          cylinders: parseNumber(row.engine_cylinders),
          turbocharged: row.engine_turbo ? parseBool(row.engine_turbo) : false,
        },

        performanceSpecs: {
          mileage: parseNumber(row.perf_mileage),
          acceleration: parseNumber(row.perf_acceleration),
          topSpeed: parseNumber(row.perf_topSpeed),
          fuelCapacity: parseNumber(row.perf_fuelCapacity),
        },

        dimensions: {
          length: parseNumber(row.dim_length),
          width: parseNumber(row.dim_width),
          height: parseNumber(row.dim_height),
          wheelbase: parseNumber(row.dim_wheelbase),
          groundClearance: parseNumber(row.dim_groundClearance),
          bootSpace: parseNumber(row.dim_bootSpace),
        },

        seatingCapacity: parseNumber(row.seatingCapacity),
        price: parseNumber(row.price),
        exShowroomPrice: parseNumber(row.exShowroomPrice),
        onRoadPrice: parseNumber(row.onRoadPrice),

        colors: parseArray(row.colors),
        images: parseArray(row.images),

        description: row.description || '',
        brochureUrl: row.brochureUrl || '',
        videoUrl: row.videoUrl || '',

        features: row.featuresJson ? JSON.parse(row.featuresJson) : undefined,

        isActive: parseBool(row.isActive),
        isLaunched: parseBool(row.isLaunched),
        launchDate: row.launchDate || null,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      validVariants.push(variant);
    }

    // --- Step 4: Prevent duplicates already in DB for THIS model ---
    const existing = await this.vehicleVariantModel
      .find({
        name: { $in: validVariants.map(v => v.name) },
        vehicleModel: normalizedModelId, // ✅ only this model
        isDeleted: false,
      })
      .select('name vehicleModel')
      .lean();

    const existingSet = new Set(
      existing.map(v => `${v.name}-${String(v.vehicleModel)}`),
    );

    const finalInsert = validVariants.filter(v => {
      const key = `${v.name}-${v.vehicleModel}`;
      if (existingSet.has(key)) {
        skipped.push({ row: v, reason: 'Variant already exists for this model' });
        return false;
      }
      return true;
    });

    // --- Step 5: Insert ---
    let insertedDocs: any[] = [];
    if (finalInsert.length > 0) {
      insertedDocs = await this.vehicleVariantModel.insertMany(finalInsert);
    }

    return {
      totalRows: rows.length,
      uniqueRows: uniqueRows.length,
      validRows: validVariants.length,
      insertedCount: insertedDocs.length,
      skippedCount: skipped.length,

      inserted: insertedDocs.map(v => ({
        _id: v._id,
        name: v.name,
        displayName: v.displayName,
        vehicleModel: v.vehicleModel,
      })),

      skipped,
    };
  }


  async createVechicleModelUploadFromId(id:string,buffer:Buffer,fileType:'csv')
  {
    const checkManufacturer=await this.manufacturerModel.findOne({_id:id,isDeleted:false}).lean();
    if(!checkManufacturer)
    {
      throw new NotFoundException(`Manufacturer with ${id} not found`);
    }

    const rows=(await parseFile(buffer,fileType)) as Record<string,any>[];
    if(!rows || rows.length===0)
    {
      throw new BadRequestException('Empty or invalid CSV file');
    }

    const allowedFields = ["name", "displayName", "vehicleType", "description", "launchYear",
  "segment", "bodyType", "images", "brochureUrl", "isCommercialVehicle",
  "commercialVehicleType", "commercialBodyType", "defaultPayloadCapacity",
  "defaultAxleCount", "defaultPayloadUnit", "defaultSeatingCapacity",
  "fuelTypes", "transmissionTypes", "isActive"];

    const rawFields = Object.keys(rows[0]).map(f => f.trim());
    const unknownFields = rawFields.filter(f => !allowedFields.includes(f));

  if (unknownFields.length > 0) {
    throw new BadRequestException(
      `Invalid CSV field(s): ${unknownFields.join(", ")}. Allowed fields: ${allowedFields.join(", ")}`
    );
  }

    const seen=new Set<string>();
    const uniqueRows:Record<string,any>[]=[];

    for(const row of rows)
    {
      if(!row.name||typeof row.name!=='string') continue;
      
      const key=row.name.trim().toLowerCase();
      if(!key||seen.has(key)) continue;

      seen.add(key);
      uniqueRows.push(row);
    }

    const validModels:Record<string,any>[]=[];
    const skipped:any=[];

    for(const row of uniqueRows)
    {
      if(!row.name||typeof row.name!=='string')
      {
        skipped.push({row,reason:'missing or invalid model name'}); continue;
      }

      const name=row.name.trim().toLowerCase();
      if(!name)
      {
        skipped.push({row,reason:"empty model name after trimming"}); continue;
      }

      const modelDoc = {
        name,
        displayName: row.displayName?.trim() || row.name.trim(),
        manufacturer: id,
        vehicleType: row.vehicleType,
        description: row.description || '',
        launchYear: Number(row.launchYear) || null,
        segment: row.segment || '',
        bodyType: row.bodyType || '',
        images: row.images
          ? String(row.images)
              .split(',')
              .map((i) => i.trim())
              .filter(Boolean)
          : [],
        brochureUrl: row.brochureUrl || '',
        isCommercialVehicle: this.parseBoolean(row.isCommercialVehicle),
        commercialVehicleType: row.commercialVehicleType || '',
        commercialBodyType: row.commercialBodyType || '',
        defaultPayloadCapacity: Number(row.defaultPayloadCapacity) || null,
        defaultPayloadUnit: row.defaultPayloadUnit || '',
        defaultAxleCount: Number(row.defaultAxleCount) || null,
        defaultSeatingCapacity: Number(row.defaultSeatingCapacity) || null,
        fuelTypes: row.fuelTypes
          ? String(row.fuelTypes)
              .split(',')
              .map((i) => i.trim())
              .filter(Boolean)
          : [],
        transmissionTypes: row.transmissionTypes
          ? String(row.transmissionTypes)
              .split(',')
              .map((i) => i.trim())
              .filter(Boolean)
          : [],
        isActive: this.parseBoolean(row.isActive),
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      validModels.push(modelDoc);
    }

    if(validModels.length==0)
    {
      return {
        totalRows:rows.length,
        uniqueRows:uniqueRows.length,
        validRows:0,
        insertedCount:0,
        skippedCount:skipped.length,
        inserted:[],
        skipped,
      };
    }

    const existingModels=await this.vehicleModelModel.find({name:{$in:validModels.map((m)=>m.name)},
    manufacturer:id,
    isDeleted:false,
  }).select('name manufacturer').lean();

  const existingSet = new Set(
    existingModels.map(
      (m) => `${m.name.trim().toLowerCase()}-${String(m.manufacturer)}`,
    ),
  );

  const finalInsertModels=validModels.filter((m)=>{
    const key=`${m.name}-${id}`;
    if(existingSet.has(key)){
      skipped.push({
        row:m,
        reason:'Model already existsf for this manufacturer'
      });
      return false;
    }
    return true;
  })

  let insertedDocs: any[] = [];
  if (finalInsertModels.length > 0) {
    insertedDocs = await this.vehicleModelModel.insertMany(finalInsertModels);
  }

    return {
    totalRows: rows.length,
    uniqueRows: uniqueRows.length,
    validRows: validModels.length,
    insertedCount: insertedDocs.length,
    skippedCount: skipped.length,
    inserted: insertedDocs.map((m) => ({
      _id: m._id,
      name: m.name,
      displayName: m.displayName,
      manufacturer: m.manufacturer,
    })),
    skipped,
  };

  }
}
