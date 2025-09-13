import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdsV2Controller } from '../src/ads-v2/ads.v2.controller';
import { CreateAdUc } from '../src/ads-v2/application/use-cases/create-ad.uc';
import {
  CreateAdV2Dto,
  AdCategoryV2,
} from '../src/ads-v2/dto/create-ad-v2.dto';

describe('AdsV2Controller (Unit)', () => {
  let controller: AdsV2Controller;
  let createAdUc: CreateAdUc;

  const mockUser = {
    id: '507f1f77bcf86cd799439021',
    _id: '507f1f77bcf86cd799439021',
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    userType: 'USER',
    role: 'USER',
  };

  const mockCreateAdResult = {
    id: '507f1f77bcf86cd799439011',
    title: 'Test Property Ad',
    description: 'Test Property Description',
    price: 5000000,
    location: 'Mumbai, Maharashtra',
    category: AdCategoryV2.PROPERTY,
    isActive: true,
    status: 'active',
    postedAt: new Date(),
    updatedAt: new Date(),
    postedBy: '507f1f77bcf86cd799439021',
    user: {
      id: '507f1f77bcf86cd799439021',
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
    },
    propertyDetails: {
      propertyType: 'apartment',
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

  beforeEach(async () => {
    const mockCreateAdUc = {
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdsV2Controller],
      providers: [
        {
          provide: CreateAdUc,
          useValue: mockCreateAdUc,
        },
      ],
    }).compile();

    controller = module.get<AdsV2Controller>(AdsV2Controller);
    createAdUc = module.get<CreateAdUc>(CreateAdUc);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create property ad successfully', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad - Beautiful 2BHK apartment',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property1.jpg',
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property2.jpg',
          ],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
          floor: 5,
          isFurnished: true,
          hasParking: true,
          hasGarden: false,
          amenities: ['Gym', 'Swimming Pool', 'Security', 'Lift'],
        },
      };

      const idempotencyKey = 'test-property-key-1';
      const req = { user: mockUser };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockCreateAdResult);

      const result = await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: mockUser.userType,
        idempotencyKey,
      });
      expect(result).toEqual(mockCreateAdResult);
    });

    it('should create private vehicle ad successfully', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PRIVATE_VEHICLE,
        data: {
          description: 'Test Private Vehicle V2 Ad - Honda City 2020 Model',
          price: 850000,
          location: 'Delhi, NCR',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle1.jpg',
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle2.jpg',
          ],
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
          additionalFeatures: [
            'Sunroof',
            'Leather Seats',
            'Navigation System',
            'Reverse Camera',
          ],
        },
      };

      const idempotencyKey = 'test-vehicle-key-1';
      const req = { user: mockUser };

      const mockVehicleResult = {
        ...mockCreateAdResult,
        category: AdCategoryV2.PRIVATE_VEHICLE,
        vehicleDetails: {
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
          additionalFeatures: [
            'Sunroof',
            'Leather Seats',
            'Navigation System',
            'Reverse Camera',
          ],
        },
      };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockVehicleResult);

      const result = await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: mockUser.userType,
        idempotencyKey,
      });
      expect(result).toEqual(mockVehicleResult);
    });

    it('should create commercial vehicle ad successfully', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.COMMERCIAL_VEHICLE,
        data: {
          description: 'Test Commercial Vehicle V2 Ad - Tata 407 Truck',
          price: 1800000,
          location: 'Pune, Maharashtra',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck1.jpg',
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck2.jpg',
          ],
        },
        commercial: {
          vehicleType: 'four_wheeler',
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
          additionalFeatures: [
            'GPS Tracking',
            'Climate Control',
            'Safety Features',
          ],
          commercialVehicleType: 'truck',
          bodyType: 'flatbed',
          payloadCapacity: 5000,
          payloadUnit: 'kg',
          axleCount: 2,
          hasFitness: true,
          hasPermit: true,
          seatingCapacity: 3,
        },
      };

      const idempotencyKey = 'test-commercial-key-1';
      const req = { user: mockUser };

      const mockCommercialResult = {
        ...mockCreateAdResult,
        category: AdCategoryV2.COMMERCIAL_VEHICLE,
        commercialVehicleDetails: {
          vehicleType: 'four_wheeler',
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
          additionalFeatures: [
            'GPS Tracking',
            'Climate Control',
            'Safety Features',
          ],
          commercialVehicleType: 'truck',
          bodyType: 'flatbed',
          payloadCapacity: 5000,
          payloadUnit: 'kg',
          axleCount: 2,
          hasFitness: true,
          hasPermit: true,
          seatingCapacity: 3,
        },
      };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockCommercialResult);

      const result = await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: mockUser.userType,
        idempotencyKey,
      });
      expect(result).toEqual(mockCommercialResult);
    });

    it('should create two-wheeler ad successfully', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.TWO_WHEELER,
        data: {
          description: 'Test Two Wheeler V2 Ad - Honda Activa 6G',
          price: 65000,
          location: 'Bangalore, Karnataka',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/scooter1.jpg',
          ],
        },
        vehicle: {
          vehicleType: 'two_wheeler',
          manufacturerId: '507f1f77bcf86cd799439031',
          modelId: '507f1f77bcf86cd799439041',
          variantId: '507f1f77bcf86cd799439051',
          year: 2021,
          mileage: 12000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'Red',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [
            'Digital Console',
            'LED Headlight',
            'Mobile Charging Port',
          ],
        },
      };

      const idempotencyKey = 'test-two-wheeler-key-1';
      const req = { user: mockUser };

      const mockTwoWheelerResult = {
        ...mockCreateAdResult,
        category: AdCategoryV2.TWO_WHEELER,
        vehicleDetails: {
          vehicleType: 'two_wheeler',
          manufacturerId: '507f1f77bcf86cd799439031',
          modelId: '507f1f77bcf86cd799439041',
          variantId: '507f1f77bcf86cd799439051',
          year: 2021,
          mileage: 12000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'Red',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [
            'Digital Console',
            'LED Headlight',
            'Mobile Charging Port',
          ],
        },
      };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockTwoWheelerResult);

      const result = await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: mockUser.userType,
        idempotencyKey,
      });
      expect(result).toEqual(mockTwoWheelerResult);
    });

    it('should handle missing user ID in request', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const idempotencyKey = 'test-property-key-1';
      const req = { user: null }; // Missing user

      await expect(
        controller.create(createAdDto, idempotencyKey, req),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing user ID property', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const idempotencyKey = 'test-property-key-1';
      const req = { user: {} }; // User without id

      await expect(
        controller.create(createAdDto, idempotencyKey, req),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle use case errors', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const idempotencyKey = 'test-property-key-1';
      const req = { user: mockUser };

      const error = new Error('Use case error');
      jest.spyOn(createAdUc, 'exec').mockRejectedValue(error);

      await expect(
        controller.create(createAdDto, idempotencyKey, req),
      ).rejects.toThrow(error);
    });

    it('should handle userType fallback to role', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const idempotencyKey = 'test-property-key-1';
      const req = { user: { ...mockUser, userType: undefined, role: 'ADMIN' } };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockCreateAdResult);

      await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: 'ADMIN',
        idempotencyKey,
      });
    });

    it('should handle userType fallback to USER', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const idempotencyKey = 'test-property-key-1';
      const req = {
        user: { ...mockUser, userType: undefined, role: undefined },
      };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockCreateAdResult);

      await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: 'USER',
        idempotencyKey,
      });
    });

    it('should handle undefined idempotency key', async () => {
      const createAdDto: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property V2 Ad',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      const idempotencyKey = undefined;
      const req = { user: mockUser };

      jest.spyOn(createAdUc, 'exec').mockResolvedValue(mockCreateAdResult);

      const result = await controller.create(createAdDto, idempotencyKey, req);

      expect(createAdUc.exec).toHaveBeenCalledWith({
        dto: createAdDto,
        userId: mockUser.id,
        userType: mockUser.userType,
        idempotencyKey: undefined,
      });
      expect(result).toEqual(mockCreateAdResult);
    });
  });
});
