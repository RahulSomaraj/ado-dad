import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

// Use case and dependencies
import { CreateAdUc } from '../application/use-cases/create-ad.uc';
import { AdRepository } from '../infrastructure/repos/ad.repo';
import { PropertyAdRepository } from '../infrastructure/repos/property-ad.repo';
import { VehicleAdRepository } from '../infrastructure/repos/vehicle-ad.repo';
import { CommercialVehicleAdRepository } from '../infrastructure/repos/commercial-vehicle-ad.repo';
import { VehicleInventoryGateway } from '../infrastructure/services/vehicle-inventory.gateway';
import { IdempotencyService } from '../infrastructure/services/idempotency.service';
import { AdsCache } from '../infrastructure/services/ads-cache';
import { CommercialIntentService } from '../infrastructure/services/commercial-intent.service';
import { OutboxService } from '../infrastructure/services/outbox.service';

// DTOs
import { CreateAdV2Dto, AdCategoryV2 } from '../dto/create-ad-v2.dto';

describe('CreateAdUc (Unit Tests)', () => {
  let useCase: CreateAdUc;
  let adRepo: jest.Mocked<AdRepository>;
  let propRepo: jest.Mocked<PropertyAdRepository>;
  let vehRepo: jest.Mocked<VehicleAdRepository>;
  let cvehRepo: jest.Mocked<CommercialVehicleAdRepository>;
  let inventory: jest.Mocked<VehicleInventoryGateway>;
  let idem: jest.Mocked<IdempotencyService>;
  let cache: jest.Mocked<AdsCache>;
  let intent: jest.Mocked<CommercialIntentService>;
  let outbox: jest.Mocked<OutboxService>;

  beforeEach(async () => {
    const mockAdRepo = {
      create: jest.fn(),
      startSession: jest.fn(),
      aggregateOneByIdDetailed: jest.fn(),
    };

    const mockPropRepo = {
      createFromDto: jest.fn(),
    };

    const mockVehRepo = {
      createFromDto: jest.fn(),
    };

    const mockCvehRepo = {
      createFromDto: jest.fn(),
    };

    const mockInventory = {
      assertRefs: jest.fn(),
      getModelName: jest.fn(),
    };

    const mockIdem = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockCache = {
      invalidateLists: jest.fn(),
    };

    const mockIntent = {
      applyIfCommercial: jest.fn(),
    };

    const mockOutbox = {
      enqueue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAdUc,
        { provide: AdRepository, useValue: mockAdRepo },
        { provide: PropertyAdRepository, useValue: mockPropRepo },
        { provide: VehicleAdRepository, useValue: mockVehRepo },
        { provide: CommercialVehicleAdRepository, useValue: mockCvehRepo },
        { provide: VehicleInventoryGateway, useValue: mockInventory },
        { provide: IdempotencyService, useValue: mockIdem },
        { provide: AdsCache, useValue: mockCache },
        { provide: CommercialIntentService, useValue: mockIntent },
        { provide: OutboxService, useValue: mockOutbox },
      ],
    }).compile();

    useCase = module.get<CreateAdUc>(CreateAdUc);
    adRepo = module.get(AdRepository);
    propRepo = module.get(PropertyAdRepository);
    vehRepo = module.get(VehicleAdRepository);
    cvehRepo = module.get(CommercialVehicleAdRepository);
    inventory = module.get(VehicleInventoryGateway);
    idem = module.get(IdempotencyService);
    cache = module.get(AdsCache);
    intent = module.get(CommercialIntentService);
    outbox = module.get(OutboxService);
  });

  describe('Property Advertisement', () => {
    it('should create property advertisement successfully', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Beautiful 2BHK Apartment',
          price: 8500000,
          location: 'Mumbai, Maharashtra',
          images: ['https://example.com/image1.jpg'],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
          floor: 8,
          isFurnished: true,
          hasParking: true,
          hasGarden: false,
          amenities: ['Gym', 'Swimming Pool'],
        },
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        endSession: jest.fn(),
        abortTransaction: jest.fn(),
      };

      const mockAd = {
        _id: new Types.ObjectId(),
        title: '2BHK Apartment in Mumbai',
        description: 'Beautiful 2BHK Apartment',
        price: 8500000,
        category: 'property',
      };

      const mockDetailedAd = {
        _id: mockAd._id,
        title: '2BHK Apartment in Mumbai',
        description: 'Beautiful 2BHK Apartment',
        price: 8500000,
        category: 'property',
        propertyDetails: [
          {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        ],
      };

      // Setup mocks
      adRepo.startSession.mockResolvedValue(mockSession as any);
      adRepo.create.mockResolvedValue(mockAd as any);
      propRepo.createFromDto.mockResolvedValue({} as any);
      adRepo.aggregateOneByIdDetailed.mockResolvedValue(mockDetailedAd);
      intent.applyIfCommercial.mockResolvedValue(dto);

      const result = await useCase.exec({
        dto,
        userId: '507f1f77bcf86cd799439021',
        userType: 'USER',
      });

      expect(adRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '2BHK Apartment in Mumbai',
          description: 'Beautiful 2BHK Apartment',
          price: 8500000,
          category: 'property',
        }),
        { session: mockSession },
      );

      expect(propRepo.createFromDto).toHaveBeenCalledWith(
        mockAd._id,
        dto.property,
        { session: mockSession },
      );

      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(cache.invalidateLists).toHaveBeenCalled();
      expect(outbox.enqueue).toHaveBeenCalledWith(
        'ad.created',
        expect.any(Object),
      );

      expect(result.id).toBe(mockAd._id.toString());
      expect(result.category).toBe('property');
    });

    it('should fail with missing property data', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Beautiful 2BHK Apartment',
          price: 8500000,
          location: 'Mumbai, Maharashtra',
        },
        // Missing property data
      };

      await expect(
        useCase.exec({
          dto,
          userId: '507f1f77bcf86cd799439021',
          userType: 'USER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Vehicle Advertisement', () => {
    it('should create vehicle advertisement successfully', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PRIVATE_VEHICLE,
        data: {
          description: 'Honda City 2020 Model',
          price: 850000,
          location: 'Delhi, NCR',
          images: ['https://example.com/vehicle1.jpg'],
        },
        vehicle: {
          vehicleType: 'four_wheeler',
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

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        endSession: jest.fn(),
        abortTransaction: jest.fn(),
      };

      const mockAd = {
        _id: new Types.ObjectId(),
        title: 'Honda City 2020 (White)',
        description: 'Honda City 2020 Model',
        price: 850000,
        category: 'private_vehicle',
      };

      const mockDetailedAd = {
        _id: mockAd._id,
        title: 'Honda City 2020 (White)',
        description: 'Honda City 2020 Model',
        price: 850000,
        category: 'private_vehicle',
        vehicleDetails: [
          {
            vehicleType: 'four_wheeler',
            manufacturerId: '507f1f77bcf86cd799439031',
            modelId: '507f1f77bcf86cd799439041',
            year: 2020,
            color: 'White',
          },
        ],
      };

      // Setup mocks
      adRepo.startSession.mockResolvedValue(mockSession as any);
      adRepo.create.mockResolvedValue(mockAd as any);
      vehRepo.createFromDto.mockResolvedValue({} as any);
      adRepo.aggregateOneByIdDetailed.mockResolvedValue(mockDetailedAd);
      intent.applyIfCommercial.mockResolvedValue(dto);
      inventory.assertRefs.mockResolvedValue(undefined);
      inventory.getModelName.mockResolvedValue('Honda City');

      const result = await useCase.exec({
        dto,
        userId: '507f1f77bcf86cd799439021',
        userType: 'USER',
      });

      expect(inventory.assertRefs).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439031',
        '507f1f77bcf86cd799439041',
        '507f1f77bcf86cd799439051',
        '507f1f77bcf86cd799439061',
        '507f1f77bcf86cd799439071',
      );

      expect(vehRepo.createFromDto).toHaveBeenCalledWith(
        mockAd._id,
        dto.vehicle,
        { session: mockSession },
      );

      expect(result.id).toBe(mockAd._id.toString());
      expect(result.category).toBe('private_vehicle');
    });

    it('should fail with invalid inventory references', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PRIVATE_VEHICLE,
        data: {
          description: 'Honda City 2020 Model',
          price: 850000,
          location: 'Delhi, NCR',
        },
        vehicle: {
          vehicleType: 'four_wheeler',
          manufacturerId: 'invalid-id',
          modelId: '507f1f77bcf86cd799439041',
          year: 2020,
          mileage: 25000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'White',
        },
      };

      inventory.assertRefs.mockRejectedValue(
        new BadRequestException('Invalid manufacturer ID'),
      );

      await expect(
        useCase.exec({
          dto,
          userId: '507f1f77bcf86cd799439021',
          userType: 'USER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Idempotency', () => {
    it('should return cached result for duplicate idempotency key', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property',
          price: 5000000,
          location: 'Test Location',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      const cachedResult = {
        id: '507f1f77bcf86cd799439011',
        description: 'Test Property',
        category: 'property',
      };

      idem.get.mockResolvedValue(cachedResult);

      const result = await useCase.exec({
        dto,
        userId: '507f1f77bcf86cd799439021',
        userType: 'USER',
        idempotencyKey: 'test-key-123',
      });

      expect(idem.get).toHaveBeenCalledWith('ads:v2:create:test-key-123');
      expect(result).toBe(cachedResult);
      expect(adRepo.create).not.toHaveBeenCalled();
    });

    it('should store result in idempotency cache', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property',
          price: 5000000,
          location: 'Test Location',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        endSession: jest.fn(),
        abortTransaction: jest.fn(),
      };

      const mockAd = {
        _id: new Types.ObjectId(),
        title: 'Test Property',
        description: 'Test Property',
        price: 5000000,
        category: 'property',
      };

      const mockDetailedAd = {
        _id: mockAd._id,
        title: 'Test Property',
        description: 'Test Property',
        price: 5000000,
        category: 'property',
      };

      // Setup mocks
      idem.get.mockResolvedValue(null);
      adRepo.startSession.mockResolvedValue(mockSession as any);
      adRepo.create.mockResolvedValue(mockAd as any);
      propRepo.createFromDto.mockResolvedValue({} as any);
      adRepo.aggregateOneByIdDetailed.mockResolvedValue(mockDetailedAd);
      intent.applyIfCommercial.mockResolvedValue(dto);

      await useCase.exec({
        dto,
        userId: '507f1f77bcf86cd799439021',
        userType: 'USER',
        idempotencyKey: 'test-key-456',
      });

      expect(idem.set).toHaveBeenCalledWith(
        'ads:v2:create:test-key-456',
        expect.any(Object),
        900, // 15 minutes TTL
      );
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback transaction on error', async () => {
      const dto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property',
          price: 5000000,
          location: 'Test Location',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        endSession: jest.fn(),
        abortTransaction: jest.fn(),
      };

      // Setup mocks
      adRepo.startSession.mockResolvedValue(mockSession as any);
      adRepo.create.mockResolvedValue({ _id: new Types.ObjectId() } as any);
      propRepo.createFromDto.mockRejectedValue(new Error('Database error'));
      intent.applyIfCommercial.mockResolvedValue(dto);

      await expect(
        useCase.exec({
          dto,
          userId: '507f1f77bcf86cd799439021',
          userType: 'USER',
        }),
      ).rejects.toThrow('Database error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
