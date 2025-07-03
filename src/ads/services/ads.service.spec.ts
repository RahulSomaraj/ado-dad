import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdsService } from './ads.service';
import { Ad } from '../schemas/ad.schema';
import { PropertyAd } from '../schemas/property-ad.schema';
import { VehicleAd } from '../schemas/vehicle-ad.schema';
import { CommercialVehicleAd } from '../schemas/commercial-vehicle-ad.schema';
import { PropertyType } from '../schemas/property-type.schema';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { BadRequestException } from '@nestjs/common';

describe('AdsService', () => {
  let service: AdsService;

  const mockAdModel = {
    new: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndDelete: jest.fn(),
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

  const mockPropertyTypeModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    new: jest.fn(),
    save: jest.fn(),
  };

  const mockVehicleInventoryService = {
    findManufacturerById: jest.fn(),
    findVehicleModelById: jest.fn(),
    findVehicleVariantById: jest.fn(),
    findTransmissionTypeById: jest.fn(),
    findFuelTypeById: jest.fn(),
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
          provide: getModelToken(PropertyType.name),
          useValue: mockPropertyTypeModel,
        },
        {
          provide: VehicleInventoryService,
          useValue: mockVehicleInventoryService,
        },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVehicleAd', () => {
    it('should create a vehicle ad with valid vehicle inventory references', async () => {
      const createDto: CreateVehicleAdDto = {
        title: 'Test Vehicle',
        description: 'Test Description',
        price: 50000,
        location: 'Test Location',
        manufacturerId: '507f1f77bcf86cd799439011',
        modelId: '507f1f77bcf86cd799439012',
        variantId: '507f1f77bcf86cd799439013',
        year: 2020,
        mileage: 50000,
        transmissionTypeId: '507f1f77bcf86cd799439014',
        fuelTypeId: '507f1f77bcf86cd799439015',
        vehicleType: 'four_wheeler' as any,
        color: 'Red',
        isFirstOwner: true,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: 'Test features',
      };

      const mockAd = { _id: 'test-id', ...createDto } as any;
      const mockVehicleAd = { _id: 'test-id', ...createDto } as any;

      mockVehicleInventoryService.findManufacturerById.mockResolvedValue({
        _id: createDto.manufacturerId,
      });
      mockVehicleInventoryService.findVehicleModelById.mockResolvedValue({
        _id: createDto.modelId,
      });
      mockVehicleInventoryService.findVehicleVariantById.mockResolvedValue({
        _id: createDto.variantId,
      });
      mockVehicleInventoryService.findTransmissionTypeById.mockResolvedValue({
        _id: createDto.transmissionTypeId,
      });
      mockVehicleInventoryService.findFuelTypeById.mockResolvedValue({
        _id: createDto.fuelTypeId,
      });

      mockAdModel.new.mockReturnValue(mockAd);
      mockAdModel.save.mockResolvedValue(mockAd);
      mockVehicleAdModel.new.mockReturnValue(mockVehicleAd);
      mockVehicleAdModel.save.mockResolvedValue(mockVehicleAd);

      const result = await service.createVehicleAd(createDto, 'user-id');

      expect(
        mockVehicleInventoryService.findManufacturerById,
      ).toHaveBeenCalledWith(createDto.manufacturerId);
      expect(
        mockVehicleInventoryService.findVehicleModelById,
      ).toHaveBeenCalledWith(createDto.modelId);
      expect(
        mockVehicleInventoryService.findVehicleVariantById,
      ).toHaveBeenCalledWith(createDto.variantId);
      expect(
        mockVehicleInventoryService.findTransmissionTypeById,
      ).toHaveBeenCalledWith(createDto.transmissionTypeId);
      expect(mockVehicleInventoryService.findFuelTypeById).toHaveBeenCalledWith(
        createDto.fuelTypeId,
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid vehicle inventory references', async () => {
      const createDto: CreateVehicleAdDto = {
        title: 'Test Vehicle',
        description: 'Test Description',
        price: 50000,
        location: 'Test Location',
        manufacturerId: 'invalid-id',
        modelId: '507f1f77bcf86cd799439012',
        year: 2020,
        mileage: 50000,
        transmissionTypeId: '507f1f77bcf86cd799439014',
        fuelTypeId: '507f1f77bcf86cd799439015',
        vehicleType: 'four_wheeler' as any,
        color: 'Red',
        isFirstOwner: true,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: 'Test features',
      };

      mockVehicleInventoryService.findManufacturerById.mockRejectedValue(
        new Error('Manufacturer not found'),
      );

      await expect(
        service.createVehicleAd(createDto, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCommercialVehicleAd', () => {
    it('should create a commercial vehicle ad with valid vehicle inventory references', async () => {
      const createDto: CreateCommercialVehicleAdDto = {
        title: 'Test Commercial Vehicle',
        description: 'Test Description',
        price: 500000,
        location: 'Test Location',
        vehicleType: 'truck' as any,
        bodyType: 'flatbed' as any,
        manufacturerId: '507f1f77bcf86cd799439011',
        modelId: '507f1f77bcf86cd799439012',
        variantId: '507f1f77bcf86cd799439013',
        year: 2020,
        mileage: 100000,
        payloadCapacity: 5000,
        payloadUnit: 'kg',
        axleCount: 2,
        transmissionTypeId: '507f1f77bcf86cd799439014',
        fuelTypeId: '507f1f77bcf86cd799439015',
        color: 'White',
        hasInsurance: true,
        hasFitness: true,
        hasPermit: true,
        additionalFeatures: 'Test features',
        seatingCapacity: 3,
      };

      const mockAd = { _id: 'test-id', ...createDto } as any;
      const mockCommercialVehicleAd = { _id: 'test-id', ...createDto } as any;

      mockVehicleInventoryService.findManufacturerById.mockResolvedValue({
        _id: createDto.manufacturerId,
      });
      mockVehicleInventoryService.findVehicleModelById.mockResolvedValue({
        _id: createDto.modelId,
      });
      mockVehicleInventoryService.findVehicleVariantById.mockResolvedValue({
        _id: createDto.variantId,
      });
      mockVehicleInventoryService.findTransmissionTypeById.mockResolvedValue({
        _id: createDto.transmissionTypeId,
      });
      mockVehicleInventoryService.findFuelTypeById.mockResolvedValue({
        _id: createDto.fuelTypeId,
      });

      mockAdModel.new.mockReturnValue(mockAd);
      mockAdModel.save.mockResolvedValue(mockAd);
      mockCommercialVehicleAdModel.new.mockReturnValue(mockCommercialVehicleAd);
      mockCommercialVehicleAdModel.save.mockResolvedValue(
        mockCommercialVehicleAd,
      );

      const result = await service.createCommercialVehicleAd(
        createDto,
        'user-id',
      );

      expect(
        mockVehicleInventoryService.findManufacturerById,
      ).toHaveBeenCalledWith(createDto.manufacturerId);
      expect(
        mockVehicleInventoryService.findVehicleModelById,
      ).toHaveBeenCalledWith(createDto.modelId);
      expect(
        mockVehicleInventoryService.findVehicleVariantById,
      ).toHaveBeenCalledWith(createDto.variantId);
      expect(
        mockVehicleInventoryService.findTransmissionTypeById,
      ).toHaveBeenCalledWith(createDto.transmissionTypeId);
      expect(mockVehicleInventoryService.findFuelTypeById).toHaveBeenCalledWith(
        createDto.fuelTypeId,
      );
      expect(result).toBeDefined();
    });
  });
});
