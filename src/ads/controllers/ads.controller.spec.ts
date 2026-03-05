import { Test, TestingModule } from '@nestjs/testing';
import { AdsController } from './ads.controller';
import { AdsService } from '../services/ads.service';
import { S3Service } from '../../shared/s3.service';
import { AdCategory } from '../schemas/ad.schema';
import { DataValidationService } from '../services/data-validation.service';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { UpdateAdApprovalDto } from '../dto/common/update-ad-approval.dto';
import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

describe('AdsController', () => {
  let controller: AdsController;
  let adsService: AdsService;
  let s3Service: S3Service;

  const mockAdsService = {
    createAd: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    getUserAds: jest.fn(),
    updateAdApproval: jest.fn(),
    getAdById: jest.fn(),
    updateSoldOut: jest.fn(),
    updateAd: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
  };

  const mockDataValidationService = {
    validateDataConsistency: jest.fn(),
    generateConsistencyReport: jest.fn(),
    cleanupOrphanedAds: jest.fn(),
  };

  const mockVehicleInventoryService = {
    findAllManufacturers: jest.fn(),
    findManufacturerById: jest.fn(),
    findAllVehicleModels: jest.fn(),
    findVehicleModelById: jest.fn(),
    findAllVehicleVariants: jest.fn(),
    findVehicleVariantById: jest.fn(),
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
        {
          provide: DataValidationService,
          useValue: mockDataValidationService,
        },
        {
          provide: VehicleInventoryService,
          useValue: mockVehicleInventoryService,
        },
      ],
    }).compile();

    controller = module.get<AdsController>(AdsController);
    adsService = module.get<AdsService>(AdsService);
    s3Service = module.get<S3Service>(S3Service);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllAds', () => {
    it('should return paginated advertisements', async () => {
      const filters = { page: 1, limit: 20 };
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

      const result = await controller.getAllAds(filters as any);

      expect(adsService.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createAd', () => {
    it('should create an advertisement', async () => {
      const createDto = {
        category: AdCategory.PROPERTY,
        data: {
          title: 'Test Property',
          description: 'Test Property Description',
          price: 100000,
          location: 'Test Location',
          propertyType: 'apartment' as any,
          bedrooms: 2,
          bathrooms: 1,
          areaSqft: 1000,
        },
      };

      const userId = new Types.ObjectId().toString();
      const expectedResult = {
        id: 'ad-id',
        ...createDto.data,
        postedBy: userId,
        isActive: true,
      };

      mockAdsService.createAd.mockResolvedValue(expectedResult);

      const result = await controller.createAd(createDto as any, { user: { id: userId } } as any);

      expect(adsService.createAd).toHaveBeenCalledWith(createDto, userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateAd', () => {
    it('should update an advertisement', async () => {
      const id = new Types.ObjectId().toString();
      const updateDto = { title: 'Updated Title' };
      const userId = new Types.ObjectId().toString();
      const expectedResult = {
        id,
        title: 'Updated Title',
        postedBy: userId,
      };

      mockAdsService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateAd(id, updateDto as any, { user: { id: userId, type: 'user' } } as any);

      expect(adsService.update).toHaveBeenCalledWith(id, updateDto, userId, 'user');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMyAds', () => {
    it('should return user advertisements with showUnapproved defaulting to true', async () => {
      const filters = { page: 1, limit: 20 };
      const userId = new Types.ObjectId().toString();
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockAdsService.getUserAds.mockResolvedValue(expectedResult);

      const result = await controller.getMyAds({ user: { id: userId } } as any, filters);

      expect(adsService.getUserAds).toHaveBeenCalledWith(userId, {
        ...filters,
        showUnapproved: true,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateAdApproval', () => {
    it('should update ad approval status', async () => {
      const id = new Types.ObjectId().toString();
      const updateDto: UpdateAdApprovalDto = { isApproved: true };
      const userId = new Types.ObjectId().toString();
      const expectedResult = { id, isApproved: true } as any;

      mockAdsService.updateAdApproval.mockResolvedValue(expectedResult);

      const result = await controller.updateAdApproval(id, updateDto.isApproved, { user: { id: userId } } as any);

      expect(adsService.updateAdApproval).toHaveBeenCalledWith(id, true, userId);
      expect(result).toEqual(expectedResult);
    });
  });
});
