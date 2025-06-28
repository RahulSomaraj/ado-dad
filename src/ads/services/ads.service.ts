import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
} from '../dto/common/ad-response.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { CreateAdDto } from '../dto/common/create-ad.dto';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { DetailedAdResponseDto } from '../dto/common/ad-response.dto';

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
  ) {}

  async findAll(filters: FilterAdDto): Promise<PaginatedAdResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'postedAt',
      sortOrder = 'DESC',
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

    // Add basic filters (excluding text search which is handled above)
    const matchStage: MatchStage = { isActive: true };

    if (filters.category) {
      matchStage.category = filters.category;
    }

    if (filters.location) {
      matchStage.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.minPrice !== undefined) {
      matchStage.price = { ...matchStage.price, $gte: filters.minPrice };
    }

    if (filters.maxPrice !== undefined) {
      matchStage.price = { ...matchStage.price, $lte: filters.maxPrice };
    }

    if (filters.postedBy) {
      matchStage.postedBy = filters.postedBy;
    }

    if (filters.isActive !== undefined) {
      matchStage.isActive = filters.isActive;
    }

    // Add user lookup
    pipeline.push(
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
      { $match: matchStage },
    );

    // Add property-specific filters
    if (
      filters.propertyType ||
      filters.minBedrooms ||
      filters.maxBedrooms ||
      filters.minBathrooms ||
      filters.maxBathrooms ||
      filters.minArea ||
      filters.maxArea ||
      filters.isFurnished !== undefined ||
      filters.hasParking !== undefined ||
      filters.hasGarden !== undefined
    ) {
      pipeline.push({
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      });

      const propertyMatch: PropertyMatchStage = {};
      if (filters.propertyType)
        propertyMatch.propertyType = filters.propertyType;
      if (filters.minBedrooms !== undefined)
        propertyMatch.bedrooms = {
          ...propertyMatch.bedrooms,
          $gte: filters.minBedrooms,
        };
      if (filters.maxBedrooms !== undefined)
        propertyMatch.bedrooms = {
          ...propertyMatch.bedrooms,
          $lte: filters.maxBedrooms,
        };
      if (filters.minBathrooms !== undefined)
        propertyMatch.bathrooms = {
          ...propertyMatch.bathrooms,
          $gte: filters.minBathrooms,
        };
      if (filters.maxBathrooms !== undefined)
        propertyMatch.bathrooms = {
          ...propertyMatch.bathrooms,
          $lte: filters.maxBathrooms,
        };
      if (filters.minArea !== undefined)
        propertyMatch.areaSqft = {
          ...propertyMatch.areaSqft,
          $gte: filters.minArea,
        };
      if (filters.maxArea !== undefined)
        propertyMatch.areaSqft = {
          ...propertyMatch.areaSqft,
          $lte: filters.maxArea,
        };
      if (filters.isFurnished !== undefined)
        propertyMatch.isFurnished = filters.isFurnished;
      if (filters.hasParking !== undefined)
        propertyMatch.hasParking = filters.hasParking;
      if (filters.hasGarden !== undefined)
        propertyMatch.hasGarden = filters.hasGarden;

      if (Object.keys(propertyMatch).length > 0) {
        pipeline.push({
          $match: {
            'propertyDetails.0': { $exists: true },
            $or: [{ 'propertyDetails.0': propertyMatch }],
          },
        });
      }
    }

    // Add vehicle-specific filters (for both PRIVATE_VEHICLE and TWO_WHEELER)
    if (
      filters.vehicleType ||
      filters.manufacturerId ||
      filters.modelId ||
      filters.variantId ||
      filters.minYear ||
      filters.maxYear ||
      filters.maxMileage ||
      filters.transmissionTypeId ||
      filters.fuelTypeId ||
      filters.color ||
      filters.isFirstOwner !== undefined ||
      filters.hasInsurance !== undefined ||
      filters.hasRcBook !== undefined
    ) {
      pipeline.push({
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      });

      const vehicleMatch: VehicleMatchStage = {};
      if (filters.vehicleType) vehicleMatch.vehicleType = filters.vehicleType;
      if (filters.manufacturerId)
        vehicleMatch.manufacturerId = filters.manufacturerId;
      if (filters.modelId) vehicleMatch.modelId = filters.modelId;
      if (filters.variantId) vehicleMatch.variantId = filters.variantId;
      if (filters.minYear !== undefined)
        vehicleMatch.year = { ...vehicleMatch.year, $gte: filters.minYear };
      if (filters.maxYear !== undefined)
        vehicleMatch.year = { ...vehicleMatch.year, $lte: filters.maxYear };
      if (filters.maxMileage !== undefined)
        vehicleMatch.mileage = { $lte: filters.maxMileage };
      if (filters.transmissionTypeId)
        vehicleMatch.transmissionTypeId = filters.transmissionTypeId;
      if (filters.fuelTypeId) vehicleMatch.fuelTypeId = filters.fuelTypeId;
      if (filters.color)
        vehicleMatch.color = { $regex: filters.color, $options: 'i' };
      if (filters.isFirstOwner !== undefined)
        vehicleMatch.isFirstOwner = filters.isFirstOwner;
      if (filters.hasInsurance !== undefined)
        vehicleMatch.hasInsurance = filters.hasInsurance;
      if (filters.hasRcBook !== undefined)
        vehicleMatch.hasRcBook = filters.hasRcBook;

      if (Object.keys(vehicleMatch).length > 0) {
        pipeline.push({
          $match: {
            'vehicleDetails.0': { $exists: true },
            $or: [{ 'vehicleDetails.0': vehicleMatch }],
          },
        });
      }
    }

    // Add commercial vehicle-specific filters
    if (
      filters.commercialVehicleType ||
      filters.bodyType ||
      filters.minPayloadCapacity ||
      filters.maxPayloadCapacity ||
      filters.axleCount ||
      filters.hasFitness !== undefined ||
      filters.hasPermit !== undefined ||
      filters.minSeatingCapacity ||
      filters.maxSeatingCapacity
    ) {
      pipeline.push({
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails',
        },
      });

      const commercialVehicleMatch: CommercialVehicleMatchStage = {};
      if (filters.commercialVehicleType)
        commercialVehicleMatch.vehicleType = filters.commercialVehicleType;
      if (filters.bodyType) commercialVehicleMatch.bodyType = filters.bodyType;
      if (filters.minPayloadCapacity !== undefined)
        commercialVehicleMatch.payloadCapacity = {
          ...commercialVehicleMatch.payloadCapacity,
          $gte: filters.minPayloadCapacity,
        };
      if (filters.maxPayloadCapacity !== undefined)
        commercialVehicleMatch.payloadCapacity = {
          ...commercialVehicleMatch.payloadCapacity,
          $lte: filters.maxPayloadCapacity,
        };
      if (filters.axleCount !== undefined)
        commercialVehicleMatch.axleCount = filters.axleCount;
      if (filters.hasFitness !== undefined)
        commercialVehicleMatch.hasFitness = filters.hasFitness;
      if (filters.hasPermit !== undefined)
        commercialVehicleMatch.hasPermit = filters.hasPermit;
      if (filters.minSeatingCapacity !== undefined)
        commercialVehicleMatch.seatingCapacity = {
          ...commercialVehicleMatch.seatingCapacity,
          $gte: filters.minSeatingCapacity,
        };
      if (filters.maxSeatingCapacity !== undefined)
        commercialVehicleMatch.seatingCapacity = {
          ...commercialVehicleMatch.seatingCapacity,
          $lte: filters.maxSeatingCapacity,
        };

      if (Object.keys(commercialVehicleMatch).length > 0) {
        pipeline.push({
          $match: {
            'commercialVehicleDetails.0': { $exists: true },
            $or: [{ 'commercialVehicleDetails.0': commercialVehicleMatch }],
          },
        });
      }
    }

    // Add additional lookups for detailed information
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
    );

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.adModel.aggregate(countPipeline);
    const total =
      countResult.length > 0 ? (countResult[0] as { total: number }).total : 0;

    // Add sorting and pagination
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortDirection } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Execute the main query
    const ads = await this.adModel.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: ads.map((ad) => this.mapToResponseDto(ad)),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(id: string): Promise<AdResponseDto> {
    const ad = await this.adModel
      .findById(id)
      .populate('postedBy', 'name email phone')
      .exec();

    if (!ad) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    return this.mapToResponseDto(ad);
  }

  async getAdById(id: string): Promise<DetailedAdResponseDto> {
    // Use aggregation pipeline to get all related data in one query
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

    return detailedAd;
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

  async createPropertyAd(
    createDto: CreatePropertyAdDto,
    userId: string,
  ): Promise<AdResponseDto> {
    const ad = new this.adModel({
      ...createDto,
      postedBy: userId,
      category: AdCategory.PROPERTY,
    });

    const savedAd = await ad.save();

    const propertyAd = new this.propertyAdModel({
      ad: savedAd._id as any,
      propertyType: createDto.propertyType,
      bedrooms: createDto.bedrooms,
      bathrooms: createDto.bathrooms,
      areaSqft: createDto.areaSqft,
      floor: createDto.floor,
      isFurnished: createDto.isFurnished,
      hasParking: createDto.hasParking,
      hasGarden: createDto.hasGarden,
      amenities: createDto.amenities,
    });

    await propertyAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  async createVehicleAd(
    createDto: CreateVehicleAdDto,
    userId: string,
  ): Promise<AdResponseDto> {
    // Validate that the referenced vehicle-inventory entities exist
    await this.validateVehicleInventoryReferences(createDto);

    const ad = new this.adModel({
      ...createDto,
      postedBy: userId,
      category: AdCategory.PRIVATE_VEHICLE,
    });

    const savedAd = await ad.save();

    const vehicleAd = new this.vehicleAdModel({
      ad: savedAd._id as any,
      vehicleType: createDto.vehicleType,
      manufacturerId: createDto.manufacturerId,
      modelId: createDto.modelId,
      variantId: createDto.variantId,
      year: createDto.year,
      mileage: createDto.mileage,
      transmissionTypeId: createDto.transmissionTypeId,
      fuelTypeId: createDto.fuelTypeId,
      color: createDto.color,
      isFirstOwner: createDto.isFirstOwner,
      hasInsurance: createDto.hasInsurance,
      hasRcBook: createDto.hasRcBook,
      additionalFeatures: createDto.additionalFeatures,
    });

    await vehicleAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  async createCommercialVehicleAd(
    createDto: CreateCommercialVehicleAdDto,
    userId: string,
  ): Promise<AdResponseDto> {
    // Validate that the referenced vehicle-inventory entities exist
    await this.validateVehicleInventoryReferences(createDto);

    const ad = new this.adModel({
      ...createDto,
      postedBy: userId,
      category: AdCategory.COMMERCIAL_VEHICLE,
    });

    const savedAd = await ad.save();

    const commercialVehicleAd = new this.commercialVehicleAdModel({
      ad: savedAd._id as any,
      vehicleType: createDto.vehicleType,
      bodyType: createDto.bodyType,
      manufacturerId: createDto.manufacturerId,
      modelId: createDto.modelId,
      variantId: createDto.variantId,
      year: createDto.year,
      mileage: createDto.mileage,
      payloadCapacity: createDto.payloadCapacity,
      payloadUnit: createDto.payloadUnit,
      axleCount: createDto.axleCount,
      transmissionTypeId: createDto.transmissionTypeId,
      fuelTypeId: createDto.fuelTypeId,
      color: createDto.color,
      hasInsurance: createDto.hasInsurance,
      hasFitness: createDto.hasFitness,
      hasPermit: createDto.hasPermit,
      additionalFeatures: createDto.additionalFeatures,
      seatingCapacity: createDto.seatingCapacity,
    });

    await commercialVehicleAd.save();

    return this.findOne((savedAd._id as any).toString());
  }

  // Unified method to create any type of ad
  async createAd(
    createDto: CreateAdDto,
    userId: string,
  ): Promise<AdResponseDto> {
    // Validate required fields based on category
    this.validateRequiredFields(createDto);

    switch (createDto.category) {
      case AdCategory.PROPERTY:
        return this.createPropertyAdFromUnified(createDto.data, userId);
      case AdCategory.PRIVATE_VEHICLE:
        return this.createVehicleAdFromUnified(createDto.data, userId);
      case AdCategory.COMMERCIAL_VEHICLE:
        return this.createCommercialVehicleAdFromUnified(
          createDto.data,
          userId,
        );
      case AdCategory.TWO_WHEELER:
        return this.createVehicleAdFromUnified(createDto.data, userId);
      default:
        throw new BadRequestException(
          `Invalid ad category: ${createDto.category}`,
        );
    }
  }

  private validateRequiredFields(createDto: CreateAdDto): void {
    const { category, data } = createDto;

    // Validate base required fields
    if (!data.title || !data.description || !data.price || !data.location) {
      throw new BadRequestException(
        'Title, description, price, and location are required for all ad types',
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
        if (
          !data.vehicleType ||
          !data.commercialVehicleType ||
          !data.bodyType ||
          !data.manufacturerId ||
          !data.modelId ||
          !data.year ||
          !data.mileage ||
          !data.payloadCapacity ||
          !data.payloadUnit ||
          !data.axleCount ||
          !data.transmissionTypeId ||
          !data.fuelTypeId ||
          !data.color
        ) {
          throw new BadRequestException(
            'Commercial vehicle ads require: vehicleType, commercialVehicleType, bodyType, manufacturerId, modelId, year, mileage, payloadCapacity, payloadUnit, axleCount, transmissionTypeId, fuelTypeId, and color',
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
      title: data.title,
      description: data.description,
      price: data.price,
      images: data.images || [],
      location: data.location,
      postedBy: userId,
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
    // Validate that the referenced vehicle-inventory entities exist
    await this.validateVehicleInventoryReferences(data);

    const ad = new this.adModel({
      title: data.title,
      description: data.description,
      price: data.price,
      images: data.images || [],
      location: data.location,
      postedBy: userId,
      category:
        data.vehicleType === 'two_wheeler'
          ? AdCategory.TWO_WHEELER
          : AdCategory.PRIVATE_VEHICLE,
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

  private async createCommercialVehicleAdFromUnified(
    data: any,
    userId: string,
  ): Promise<AdResponseDto> {
    // Validate that the referenced vehicle-inventory entities exist
    await this.validateVehicleInventoryReferences(data);

    const ad = new this.adModel({
      title: data.title,
      description: data.description,
      price: data.price,
      images: data.images || [],
      location: data.location,
      postedBy: userId,
      category: AdCategory.COMMERCIAL_VEHICLE,
    });

    const savedAd = await ad.save();

    const commercialVehicleAd = new this.commercialVehicleAdModel({
      ad: savedAd._id as any,
      vehicleType: data.vehicleType,
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

  private mapToResponseDto(ad: any): AdResponseDto {
    return {
      id: (ad._id as any).toString(),
      title: ad.title,
      description: ad.description,
      price: ad.price,
      images: ad.images,
      location: ad.location,
      category: ad.category,
      isActive: ad.isActive,
      postedAt: ad.postedAt,
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
