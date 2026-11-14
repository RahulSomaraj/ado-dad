import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdsService } from './ads.service';
import { Ad, AdCategory, AdStatus } from '../schemas/ad.schema';
import { PropertyAd } from '../schemas/property-ad.schema';
import { VehicleAd } from '../schemas/vehicle-ad.schema';
import { CommercialVehicleAd } from '../schemas/commercial-vehicle-ad.schema';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { CreateAdDto } from '../dto/common/create-ad.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RedisService } from '../../shared/redis.service';
import { CommercialVehicleDetectionService } from './commercial-vehicle-detection.service';
import { GeocodingService } from '../../common/services/geocoding.service';
import { LocationHierarchyService } from '../../common/services/location-hierarchy.service';
import { Favorite } from '../../favorites/schemas/schema.favorite';
import { ChatRoom } from '../../chat/schemas/chat-room.schema';
import { ChatMessage } from '../../chat/schemas/chat-message.schema';
import { Types } from 'mongoose';

describe('AdsService', () => {
  let service: AdsService;

  const mockAdModel = {
    new: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockPropertyAdModel = {
    new: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockVehicleAdModel = {
    new: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCommercialVehicleAdModel = {
    new: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockVehicleInventoryService = {
    findManufacturerById: jest.fn(),
    findVehicleModelById: jest.fn(),
    findVehicleVariantById: jest.fn(),
    findTransmissionTypeById: jest.fn(),
    findFuelTypeById: jest.fn(),
  };

  const mockRedisService = {
    cacheGet: jest.fn(),
    cacheSet: jest.fn(),
    keys: jest.fn(),
    cacheDel: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockDetectionService = {
    detectCommercialVehicleDefaults: jest.fn().mockResolvedValue({ isCommercialVehicle: false }),
  };

  const mockGeocodingService = {
    reverseGeocode: jest.fn(),
  };

  const mockLocationHierarchyService = {
    getLocationFilter: jest.fn(),
    getLocationAggregationPipeline: jest.fn().mockReturnValue([]),
    getLocationScoringStage: jest.fn().mockReturnValue({ $addFields: { locationScore: 1 } }),
  };

  const mockFavoriteModel = {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockChatRoomModel = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockChatMessageModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        {
          provide: getModelToken(Ad.name),
          useValue: mockAdModel,
        },
        {
          provide: getModelToken(PropertyAd.name),
          useValue: mockPropertyAdModel,
        },
        {
          provide: getModelToken(VehicleAd.name),
          useValue: mockVehicleAdModel,
        },
        {
          provide: getModelToken(CommercialVehicleAd.name),
          useValue: mockCommercialVehicleAdModel,
        },
        {
          provide: getModelToken(Favorite.name),
          useValue: mockFavoriteModel,
        },
        {
          provide: getModelToken(ChatRoom.name),
          useValue: mockChatRoomModel,
        },
        {
          provide: getModelToken(ChatMessage.name),
          useValue: mockChatMessageModel,
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
          useValue: mockDetectionService,
        },
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
        {
          provide: LocationHierarchyService,
          useValue: mockLocationHierarchyService,
        },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAd', () => {
    it('should initialize ad with PENDING status', async () => {
      const createDto: CreateAdDto = {
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
          latitude: 0,
          longitude: 0,
        },
      };

      const mockId = new Types.ObjectId();
      const mockAdInstance = {
        _id: mockId,
        save: jest.fn().mockResolvedValue({ _id: mockId }),
      };

      // Mocking the model constructor
      (service as any).adModel = jest.fn().mockImplementation(() => mockAdInstance);
      (service as any).propertyAdModel = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({}),
      }));

      // In AdsService, it does: postedBy: new Types.ObjectId(userId)
      // So userId must be a 24-character hex string
      const userId = new Types.ObjectId().toString();

      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'test-id' } as any);
      mockRedisService.keys.mockResolvedValue([]);

      await service.createAd(createDto, userId);

      // Check if status: PENDING was passed to constructor
      expect((service as any).adModel).toHaveBeenCalledWith(expect.objectContaining({
        status: AdStatus.PENDING,
        isApproved: false,
      }));
    });
  });

  describe('updateAdApproval', () => {
    it('should set status to APPROVED when isApproved is true', async () => {
      const adId = new Types.ObjectId().toString();
      const adminId = new Types.ObjectId().toString();

      mockAdModel.findById = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(adId) });
      mockAdModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: adId });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: adId } as any);
      mockRedisService.keys.mockResolvedValue([]);

      await service.updateAdApproval(adId, true, adminId);

      expect(mockAdModel.findByIdAndUpdate).toHaveBeenCalledWith(
        adId,
        expect.objectContaining({
          status: AdStatus.APPROVED,
          isApproved: true,
          approvedBy: expect.any(Types.ObjectId),
        }),
        expect.any(Object),
      );
    });

    it('should set status to REJECTED when isApproved is false', async () => {
      const adId = new Types.ObjectId().toString();
      const adminId = new Types.ObjectId().toString();

      mockAdModel.findById = jest.fn().mockResolvedValue({ _id: new Types.ObjectId(adId) });
      mockAdModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: adId });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: adId } as any);
      mockRedisService.keys.mockResolvedValue([]);

      await service.updateAdApproval(adId, false, adminId);

      expect(mockAdModel.findByIdAndUpdate).toHaveBeenCalledWith(
        adId,
        expect.objectContaining({
          status: AdStatus.REJECTED,
          isApproved: false,
          approvedBy: null,
        }),
        expect.any(Object),
      );
    });
  });
});
