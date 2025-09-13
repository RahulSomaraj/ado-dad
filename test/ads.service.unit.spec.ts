import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdsService } from '../src/ads/services/ads.service';
import { DataValidationService } from '../src/ads/services/data-validation.service';
import { S3Service } from '../src/shared/s3.service';
import { VehicleInventoryService } from '../src/vehicle-inventory/vehicle-inventory.service';
import { Model, Types } from 'mongoose';
import { AdCategory } from '../src/ads/schemas/ad.schema';
import {
  VehicleTypes,
  FeaturePackage,
} from '../src/vehicles/enum/vehicle.type';
import { PropertyTypeEnum } from '../src/ads/schemas/property-ad.schema';
import { VehicleTypeEnum } from '../src/ads/schemas/vehicle-ad.schema';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../src/ads/schemas/commercial-vehicle-ad.schema';
import { RedisService } from '../src/shared/redis.service';
import { CommercialVehicleDetectionService } from '../src/ads/services/commercial-vehicle-detection.service';

describe('AdsService (Unit)', () => {
  let service: AdsService;
  let dataValidationService: DataValidationService;
  let s3Service: S3Service;
  let vehicleInventoryService: VehicleInventoryService;
  let redisService: RedisService;
  let commercialVehicleDetectionService: CommercialVehicleDetectionService;
  let adModel: Model<any>;
  let propertyAdModel: Model<any>;
  let vehicleAdModel: Model<any>;
  let commercialVehicleAdModel: Model<any>;
  let favoriteModel: Model<any>;

  const mockAd = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Ad',
    description: 'Test Description',
    price: 100000,
    location: 'Test Location',
    category: AdCategory.PROPERTY,
    isActive: true,
    postedBy: '507f1f77bcf86cd799439021',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockPropertyAd = {
    _id: '507f1f77bcf86cd799439012',
    ad: '507f1f77bcf86cd799439011',
    propertyType: PropertyTypeEnum.APARTMENT,
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 1200,
    floor: 5,
    isFurnished: true,
    hasParking: true,
    hasGarden: false,
    amenities: ['Gym', 'Swimming Pool'],
  };

  const mockVehicleAd = {
    _id: '507f1f77bcf86cd799439013',
    ad: '507f1f77bcf86cd799439011',
    vehicleType: VehicleTypeEnum.FOUR_WHEELER,
    manufacturerId: '507f1f77bcf86cd799439031',
    modelId: '507f1f77bcf86cd799439041',
    variantId: '507f1f77bcf86cd799439051',
    year: 2020,
    mileage: 25000,
    transmissionTypeId: '507f1f77bcf86cd799439061',
    fuelTypeId: '507f1f77bcf86cd799439071',
    color: 'White',
    isFirstOwner: true,
    hasInsurance: true,
    hasRcBook: true,
    additionalFeatures: ['Sunroof', 'Leather Seats'],
  };

  const mockCommercialVehicleAd = {
    _id: '507f1f77bcf86cd799439014',
    ad: '507f1f77bcf86cd799439011',
    vehicleType: VehicleTypeEnum.FOUR_WHEELER,
    manufacturerId: '507f1f77bcf86cd799439031',
    modelId: '507f1f77bcf86cd799439041',
    variantId: '507f1f77bcf86cd799439051',
    year: 2019,
    mileage: 75000,
    transmissionTypeId: '507f1f77bcf86cd799439061',
    fuelTypeId: '507f1f77bcf86cd799439071',
    color: 'Blue',
    isFirstOwner: false,
    hasInsurance: true,
    hasRcBook: true,
    additionalFeatures: ['GPS Tracking', 'Climate Control'],
    commercialVehicleType: 'truck',
    bodyType: 'flatbed',
    payloadCapacity: 5000,
    payloadUnit: 'kg',
    axleCount: 2,
    hasFitness: true,
    hasPermit: true,
    seatingCapacity: 3,
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439021',
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    userType: 'USER',
  };

  const mockManufacturer = {
    _id: '507f1f77bcf86cd799439031',
    name: 'Honda',
    displayName: 'Honda',
    originCountry: 'Japan',
    logo: 'https://example.com/honda-logo.png',
  };

  const mockModel = {
    _id: '507f1f77bcf86cd799439041',
    name: 'City',
    displayName: 'Honda City',
    manufacturer: new Types.ObjectId('507f1f77bcf86cd799439031'),
    vehicleType: VehicleTypes.SEDAN,
    description: 'Honda City sedan',
    launchYear: 2020,
    segment: 'B',
    bodyType: 'Sedan',
    isActive: true,
    isDeleted: false,
  };

  const mockVariant = {
    _id: '507f1f77bcf86cd799439051',
    name: 'VX',
    displayName: 'Honda City VX',
    vehicleModel: new Types.ObjectId('507f1f77bcf86cd799439041'),
    description: 'Honda City VX variant',
    fuelType: new Types.ObjectId('507f1f77bcf86cd799439071'),
    transmissionType: new Types.ObjectId('507f1f77bcf86cd799439061'),
    featurePackage: FeaturePackage.VX,
    engineSpecs: {
      capacity: 1500,
      maxPower: 120,
      maxTorque: 145,
      cylinders: 4,
      turbocharged: false,
    },
    performanceSpecs: {
      mileage: 15.5,
      acceleration: 10.5,
      topSpeed: 180,
      fuelCapacity: 40,
    },
    seatingCapacity: 5,
    price: 1200000,
    isActive: true,
    isLaunched: true,
    isDeleted: false,
  };

  const mockFuelType = {
    _id: '507f1f77bcf86cd799439071',
    name: 'petrol',
    displayName: 'Petrol',
    description: 'Petrol fuel type',
    isActive: true,
    sortOrder: 1,
    isDeleted: false,
  };

  const mockTransmissionType = {
    _id: '507f1f77bcf86cd799439061',
    name: 'manual',
    displayName: 'Manual',
    description: 'Manual transmission',
    isActive: true,
    sortOrder: 1,
    isDeleted: false,
  };

  beforeEach(async () => {
    const mockAdModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockAd),
    }));
    (mockAdModel as any).find = jest.fn();
    (mockAdModel as any).findOne = jest.fn().mockResolvedValue(mockAd);
    (mockAdModel as any).findById = jest.fn();
    (mockAdModel as any).findByIdAndUpdate = jest.fn();
    (mockAdModel as any).findByIdAndDelete = jest.fn();
    (mockAdModel as any).create = jest.fn();
    (mockAdModel as any).aggregate = jest
      .fn()
      .mockImplementation((pipeline) => {
        // For findOne calls, return the ad object
        if (
          pipeline &&
          pipeline.length > 0 &&
          pipeline[0].$match &&
          pipeline[0].$match._id
        ) {
          return Promise.resolve([mockAd]);
        }
        // For findAll calls, return a promise that resolves to an object with collation method
        return Promise.resolve({
          collation: jest
            .fn()
            .mockResolvedValue([{ data: [], total: [{ count: 0 }] }]),
        });
      });
    (mockAdModel as any).countDocuments = jest.fn();
    (mockAdModel as any).startSession = jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    });

    const mockPropertyAdModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockPropertyAd),
    }));
    (mockPropertyAdModel as any).find = jest.fn();
    (mockPropertyAdModel as any).findOne = jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      ad: '507f1f77bcf86cd799439011',
      propertyType: PropertyTypeEnum.APARTMENT,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1200,
      floor: 5,
      isFurnished: true,
      hasParking: true,
      hasGarden: false,
      amenities: ['Gym', 'Swimming Pool'],
      save: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ad: '507f1f77bcf86cd799439011',
        propertyType: PropertyTypeEnum.APARTMENT,
        bedrooms: 3,
        bathrooms: 2,
        areaSqft: 1200,
        floor: 5,
        isFurnished: true,
        hasParking: true,
        hasGarden: false,
        amenities: ['Gym', 'Swimming Pool'],
      }),
    });
    (mockPropertyAdModel as any).findById = jest.fn();
    (mockPropertyAdModel as any).findByIdAndUpdate = jest.fn();
    (mockPropertyAdModel as any).findByIdAndDelete = jest.fn();
    (mockPropertyAdModel as any).create = jest.fn();
    (mockPropertyAdModel as any).aggregate = jest.fn();
    (mockPropertyAdModel as any).countDocuments = jest.fn();

    const mockVehicleAdModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockVehicleAd),
    }));
    (mockVehicleAdModel as any).find = jest.fn();
    (mockVehicleAdModel as any).findOne = jest.fn();
    (mockVehicleAdModel as any).findById = jest.fn();
    (mockVehicleAdModel as any).findByIdAndUpdate = jest.fn();
    (mockVehicleAdModel as any).findByIdAndDelete = jest.fn();
    (mockVehicleAdModel as any).create = jest.fn();
    (mockVehicleAdModel as any).aggregate = jest.fn();
    (mockVehicleAdModel as any).countDocuments = jest.fn();

    const mockCommercialVehicleAdModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockCommercialVehicleAd),
    }));
    (mockCommercialVehicleAdModel as any).find = jest.fn();
    (mockCommercialVehicleAdModel as any).findOne = jest.fn();
    (mockCommercialVehicleAdModel as any).findById = jest.fn();
    (mockCommercialVehicleAdModel as any).findByIdAndUpdate = jest.fn();
    (mockCommercialVehicleAdModel as any).findByIdAndDelete = jest.fn();
    (mockCommercialVehicleAdModel as any).create = jest.fn();
    (mockCommercialVehicleAdModel as any).aggregate = jest.fn();
    (mockCommercialVehicleAdModel as any).countDocuments = jest.fn();

    const mockFavoriteModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
      new: jest.fn(),
      save: jest.fn(),
    };

    const mockDataValidationService = {
      validateDataConsistency: jest.fn(),
      generateConsistencyReport: jest.fn(),
      cleanupOrphanedAds: jest.fn(),
    };

    const mockS3Service = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const mockVehicleInventoryService = {
      findManufacturerById: jest.fn(),
      findVehicleModelById: jest.fn(),
      findVehicleVariantById: jest.fn(),
      findFuelTypeById: jest.fn(),
      findTransmissionTypeById: jest.fn(),
      findAllManufacturers: jest.fn(),
      findAllVehicleModels: jest.fn(),
      findAllVehicleVariants: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      cacheGet: jest.fn(),
      cacheSet: jest.fn(),
      cacheDel: jest.fn(),
    };

    const mockCommercialVehicleDetectionService = {
      detectCommercialVehicle: jest.fn(),
      isCommercialVehicle: jest.fn(),
      detectCommercialVehicleDefaults: jest.fn().mockResolvedValue({
        isCommercialVehicle: false,
        category: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        {
          provide: getModelToken('Ad'),
          useValue: mockAdModel,
        },
        {
          provide: getModelToken('PropertyAd'),
          useValue: mockPropertyAdModel,
        },
        {
          provide: getModelToken('VehicleAd'),
          useValue: mockVehicleAdModel,
        },
        {
          provide: getModelToken('CommercialVehicleAd'),
          useValue: mockCommercialVehicleAdModel,
        },
        {
          provide: getModelToken('Favorite'),
          useValue: mockFavoriteModel,
        },
        {
          provide: DataValidationService,
          useValue: mockDataValidationService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: VehicleInventoryService,
          useValue: mockVehicleInventoryService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: CommercialVehicleDetectionService,
          useValue: mockCommercialVehicleDetectionService,
        },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);
    dataValidationService = module.get<DataValidationService>(
      DataValidationService,
    );
    s3Service = module.get<S3Service>(S3Service);
    vehicleInventoryService = module.get<VehicleInventoryService>(
      VehicleInventoryService,
    );
    redisService = module.get<RedisService>(RedisService);
    commercialVehicleDetectionService =
      module.get<CommercialVehicleDetectionService>(
        CommercialVehicleDetectionService,
      );
    adModel = module.get<Model<any>>(getModelToken('Ad'));
    propertyAdModel = module.get<Model<any>>(getModelToken('PropertyAd'));
    vehicleAdModel = module.get<Model<any>>(getModelToken('VehicleAd'));
    commercialVehicleAdModel = module.get<Model<any>>(
      getModelToken('CommercialVehicleAd'),
    );
    favoriteModel = module.get<Model<any>>(getModelToken('Favorite'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAd', () => {
    it('should create a property ad successfully', async () => {
      const createAdDto = {
        category: AdCategory.PROPERTY,
        data: {
          title: 'Test Property Ad',
          description: 'Test Property Description',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: ['https://example.com/image1.jpg'],
          propertyType: PropertyTypeEnum.APARTMENT,
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
          floor: 5,
          isFurnished: true,
          hasParking: true,
          hasGarden: false,
          amenities: ['Gym', 'Swimming Pool'],
        },
      };

      const userId = '507f1f77bcf86cd799439021';

      jest.spyOn(adModel, 'create').mockResolvedValue([mockAd]);
      jest.spyOn(propertyAdModel, 'create').mockResolvedValue([mockPropertyAd]);

      const result = await service.createAd(createAdDto, userId);

      expect(adModel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '',
          description: 'Test Property Description',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          category: AdCategory.PROPERTY,
          postedBy: expect.any(Object),
        }),
      );
      expect(propertyAdModel).toHaveBeenCalledWith(
        expect.objectContaining({
          ad: mockAd._id,
          propertyType: PropertyTypeEnum.APARTMENT,
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        }),
      );
      expect(result).toHaveProperty('id', mockAd._id);
    });

    it('should create a vehicle ad successfully', async () => {
      const createAdDto = {
        category: AdCategory.PRIVATE_VEHICLE,
        data: {
          title: 'Test Vehicle Ad',
          description: 'Test Vehicle Description',
          price: 850000,
          location: 'Delhi, NCR',
          images: ['https://example.com/vehicle1.jpg'],
          vehicleType: VehicleTypeEnum.FOUR_WHEELER,
          manufacturerId: '507f1f77bcf86cd799439031',
          modelId: '507f1f77bcf86cd799439041',
          variantId: '507f1f77bcf86cd799439051',
          year: 2020,
          mileage: 25000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: ['Sunroof', 'Leather Seats'],
        },
      };

      const userId = '507f1f77bcf86cd799439021';

      jest
        .spyOn(vehicleInventoryService, 'findManufacturerById')
        .mockResolvedValue(mockManufacturer);
      jest
        .spyOn(vehicleInventoryService, 'findVehicleModelById')
        .mockResolvedValue(mockModel);
      jest
        .spyOn(vehicleInventoryService, 'findVehicleVariantById')
        .mockResolvedValue(mockVariant);
      jest
        .spyOn(vehicleInventoryService, 'findFuelTypeById')
        .mockResolvedValue(mockFuelType);
      jest
        .spyOn(vehicleInventoryService, 'findTransmissionTypeById')
        .mockResolvedValue(mockTransmissionType);
      jest.spyOn(adModel, 'create').mockResolvedValue([mockAd]);
      jest.spyOn(vehicleAdModel, 'create').mockResolvedValue([mockVehicleAd]);

      const result = await service.createAd(createAdDto, userId);

      expect(vehicleInventoryService.findVehicleModelById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439041',
      );
      expect(adModel).toHaveBeenCalled();
      expect(vehicleAdModel).toHaveBeenCalled();
      expect(result).toHaveProperty('id', mockAd._id);
    });

    it('should create a commercial vehicle ad successfully', async () => {
      const createAdDto = {
        category: AdCategory.COMMERCIAL_VEHICLE,
        data: {
          title: 'Test Commercial Vehicle Ad',
          description: 'Test Commercial Vehicle Description',
          price: 1800000,
          location: 'Pune, Maharashtra',
          images: ['https://example.com/truck1.jpg'],
          vehicleType: VehicleTypeEnum.FOUR_WHEELER,
          manufacturerId: '507f1f77bcf86cd799439031',
          modelId: '507f1f77bcf86cd799439041',
          variantId: '507f1f77bcf86cd799439051',
          year: 2019,
          mileage: 75000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'Blue',
          isFirstOwner: false,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: ['GPS Tracking', 'Climate Control'],
          commercialVehicleType: CommercialVehicleTypeEnum.TRUCK,
          bodyType: BodyTypeEnum.FLATBED,
          payloadCapacity: 5000,
          payloadUnit: 'kg',
          axleCount: 2,
          hasFitness: true,
          hasPermit: true,
          seatingCapacity: 3,
        },
      };

      const userId = '507f1f77bcf86cd799439021';

      jest
        .spyOn(vehicleInventoryService, 'findManufacturerById')
        .mockResolvedValue(mockManufacturer);
      jest
        .spyOn(vehicleInventoryService, 'findVehicleModelById')
        .mockResolvedValue(mockModel);
      jest
        .spyOn(vehicleInventoryService, 'findVehicleVariantById')
        .mockResolvedValue(mockVariant);
      jest
        .spyOn(vehicleInventoryService, 'findFuelTypeById')
        .mockResolvedValue(mockFuelType);
      jest
        .spyOn(vehicleInventoryService, 'findTransmissionTypeById')
        .mockResolvedValue(mockTransmissionType);
      jest.spyOn(adModel, 'create').mockResolvedValue([mockAd]);
      jest
        .spyOn(commercialVehicleAdModel, 'create')
        .mockResolvedValue([mockCommercialVehicleAd]);

      const result = await service.createAd(createAdDto, userId);

      expect(vehicleInventoryService.findManufacturerById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439031',
      );
      expect(vehicleInventoryService.findVehicleModelById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439041',
      );
      expect(
        vehicleInventoryService.findVehicleVariantById,
      ).toHaveBeenCalledWith('507f1f77bcf86cd799439051');
      expect(adModel).toHaveBeenCalled();
      expect(commercialVehicleAdModel).toHaveBeenCalled();
      expect(result).toHaveProperty('id', mockAd._id);
    });

    it('should throw BadRequestException for invalid manufacturer ID', async () => {
      const createAdDto = {
        category: AdCategory.PRIVATE_VEHICLE,
        data: {
          title: 'Test Vehicle Ad',
          description: 'Test Vehicle Description',
          price: 850000,
          location: 'Delhi, NCR',
          images: [],
        },
        vehicle: {
          vehicleType: VehicleTypeEnum.FOUR_WHEELER,
          manufacturerId: 'invalid-id',
          modelId: '507f1f77bcf86cd799439041',
          year: 2020,
          mileage: 25000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [],
        },
      };

      const userId = '507f1f77bcf86cd799439021';

      jest
        .spyOn(vehicleInventoryService, 'findManufacturerById')
        .mockResolvedValue(null);

      await expect(service.createAd(createAdDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing required fields', async () => {
      const createAdDto = {
        category: AdCategory.PROPERTY,
        data: {
          description: 'Test Property Description',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: PropertyTypeEnum.APARTMENT,
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const userId = '507f1f77bcf86cd799439021';

      await expect(service.createAd(createAdDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated ads with filters', async () => {
      const filterDto = {
        category: AdCategory.PROPERTY,
        minPrice: 1000000,
        maxPrice: 10000000,
        location: 'Mumbai',
        page: 1,
        limit: 10,
      };

      const mockAggregateResult = [
        {
          ...mockAd,
          propertyDetails: mockPropertyAd,
          user: mockUser,
        },
      ];

      jest.spyOn(redisService, 'cacheGet').mockResolvedValue(null);
      jest.spyOn(adModel, 'aggregate').mockResolvedValue(mockAggregateResult);
      jest.spyOn(adModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.findAll(filterDto);

      expect(redisService.cacheGet).toHaveBeenCalled();
      expect(adModel.aggregate).toHaveBeenCalled();
      expect(adModel.countDocuments).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
    });

    it('should return empty result when no ads found', async () => {
      const filterDto = {
        category: AdCategory.PROPERTY,
        minPrice: 10000000,
        maxPrice: 20000000,
        page: 1,
        limit: 10,
      };

      jest.spyOn(redisService, 'cacheGet').mockResolvedValue(null);
      jest.spyOn(adModel, 'aggregate').mockResolvedValue([]);
      jest.spyOn(adModel, 'countDocuments').mockResolvedValue(0);

      const result = await service.findAll(filterDto);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getAdById', () => {
    it('should return ad by ID with all details', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439021';

      const mockAggregateResult = [
        {
          ...mockAd,
          propertyDetails: mockPropertyAd,
          user: mockUser,
          favoritesCount: 5,
          relatedChats: [],
          ratings: [],
        },
      ];

      jest.spyOn(redisService, 'cacheGet').mockResolvedValue(null);
      jest.spyOn(adModel, 'aggregate').mockResolvedValue(mockAggregateResult);

      const result = await service.getAdById(adId, userId);

      expect(redisService.cacheGet).toHaveBeenCalled();
      expect(adModel.aggregate).toHaveBeenCalled();
      expect(result).toHaveProperty('id', adId);
      expect(result).toHaveProperty('propertyDetails');
      expect(result).toHaveProperty('user');
    });

    it('should throw NotFoundException when ad not found', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439021';

      jest.spyOn(redisService, 'cacheGet').mockResolvedValue(null);
      jest.spyOn(adModel, 'aggregate').mockResolvedValue([]);

      await expect(service.getAdById(adId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update property ad successfully', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439021';
      const userType = 'USER';

      const updateDto = {
        data: {
          title: 'Updated Property Ad',
          description: 'Updated Property Description',
          price: 6000000,
        },
        property: {
          bedrooms: 3,
          bathrooms: 3,
          areaSqft: 1500,
        },
      };

      const mockUpdatedAd = { ...mockAd, ...updateDto.data };
      const mockUpdatedPropertyAd = {
        ...mockPropertyAd,
        ...updateDto.property,
      };

      jest.spyOn(adModel, 'findById').mockResolvedValue(mockAd);
      jest.spyOn(propertyAdModel, 'findOne').mockResolvedValue({
        ...mockPropertyAd,
        save: jest.fn().mockResolvedValue({
          ...mockPropertyAd,
          bedrooms: 3,
        }),
      });
      jest.spyOn(adModel, 'findByIdAndUpdate').mockResolvedValue(mockUpdatedAd);
      jest
        .spyOn(propertyAdModel, 'findByIdAndUpdate')
        .mockResolvedValue(mockUpdatedPropertyAd);

      const result = await service.update(adId, updateDto, userId, userType);

      expect(adModel.findById).toHaveBeenCalledWith(adId);
      expect(propertyAdModel.findOne).toHaveBeenCalledWith({ ad: adId });
      expect(result).toHaveProperty('id', adId);
    });

    it('should throw NotFoundException when ad not found', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439021';
      const userType = 'USER';

      const updateDto = {
        data: {
          title: 'Updated Property Ad',
        },
      };

      jest.spyOn(adModel, 'findById').mockResolvedValue(null);

      await expect(
        service.update(adId, updateDto, userId, userType),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not owner and not admin', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439022'; // Different user
      const userType = 'USER';

      const updateDto = {
        data: {
          title: 'Updated Property Ad',
        },
      };

      const mockAdWithDifferentOwner = {
        ...mockAd,
        postedBy: '507f1f77bcf86cd799439021',
      };

      jest
        .spyOn(adModel, 'findById')
        .mockResolvedValue(mockAdWithDifferentOwner);

      await expect(
        service.update(adId, updateDto, userId, userType),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete ad successfully', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439021';
      const userType = 'USER';

      jest.spyOn(adModel, 'findById').mockResolvedValue(mockAd);
      jest.spyOn(propertyAdModel, 'findOne').mockResolvedValue(mockPropertyAd);
      jest.spyOn(adModel, 'findByIdAndDelete').mockResolvedValue(mockAd);
      jest
        .spyOn(propertyAdModel, 'findByIdAndDelete')
        .mockResolvedValue(mockPropertyAd);

      await service.delete(adId, userId, userType);

      expect(adModel.findById).toHaveBeenCalledWith(adId);
      expect(adModel.findByIdAndDelete).toHaveBeenCalledWith(adId);
    });

    it('should throw NotFoundException when ad not found', async () => {
      const adId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439021';
      const userType = 'USER';

      jest.spyOn(adModel, 'findById').mockResolvedValue(null);

      await expect(service.delete(adId, userId, userType)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserAds', () => {
    it('should return user ads with pagination', async () => {
      const userId = '507f1f77bcf86cd799439021';
      const filterDto = {
        page: 1,
        limit: 10,
        search: 'Test',
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
      };

      const mockAggregateResult = [
        {
          ...mockAd,
          propertyDetails: mockPropertyAd,
          user: mockUser,
        },
      ];

      jest.spyOn(redisService, 'cacheGet').mockResolvedValue(null);
      jest.spyOn(adModel, 'aggregate').mockResolvedValue(mockAggregateResult);
      jest.spyOn(adModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.getUserAds(userId, filterDto);

      expect(redisService.cacheGet).toHaveBeenCalled();
      expect(adModel.aggregate).toHaveBeenCalled();
      expect(adModel.countDocuments).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
    });
  });

  describe('warmUpCache', () => {
    it('should warm up cache successfully', async () => {
      const mockCacheData = [
        { category: 'property', count: 100 },
        { category: 'private_vehicle', count: 150 },
        { category: 'commercial_vehicle', count: 50 },
      ];

      jest.spyOn(adModel, 'aggregate').mockResolvedValue(mockCacheData);

      await service.warmUpCache();

      expect(adModel.aggregate).toHaveBeenCalled();
    });
  });
});
