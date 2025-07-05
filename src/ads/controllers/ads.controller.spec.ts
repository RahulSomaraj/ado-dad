import { Test, TestingModule } from '@nestjs/testing';
import { AdsController } from './ads.controller';
import { AdsService } from '../services/ads.service';
import { S3Service } from '../../shared/s3.service';
import { FilterAdDto } from '../dto/common/filter-ad.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { AdCategory } from '../entities/ad.entity';

describe('AdsController', () => {
  let controller: AdsController;
  let adsService: AdsService;
  let s3Service: S3Service;

  const mockAdsService = {
    createPropertyAd: jest.fn(),
    createVehicleAd: jest.fn(),
    createCommercialVehicleAd: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdsController],
      providers: [
        {
          provide: AdsService,
          useValue: mockAdsService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<AdsController>(AdsController);
    adsService = module.get<AdsService>(AdsService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated advertisements', async () => {
      const filters: FilterAdDto = { page: 1, limit: 20 };
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockAdsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(filters);

      expect(adsService.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single advertisement', async () => {
      const id = 'test-id';
      const expectedResult = {
        id,
        title: 'Test Ad',
        description: 'Test Description',
        price: 1000,
        category: AdCategory.PROPERTY,
        location: 'Test Location',
        isActive: true,
        postedAt: new Date(),
        updatedAt: new Date(),
        postedBy: 'user-id',
      };

      mockAdsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(adsService.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createPropertyAd', () => {
    it('should create a property advertisement', async () => {
      const createDto: CreatePropertyAdDto = {
        title: 'Test Property',
        description: 'Test Property Description',
        price: 100000,
        location: 'Test Location',
        category: AdCategory.PROPERTY,
        propertyType: 'apartment' as any,
        bedrooms: 2,
        bathrooms: 1,
        areaSqft: 1000,
      };

      const userId = 'user-id';
      const expectedResult = {
        id: 'ad-id',
        ...createDto,
        postedBy: userId,
        isActive: true,
        postedAt: new Date(),
        updatedAt: new Date(),
      };

      mockAdsService.createPropertyAd.mockResolvedValue(expectedResult);

      const result = await controller.createPropertyAd(createDto, userId);

      expect(adsService.createPropertyAd).toHaveBeenCalledWith(
        createDto,
        userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createVehicleAd', () => {
    it('should create a vehicle advertisement', async () => {
      const createDto: CreateVehicleAdDto = {
        title: 'Test Vehicle',
        description: 'Test Vehicle Description',
        price: 50000,
        location: 'Test Location',
        category: AdCategory.PRIVATE_VEHICLE,
        vehicleType: 'four_wheeler' as any,
        manufacturerId: 'manufacturer-id',
        modelId: 'model-id',
        year: 2020,
        mileage: 50000,
        transmissionTypeId: 'transmission-id',
        fuelTypeIds: ['fuel-type-id'],
      };

      const userId = 'user-id';
      const expectedResult = {
        id: 'ad-id',
        ...createDto,
        postedBy: userId,
        isActive: true,
        postedAt: new Date(),
        updatedAt: new Date(),
      };

      mockAdsService.createVehicleAd.mockResolvedValue(expectedResult);

      const result = await controller.createVehicleAd(createDto, userId);

      expect(adsService.createVehicleAd).toHaveBeenCalledWith(
        createDto,
        userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createCommercialVehicleAd', () => {
    it('should create a commercial vehicle advertisement', async () => {
      const createDto: CreateCommercialVehicleAdDto = {
        title: 'Test Commercial Vehicle',
        description: 'Test Commercial Vehicle Description',
        price: 200000,
        location: 'Test Location',
        category: AdCategory.COMMERCIAL_VEHICLE,
        vehicleType: 'truck' as any,
        bodyType: 'flatbed' as any,
        manufacturerId: 'manufacturer-id',
        modelId: 'model-id',
        year: 2018,
        mileage: 100000,
        payloadCapacity: 10,
        axleCount: 2,
        transmissionTypeId: 'transmission-id',
        fuelTypeIds: ['fuel-type-id'],
      };

      const userId = 'user-id';
      const expectedResult = {
        id: 'ad-id',
        ...createDto,
        postedBy: userId,
        isActive: true,
        postedAt: new Date(),
        updatedAt: new Date(),
      };

      mockAdsService.createCommercialVehicleAd.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createCommercialVehicleAd(
        createDto,
        userId,
      );

      expect(adsService.createCommercialVehicleAd).toHaveBeenCalledWith(
        createDto,
        userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('uploadImages', () => {
    it('should upload images and return URLs', async () => {
      const mockFiles = [
        {
          fieldname: 'images',
          originalname: 'test1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        },
        {
          fieldname: 'images',
          originalname: 'test2.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        },
      ] as Express.Multer.File[];

      const expectedUrls = [
        'https://s3.amazonaws.com/bucket/test1.jpg',
        'https://s3.amazonaws.com/bucket/test2.jpg',
      ];

      mockS3Service.uploadFile.mockResolvedValueOnce(expectedUrls[0]);
      mockS3Service.uploadFile.mockResolvedValueOnce(expectedUrls[1]);

      const result = await controller.uploadImages(mockFiles);

      expect(s3Service.uploadFile).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ urls: expectedUrls });
    });
  });

  describe('update', () => {
    it('should update an advertisement', async () => {
      const id = 'ad-id';
      const updateDto = { title: 'Updated Title' };
      const userId = 'user-id';
      const expectedResult = {
        id,
        title: 'Updated Title',
        description: 'Test Description',
        price: 1000,
        category: AdCategory.PROPERTY,
        location: 'Test Location',
        isActive: true,
        postedAt: new Date(),
        updatedAt: new Date(),
        postedBy: userId,
      };

      mockAdsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto, userId);

      expect(adsService.update).toHaveBeenCalledWith(id, updateDto, userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMyAds', () => {
    it('should return user advertisements', async () => {
      const filters: FilterAdDto = { page: 1, limit: 20 };
      const userId = 'user-id';
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockAdsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.getMyAds(filters, userId);

      expect(adsService.findAll).toHaveBeenCalledWith({
        ...filters,
        postedBy: userId,
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
