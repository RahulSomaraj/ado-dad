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
import { UpdateVehicleVariantDto } from './dto/update-vehicle-variant.dto';
import { FilterVehicleModelDto } from './dto/filter-vehicle-model.dto';
import { FilterVehicleVariantDto } from './dto/filter-vehicle-variant.dto';
import { RedisService } from '../shared/redis.service';
import { ManufacturersService } from './manufacturers.service';
import { PaginatedVehicleModelResponseDto } from './dto/vehicle-model-response.dto';
import { PaginatedVehicleVariantResponseDto } from './dto/vehicle-variant-response.dto';
import { parseFile } from 'src/utils/file-parser.util';
import {
  Manufacturer,
  ManufacturerDocument,
} from './schemas/manufacturer.schema';
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

  // Case-insensitive prefix matcher that anchors at start or after separators
  private buildPrefixRegex(term: string): RegExp {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[\\s_\\-])${escaped}`, 'i');
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

    const cacheKey = `vi:models:simple:${manufacturerId || 'all'}`;
    const cached = await this.redisService.cacheGet<VehicleModel[]>(cacheKey);
    if (cached) return cached;

    const models = await this.vehicleModelModel
      .find(filter)
      .populate('manufacturer', 'name displayName logo')
      .sort({ displayName: 1 })
      .exec();
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
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = filters;

    const query: any = { isDeleted: false };

    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(searchTerm, 'i');
      query.$or = [{ name: regex }, { displayName: regex }];
    }

    if (filters.isActive !== undefined && filters.isActive !== null) {
      query.isActive = filters.isActive;
    }

    if (filters.manufacturerId) {
      query.manufacturer = filters.manufacturerId;
    }

    // Determine sort
    const sort: any = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'DESC' ? -1 : 1;
    }

    const [models, total] = await Promise.all([
      this.vehicleModelModel
        .find(query)
        .populate('manufacturer', 'name displayName logo')
        .collation({ locale: 'en', strength: 2 })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.vehicleModelModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response: PaginatedVehicleModelResponseDto = {
      data: models as any,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

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
      // Add dummy featurePackage if not provided
      const variantData = {
        ...createVehicleVariantDto,
        featurePackage:
          createVehicleVariantDto.featurePackage?.trim() || 'Base',
      };

      const vehicleVariant = new this.vehicleVariantModel(variantData);
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
    // Validation
    if (modelId) {
      if (!Types.ObjectId.isValid(modelId)) {
        console.error('Invalid modelId:', modelId);
        throw new BadRequestException(
          `Invalid modelId format: ${modelId}. Expected a valid MongoDB ObjectId.`,
        );
      } else if (fuelTypeId) {
        if (!Types.ObjectId.isValid(fuelTypeId)) {
          console.error('Invalid fuelTypeId:', fuelTypeId);
          throw new BadRequestException(
            `Invalid fuelTypeId format: ${fuelTypeId}. Expected a valid MongoDB ObjectId.`,
          );
        } else if (transmissionTypeId) {
          if (!Types.ObjectId.isValid(transmissionTypeId)) {
            console.error('Invalid transmissionTypeId:', transmissionTypeId);
            throw new BadRequestException(
              `Invalid transmissionTypeId format: ${transmissionTypeId}. Expected a valid MongoDB ObjectId.`,
            );
          }
        }
      }
    } else if (fuelTypeId) {
      if (!Types.ObjectId.isValid(fuelTypeId)) {
        console.error('Invalid fuelTypeId:', fuelTypeId);
        throw new BadRequestException(
          `Invalid fuelTypeId format: ${fuelTypeId}. Expected a valid MongoDB ObjectId.`,
        );
      } else if (transmissionTypeId) {
        if (!Types.ObjectId.isValid(transmissionTypeId)) {
          console.error('Invalid transmissionTypeId:', transmissionTypeId);
          throw new BadRequestException(
            `Invalid transmissionTypeId format: ${transmissionTypeId}. Expected a valid MongoDB ObjectId.`,
          );
        }
      }
    } else if (transmissionTypeId) {
      if (!Types.ObjectId.isValid(transmissionTypeId)) {
        console.error('Invalid transmissionTypeId:', transmissionTypeId);
        throw new BadRequestException(
          `Invalid transmissionTypeId format: ${transmissionTypeId}. Expected a valid MongoDB ObjectId.`,
        );
      }
    }

    const filter: any = { isActive: true, isDeleted: false };

    if (modelId) {
      filter.vehicleModel = new Types.ObjectId(modelId);
    }
    if (fuelTypeId) {
      filter.fuelType = new Types.ObjectId(fuelTypeId);
    }
    if (transmissionTypeId) {
      filter.transmissionType = new Types.ObjectId(transmissionTypeId);
    }
    if (typeof maxPrice === 'number') {
      filter.price = { $lte: maxPrice };
    }

    try {
      const result = await this.vehicleVariantModel
        .find(filter)
        .populate('vehicleModel', 'name displayName')
        .populate('fuelType', 'name displayName')
        .populate('transmissionType', 'name displayName')
        .sort({ price: 1 })
        .exec();
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

  async deleteVehicleVariant(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid vehicle variant ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    const vehicleVariant = await this.vehicleVariantModel
      .findByIdAndDelete(id)
      .exec();

    if (!vehicleVariant) {
      throw new NotFoundException(`Vehicle variant with id ${id} not found`);
    }

    return { message: 'Vehicle variant deleted successfully' };
  }

  async updateVehicleVariant(
    id: string,
    updateVehicleVariantDto: UpdateVehicleVariantDto,
  ): Promise<VehicleVariant> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid vehicle variant ID format: ${id}. Expected a valid MongoDB ObjectId.`,
      );
    }

    try {
      // Prepare update object, extracting _id from nested objects if provided
      const updateData: any = { ...updateVehicleVariantDto };

      // Handle vehicleModel - extract _id if it's an object
      if (updateData.vehicleModel) {
        if (
          typeof updateData.vehicleModel === 'object' &&
          updateData.vehicleModel._id
        ) {
          updateData.vehicleModel = updateData.vehicleModel._id;
        }
        if (!Types.ObjectId.isValid(updateData.vehicleModel)) {
          throw new BadRequestException(
            `Invalid vehicleModel ID format: ${updateData.vehicleModel}`,
          );
        }
        // Validate that the model exists
        const modelExists = await this.vehicleModelModel.findById(
          updateData.vehicleModel,
        );
        if (!modelExists) {
          throw new BadRequestException(
            `Vehicle model with id ${updateData.vehicleModel} not found`,
          );
        }
        updateData.vehicleModel = new Types.ObjectId(updateData.vehicleModel);
      }

      // Handle fuelType - extract _id if it's an object
      if (updateData.fuelType) {
        if (
          typeof updateData.fuelType === 'object' &&
          updateData.fuelType._id
        ) {
          updateData.fuelType = updateData.fuelType._id;
        }
        if (!Types.ObjectId.isValid(updateData.fuelType)) {
          throw new BadRequestException(
            `Invalid fuelType ID format: ${updateData.fuelType}`,
          );
        }
        // Validate that the fuel type exists
        const fuelExists = await this.fuelTypeModel.findById(
          updateData.fuelType,
        );
        if (!fuelExists) {
          throw new BadRequestException(
            `Fuel type with id ${updateData.fuelType} not found`,
          );
        }
        updateData.fuelType = new Types.ObjectId(updateData.fuelType);
      }

      // Handle transmissionType - extract _id if it's an object
      if (updateData.transmissionType) {
        if (
          typeof updateData.transmissionType === 'object' &&
          updateData.transmissionType._id
        ) {
          updateData.transmissionType = updateData.transmissionType._id;
        }
        if (!Types.ObjectId.isValid(updateData.transmissionType)) {
          throw new BadRequestException(
            `Invalid transmissionType ID format: ${updateData.transmissionType}`,
          );
        }
        // Validate that the transmission type exists
        const transExists = await this.transmissionTypeModel.findById(
          updateData.transmissionType,
        );
        if (!transExists) {
          throw new BadRequestException(
            `Transmission type with id ${updateData.transmissionType} not found`,
          );
        }
        updateData.transmissionType = new Types.ObjectId(
          updateData.transmissionType,
        );
      }

      const vehicleVariant = await this.vehicleVariantModel
        .findOneAndUpdate(
          { _id: id, isActive: true, isDeleted: false },
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .populate('vehicleModel', 'name displayName')
        .populate('fuelType', 'name displayName')
        .populate('transmissionType', 'name displayName')
        .exec();

      if (!vehicleVariant) {
        throw new NotFoundException(`Vehicle variant with id ${id} not found`);
      }

      return vehicleVariant;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException(
          'Vehicle variant with this name already exists',
        );
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
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
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // Ensure sortOrder is valid (safeguard in case validation didn't catch it)
    const validSortOrder =
      sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : 'DESC';

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Handle search (matches anywhere in the string, case insensitive)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(searchTerm, 'i');
      pipeline.push({
        $match: {
          $or: [{ name: regex }, { displayName: regex }],
        },
      });
    }

    // Add basic filters
    const matchStage: any = { isDeleted: false }; // isActive: true,  removed

    if (filters.modelId) {
      // Validate ObjectId format before converting
      if (!Types.ObjectId.isValid(filters.modelId)) {
        throw new BadRequestException(
          `Invalid modelId format: ${filters.modelId}. Expected a valid MongoDB ObjectId.`,
        );
      }
      // Support both ObjectId and string comparison (in case data was stored as string)
      const modelIdObj = new Types.ObjectId(filters.modelId);
      matchStage.$and = [
        { isDeleted: false }, // isActive: true, removed
        {
          $or: [
            { vehicleModel: modelIdObj },
            { vehicleModel: filters.modelId },
          ],
        },
      ];
    }

    if (filters.fuelTypeId) {
      const fuelTypeObj = new Types.ObjectId(filters.fuelTypeId);
      if (matchStage.$and) {
        matchStage.$and.push({ fuelType: fuelTypeObj });
      } else {
        matchStage.fuelType = fuelTypeObj;
      }
    }

    if (filters.transmissionTypeId) {
      const transmissionTypeObj = new Types.ObjectId(
        filters.transmissionTypeId,
      );
      if (matchStage.$and) {
        matchStage.$and.push({ transmissionType: transmissionTypeObj });
      } else {
        matchStage.transmissionType = transmissionTypeObj;
      }
    }

    // Handle price range
    if (
      typeof filters.minPrice === 'number' ||
      typeof filters.maxPrice === 'number'
    ) {
      const priceFilter: any = {};
      if (typeof filters.minPrice === 'number') {
        priceFilter.$gte = filters.minPrice;
      }
      if (typeof filters.maxPrice === 'number') {
        priceFilter.$lte = filters.maxPrice;
      }
      if (matchStage.$and) {
        matchStage.$and.push({ price: priceFilter });
      } else {
        matchStage.price = priceFilter;
      }
    }

    pipeline.push({ $match: matchStage });

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.vehicleVariantModel.aggregate(countPipeline);
    const total =
      countResult.length > 0 ? (countResult[0] as { total: number }).total : 0;

    // Add sorting
    const sortDirection = validSortOrder === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortDirection } });

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Normalize ObjectIds to ensure proper lookup matching
    pipeline.push({
      $addFields: {
        vehicleModel: {
          $cond: {
            if: { $eq: [{ $type: '$vehicleModel' }, 'string'] },
            then: { $toObjectId: '$vehicleModel' },
            else: '$vehicleModel',
          },
        },
        fuelType: {
          $cond: {
            if: { $eq: [{ $type: '$fuelType' }, 'string'] },
            then: { $toObjectId: '$fuelType' },
            else: '$fuelType',
          },
        },
        transmissionType: {
          $cond: {
            if: { $eq: [{ $type: '$transmissionType' }, 'string'] },
            then: { $toObjectId: '$transmissionType' },
            else: '$transmissionType',
          },
        },
      },
    });

    // Add population using actual collection names from models
    pipeline.push({
      $lookup: {
        from: this.vehicleModelModel.collection.name,
        localField: 'vehicleModel',
        foreignField: '_id',
        as: 'vehicleModel',
      },
    });
    pipeline.push({
      $lookup: {
        from: this.fuelTypeModel.collection.name,
        localField: 'fuelType',
        foreignField: '_id',
        as: 'fuelType',
      },
    });
    pipeline.push({
      $lookup: {
        from: this.transmissionTypeModel.collection.name,
        localField: 'transmissionType',
        foreignField: '_id',
        as: 'transmissionType',
      },
    });

    // Project only needed fields (using $arrayElemAt to get first element, returns null if array is empty)
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        displayName: 1,
        vehicleModel: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$vehicleModel', []] } }, 0] },
            then: {
              $let: {
                vars: {
                  model: { $arrayElemAt: ['$vehicleModel', 0] },
                },
                in: {
                  _id: '$$model._id',
                  name: '$$model.name',
                  displayName: '$$model.displayName',
                },
              },
            },
            else: null,
          },
        },
        fuelType: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$fuelType', []] } }, 0] },
            then: {
              $let: {
                vars: {
                  fuel: { $arrayElemAt: ['$fuelType', 0] },
                },
                in: {
                  _id: '$$fuel._id',
                  name: '$$fuel.name',
                  displayName: '$$fuel.displayName',
                },
              },
            },
            else: null,
          },
        },
        transmissionType: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$transmissionType', []] } }, 0] },
            then: {
              $let: {
                vars: {
                  transmission: { $arrayElemAt: ['$transmissionType', 0] },
                },
                in: {
                  _id: '$$transmission._id',
                  name: '$$transmission.name',
                  displayName: '$$transmission.displayName',
                },
              },
            },
            else: null,
          },
        },
        price: 1,
        engineSpecs: 1,
        performanceSpecs: 1,
        seatingCapacity: 1,
        isActive: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    // Execute the main query
    const vehicleVariants = await this.vehicleVariantModel.aggregate(pipeline);

    // Reorder fields to ensure correct order in response
    const reorderedVariants = vehicleVariants.map((variant: any) => ({
      _id: variant._id,
      name: variant.name,
      displayName: variant.displayName,
      vehicleModel: variant.vehicleModel,
      fuelType: variant.fuelType,
      transmissionType: variant.transmissionType,
      price: variant.price,
      engineSpecs: variant.engineSpecs,
      performanceSpecs: variant.performanceSpecs,
      seatingCapacity: variant.seatingCapacity,
      isActive: variant.isActive,
      isDeleted: variant.isDeleted,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    })) as any[];

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: reorderedVariants,
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

  private parseBoolean(value: any, defaultValue = false): boolean {
    if (value === undefined || value === null) return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return defaultValue;
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return defaultValue;
  }

  async createVehicleVariantCsv(
    buffer: Buffer,
    fileType: 'csv',
    modelId: string, // ?. model id provided by user
  ) {
    const rows = (await parseFile(buffer, fileType)) as Record<string, any>[];

    // Be permissive: if CSV is empty, return empty summary instead of throwing
    if (!rows || rows.length === 0) {
      return {
        totalRows: 0,
        uniqueRows: 0,
        validRows: 0,
        insertedCount: 0,
        skippedCount: 0,
        inserted: [],
        skipped: [],
      };
    }

    const normalizeId = (value: any) => {
      if (value === undefined || value === null) return '';
      const trimmed = String(value).trim();
      if (!trimmed) return '';
      const lowered = trimmed.toLowerCase();
      if (lowered === 'undefined' || lowered === 'null') return '';
      return trimmed;
    };

    const normalizedModelId = normalizeId(modelId);

    const toMaybeObjectId = (value: string) => {
      if (!value) return value;
      return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
    };

    const headerAliases: Record<string, string> = {
      variant_name: 'name',
      variant: 'name',
      display: 'display_name',
      displayname: 'display_name',
      display_name: 'display_name',
      variant_display_name: 'display_name',
      model_id: 'vehicle_model',
      modelid: 'vehicle_model',
      vehicle_model_id: 'vehicle_model',
      vehicle_model: 'vehicle_model',
      vehiclemodelid: 'vehicle_model',
      vehiclemodel: 'vehicle_model',
      fuel: 'fuel_type',
      fueltype: 'fuel_type',
      fuel_type: 'fuel_type',
      transmission: 'transmission_type',
      transmissiontype: 'transmission_type',
      transmission_type: 'transmission_type',
      gearbox: 'transmission_type',
      feature: 'feature_package',
      featurepackage: 'feature_package',
      feature_package: 'feature_package',
      engine_cc: 'engine_capacity',
      engine_capacity: 'engine_capacity',
      engine_displacement: 'engine_capacity',
      engine_power: 'engine_max_power',
      engine_max_power: 'engine_max_power',
      engine_torque: 'engine_max_torque',
      engine_max_torque: 'engine_max_torque',
      engine_cylinders: 'engine_cylinders',
      engine_turbocharged: 'engine_turbo',
      engine_turbo: 'engine_turbo',
      performance_mileage: 'perf_mileage',
      perf_mileage: 'perf_mileage',
      performance_acceleration: 'perf_acceleration',
      perf_acceleration: 'perf_acceleration',
      performance_top_speed: 'perf_top_speed',
      perf_top_speed: 'perf_top_speed',
      performance_fuel_capacity: 'perf_fuel_capacity',
      perf_fuel_capacity: 'perf_fuel_capacity',
      dimension_length: 'dim_length',
      dim_length: 'dim_length',
      dimension_width: 'dim_width',
      dim_width: 'dim_width',
      dimension_height: 'dim_height',
      dim_height: 'dim_height',
      dimension_wheelbase: 'dim_wheelbase',
      dim_wheelbase: 'dim_wheelbase',
      ground_clearance: 'dim_ground_clearance',
      dim_ground_clearance: 'dim_ground_clearance',
      boot_space: 'dim_boot_space',
      dim_boot_space: 'dim_boot_space',
      seating_capacity: 'seating_capacity',
      ex_showroom_price: 'ex_showroom_price',
      exshowroomprice: 'ex_showroom_price',
      on_road_price: 'on_road_price',
      onroadprice: 'on_road_price',
      brochure_url: 'brochure_url',
      brochure: 'brochure_url',
      video_url: 'video_url',
      video: 'video_url',
      features_json: 'features_json',
      features: 'features_json',
      isdeleted: 'is_deleted',
      is_active: 'is_active',
      is_launched: 'is_launched',
      launch_date: 'launch_date',
    };

    const toCamelCase = (value: string) =>
      value.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

    const normalizeKey = (rawKey: string) => {
      const trimmed = rawKey.trim();
      if (!trimmed) return trimmed;
      const spaced = trimmed.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
      const snake = spaced
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
      if (!snake) return trimmed;
      const canonical = headerAliases[snake] ?? snake;
      return toCamelCase(canonical);
    };

    const normalizeRowKeys = (row: Record<string, any>) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
      );

    const normalizedRows = rows.map(normalizeRowKeys);

    const skipped: any[] = [];

    // --- Step 1: Deduplicate (by name + provided modelId) but generate fallback names if missing ---
    const seen = new Set<string>();
    const uniqueRows: Record<string, any>[] = [];

    normalizedRows.forEach((row, idx) => {
      const baseName = row.name ?? row.displayName ?? `variant-row-${idx + 1}`;
      const normName = String(baseName).trim().toLowerCase();
      const rowModelId = normalizeId(row.vehicleModel) || normalizedModelId;
      const key = `${normName}-${rowModelId}`;
      if (seen.has(key)) {
        skipped.push({ row, reason: 'Duplicate in CSV' });
        return;
      }
      seen.add(key);
      uniqueRows.push({
        ...row,
        name: String(baseName).trim(),
        vehicleModel: rowModelId,
      });
    });

    // --- Step 2: Attempt to map fuel/trans names if present; otherwise allow null and continue ---
    const fuelTypeNames = [
      ...new Set(
        uniqueRows
          .map((r) => r.fuelType)
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase()),
      ),
    ];

    const transmissionNames = [
      ...new Set(
        uniqueRows
          .map((r) => r.transmissionType)
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase()),
      ),
    ];

    const validFuelTypes = await this.fuelTypeModel
      .find({ name: { $in: fuelTypeNames }, isDeleted: false })
      .lean();

    const validTransTypes = await this.transmissionTypeModel
      .find({ name: { $in: transmissionNames }, isDeleted: false })
      .lean();

    const fuelMap = new Map(
      validFuelTypes.map((f) => [String(f.name).toLowerCase(), f]),
    );
    const transMap = new Map(
      validTransTypes.map((t) => [String(t.name).toLowerCase(), t]),
    );

    const validVariants: any[] = [];

    const parseBool = (v: any, defaultValue = false) =>
      this.parseBoolean(v, defaultValue);
    const parseNumber = (v: any) => {
      if (v === undefined || v === null || v === '') return undefined;
      const parsed = Number(v);
      return Number.isNaN(parsed) ? undefined : parsed;
    };
    const parseArray = (v: any) =>
      v
        ? String(v)
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean)
        : [];

    for (const [idx, row] of uniqueRows.entries()) {
      const fuelKey = row.fuelType
        ? String(row.fuelType).trim().toLowerCase()
        : undefined;
      const transKey = row.transmissionType
        ? String(row.transmissionType).trim().toLowerCase()
        : undefined;

      const fuelDoc =
        fuelKey && fuelMap.has(fuelKey) ? fuelMap.get(fuelKey) : undefined;
      const transDoc =
        transKey && transMap.has(transKey) ? transMap.get(transKey) : undefined;
      const rawModelId = normalizeId(row.vehicleModel) || normalizedModelId;
      const resolvedModelId = rawModelId
        ? toMaybeObjectId(rawModelId)
        : undefined;
      const fuelValue = fuelDoc
        ? fuelDoc._id
        : row.fuelType
          ? String(row.fuelType).trim()
          : undefined;
      const transValue = transDoc
        ? transDoc._id
        : row.transmissionType
          ? String(row.transmissionType).trim()
          : undefined;

      const variant = {
        name: row.name ? String(row.name).trim() : `variant-row-${idx + 1}`,
        displayName:
          row.displayName?.trim() ||
          (row.name ? String(row.name).trim() : `Variant ${idx + 1}`),
        vehicleModel: resolvedModelId,

        fuelType: fuelValue || undefined,
        transmissionType: transValue || undefined,

        featurePackage: row.featurePackage
          ? String(row.featurePackage).trim()
          : row.name?.trim() || 'Base',

        engineSpecs: {
          capacity: parseNumber(row.engineCapacity),
          maxPower: parseNumber(row.engineMaxPower),
          maxTorque: parseNumber(row.engineMaxTorque),
          cylinders: parseNumber(row.engineCylinders),
          turbocharged: parseBool(row.engineTurbo, false),
        },

        performanceSpecs: {
          mileage: parseNumber(row.perfMileage),
          acceleration: parseNumber(row.perfAcceleration),
          topSpeed: parseNumber(row.perfTopSpeed),
          fuelCapacity: parseNumber(row.perfFuelCapacity),
        },

        dimensions: {
          length: parseNumber(row.dimLength),
          width: parseNumber(row.dimWidth),
          height: parseNumber(row.dimHeight),
          wheelbase: parseNumber(row.dimWheelbase),
          groundClearance: parseNumber(row.dimGroundClearance),
          bootSpace: parseNumber(row.dimBootSpace),
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

        features: row.featuresJson
          ? (() => {
              try {
                return JSON.parse(row.featuresJson);
              } catch {
                return undefined;
              }
            })()
          : undefined,

        isActive: parseBool(row.isActive, true),
        isLaunched: parseBool(row.isLaunched, false),
        isDeleted: parseBool(row.isDeleted, false),
        launchDate: row.launchDate || null,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      validVariants.push(variant);
    }

    if (validVariants.length === 0) {
      return {
        totalRows: rows.length,
        uniqueRows: uniqueRows.length,
        validRows: 0,
        insertedCount: 0,
        skippedCount: skipped.length,
        inserted: [],
        skipped,
      };
    }

    let insertedIds: Record<number, any> = {};
    let writeErrors: any[] = [];

    try {
      const result = await this.vehicleVariantModel.collection.insertMany(
        validVariants,
        { ordered: false, bypassDocumentValidation: true },
      );
      insertedIds = (result && (result as any).insertedIds) || {};
    } catch (err: any) {
      insertedIds =
        err?.result?.insertedIds ||
        err?.insertedIds ||
        err?.result?.result?.insertedIds ||
        {};
      writeErrors = err?.writeErrors || err?.result?.writeErrors || [];
      if (!Object.keys(insertedIds).length && writeErrors.length === 0) {
        throw err;
      }
    }

    const inserted = Object.entries(insertedIds).map(([index, _id]) => {
      const doc = validVariants[Number(index)];
      return {
        _id,
        name: doc?.name,
        displayName: doc?.displayName,
        vehicleModel: doc?.vehicleModel,
      };
    });

    const skippedFromErrors =
      writeErrors.length > 0
        ? writeErrors.map((we: any) => ({
            row: validVariants[we.index] ?? we.op,
            reason: we.errmsg || we.message || 'Insert failed',
          }))
        : [];

    skipped.push(...skippedFromErrors);

    const fallbackSkippedCount = Math.max(
      0,
      validVariants.length - inserted.length,
    );
    const skippedCount =
      skipped.length > 0 ? skipped.length : fallbackSkippedCount;

    await this.invalidateInventoryCaches();

    return {
      totalRows: rows.length,
      uniqueRows: uniqueRows.length,
      validRows: validVariants.length,
      insertedCount: inserted.length,
      skippedCount,

      inserted,
      skipped,
    };
  }

  async createVechicleModelUploadFromId(
    id: string,
    buffer: Buffer,
    fileType: 'csv',
  ) {
    // Permissive: do not require manufacturer existence; accept the provided id as-is
    const rows = (await parseFile(buffer, fileType)) as Record<string, any>[];
    if (!rows || rows.length === 0) {
      return {
        totalRows: 0,
        uniqueRows: 0,
        validRows: 0,
        insertedCount: 0,
        skippedCount: 0,
        inserted: [],
        skipped: [],
      };
    }
    const normalizedId =
      typeof id === 'string' &&
      id.trim().toLowerCase() !== 'undefined' &&
      id.trim().toLowerCase() !== 'null'
        ? id.trim()
        : '';

    // Normalizer: map common header variants to canonical field names.
    const headerAliases: Record<string, string> = {
      'manufacturer id': 'manufacturer',
      manufacturer_id: 'manufacturer',
      manufacturerId: 'manufacturer',
      'model name': 'name',
      model: 'name',
      model_name: 'name',
      'display name': 'displayName',
      display_name: 'displayName',
      'launch year': 'launchYear',
      launch_year: 'launchYear',
      'is commercial vehicle': 'isCommercialVehicle',
      'commercial vehicle type': 'commercialVehicleType',
      'commercial body type': 'commercialBodyType',
      'default payload capacity': 'defaultPayloadCapacity',
      'default axle count': 'defaultAxleCount',
      'default payload unit': 'defaultPayloadUnit',
      'default seating capacity': 'defaultSeatingCapacity',
      'brochure url': 'brochureUrl',
      'fuel types': 'fuelTypes',
      'transmission types': 'transmissionTypes',
      'is deleted': 'isDeleted',
    };

    const normalizeKey = (rawKey: string) => {
      const trimmed = rawKey.trim();
      const keyNorm = trimmed.replace(/[\s_\-]+/g, ' ').toLowerCase();
      if (headerAliases[keyNorm]) return headerAliases[keyNorm];
      return trimmed;
    };

    // Normalize header keys to canonical allowed field names where possible
    // Normalize headers using existing alias map and normalizeKey helper
    const normalizeRowKeys = (row: Record<string, any>) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
      );

    const normalizedRows = rows.map(normalizeRowKeys);

    const validModels: Record<string, any>[] = [];
    const skipped: any[] = [];
    const parseBool = (v: any, defaultValue = false) =>
      this.parseBoolean(v, defaultValue);

    normalizedRows.forEach((row, idx) => {
      const baseName =
        row.name ??
        row.displayName ??
        row.model ??
        row.modelName ??
        `model-${idx + 1}`;
      const name = String(baseName).trim() || `model-${idx + 1}`;
      const displayName = row.displayName
        ? String(row.displayName).trim()
        : name;
      const manufacturer =
        normalizedId ||
        (row.manufacturer !== undefined
          ? String(row.manufacturer).trim()
          : row.manufacturerId !== undefined
            ? String(row.manufacturerId).trim()
            : row.manufacturer_id !== undefined
              ? String(row.manufacturer_id).trim()
              : '');

      const isActiveValue =
        row.isActive !== undefined ? row.isActive : row.is_active;
      const isDeletedValue =
        row.isDeleted !== undefined ? row.isDeleted : row.is_deleted;
      const isCommercialValue =
        row.isCommercialVehicle !== undefined
          ? row.isCommercialVehicle
          : row.is_commercial_vehicle;

      const modelDoc = {
        ...row,
        name,
        displayName,
        manufacturer,
        ...(isCommercialValue !== undefined
          ? { isCommercialVehicle: parseBool(isCommercialValue, false) }
          : {}),
        isDeleted: parseBool(isDeletedValue, false),
        isActive: parseBool(isActiveValue, true),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      validModels.push(modelDoc);
    });

    if (validModels.length === 0) {
      return {
        totalRows: rows.length,
        uniqueRows: normalizedRows.length,
        validRows: 0,
        insertedCount: 0,
        skippedCount: skipped.length,
        inserted: [],
        skipped,
      };
    }

    // Use native collection insert to avoid schema validation and allow best-effort bulk inserts.
    let insertedIds: Record<number, any> = {};
    let writeErrors: any[] = [];

    try {
      const result = await this.vehicleModelModel.collection.insertMany(
        validModels,
        { ordered: false, bypassDocumentValidation: true },
      );
      insertedIds = (result && (result as any).insertedIds) || {};
    } catch (err: any) {
      insertedIds =
        err?.result?.insertedIds ||
        err?.insertedIds ||
        err?.result?.result?.insertedIds ||
        {};
      writeErrors = err?.writeErrors || err?.result?.writeErrors || [];
      if (!Object.keys(insertedIds).length && writeErrors.length === 0) {
        throw err;
      }
    }

    const inserted = Object.entries(insertedIds).map(([index, _id]) => {
      const doc = validModels[Number(index)];
      return {
        _id,
        name: doc?.name,
        displayName: doc?.displayName,
        manufacturer: doc?.manufacturer,
      };
    });

    const skippedFromErrors =
      writeErrors.length > 0
        ? writeErrors.map((we: any) => ({
            row: validModels[we.index] ?? we.op,
            reason: we.errmsg || we.message || 'Insert failed',
          }))
        : [];

    skipped.push(...skippedFromErrors);

    const fallbackSkippedCount = Math.max(
      0,
      validModels.length - inserted.length,
    );
    const skippedCount =
      skipped.length > 0 ? skipped.length : fallbackSkippedCount;

    await this.invalidateInventoryCaches();

    return {
      totalRows: rows.length,
      uniqueRows: normalizedRows.length,
      validRows: validModels.length,
      insertedCount: inserted.length,
      skippedCount,
      inserted,
      skipped,
    };
  }

  // ========== BULK FIND METHODS FOR OPTIMIZATION ==========
  // These methods use $in queries to fetch multiple items in a single database call
  // instead of individual findOne calls, significantly improving performance

  async findManufacturersByIds(ids: string[]): Promise<Manufacturer[]> {
    if (!ids || ids.length === 0) return [];
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return [];

    return this.manufacturerModel
      .find({ _id: { $in: validIds }, isDeleted: false })
      .lean()
      .exec();
  }

  async findVehicleModelsByIds(ids: string[]): Promise<VehicleModel[]> {
    if (!ids || ids.length === 0) return [];
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return [];

    return this.vehicleModelModel
      .find({ _id: { $in: validIds }, isActive: true, isDeleted: false })
      .populate('manufacturer', 'name displayName logo')
      .lean()
      .exec();
  }

  async findVehicleVariantsByIds(ids: string[]): Promise<VehicleVariant[]> {
    if (!ids || ids.length === 0) return [];
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return [];

    return this.vehicleVariantModel
      .find({ _id: { $in: validIds }, isActive: true, isDeleted: false })
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .lean()
      .exec();
  }

  async findFuelTypesByIds(ids: string[]): Promise<FuelType[]> {
    if (!ids || ids.length === 0) return [];
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return [];

    return this.fuelTypeModel
      .find({ _id: { $in: validIds }, isActive: true, isDeleted: false })
      .lean()
      .exec();
  }

  async findTransmissionTypesByIds(
    ids: string[],
  ): Promise<TransmissionType[]> {
    if (!ids || ids.length === 0) return [];
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) return [];

    return this.transmissionTypeModel
      .find({ _id: { $in: validIds }, isActive: true, isDeleted: false })
      .lean()
      .exec();
  }
}
