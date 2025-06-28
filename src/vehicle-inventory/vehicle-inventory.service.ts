import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Manufacturer,
  ManufacturerDocument,
} from './schemas/manufacturer.schema';
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
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';

@Injectable()
export class VehicleInventoryService {
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
  ) {}

  // Manufacturer methods
  async createManufacturer(
    createManufacturerDto: CreateManufacturerDto,
  ): Promise<Manufacturer> {
    const manufacturer = new this.manufacturerModel(createManufacturerDto);
    return manufacturer.save();
  }

  async findAllManufacturers(): Promise<Manufacturer[]> {
    return this.manufacturerModel
      .find({ isActive: true, isDeleted: false })
      .sort({ name: 1 })
      .exec();
  }

  async findManufacturerById(id: string): Promise<Manufacturer> {
    const manufacturer = await this.manufacturerModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .exec();
    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with id ${id} not found`);
    }
    return manufacturer;
  }

  // Vehicle Model methods
  async createVehicleModel(
    createVehicleModelDto: CreateVehicleModelDto,
  ): Promise<VehicleModel> {
    const vehicleModel = new this.vehicleModelModel(createVehicleModelDto);
    return vehicleModel.save();
  }

  async findAllVehicleModels(manufacturerId?: string): Promise<VehicleModel[]> {
    const filter: any = { isActive: true, isDeleted: false };
    if (manufacturerId) {
      filter.manufacturer = manufacturerId;
    }

    return this.vehicleModelModel
      .find(filter)
      .populate('manufacturer', 'name displayName logo')
      .sort({ displayName: 1 })
      .exec();
  }

  async findVehicleModelById(id: string): Promise<VehicleModel> {
    const vehicleModel = await this.vehicleModelModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .populate('manufacturer', 'name displayName logo')
      .exec();
    if (!vehicleModel) {
      throw new NotFoundException(`Vehicle model with id ${id} not found`);
    }
    return vehicleModel;
  }

  // Vehicle Variant methods
  async createVehicleVariant(
    createVehicleVariantDto: CreateVehicleVariantDto,
  ): Promise<VehicleVariant> {
    const vehicleVariant = new this.vehicleVariantModel(
      createVehicleVariantDto,
    );
    return vehicleVariant.save();
  }

  async findAllVehicleVariants(
    modelId?: string,
    fuelTypeId?: string,
    transmissionTypeId?: string,
    maxPrice?: number,
  ): Promise<VehicleVariant[]> {
    const filter: any = { isActive: true, isDeleted: false };

    if (modelId) filter.vehicleModel = modelId;
    if (fuelTypeId) filter.fuelType = fuelTypeId;
    if (transmissionTypeId) filter.transmissionType = transmissionTypeId;
    if (maxPrice) filter.price = { $lte: maxPrice };

    return this.vehicleVariantModel
      .find(filter)
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .sort({ price: 1 })
      .exec();
  }

  async findVehicleVariantById(id: string): Promise<VehicleVariant> {
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

  // Advanced query methods for the requirements
  async findDieselVariantsByModel(
    modelName: string,
  ): Promise<VehicleVariant[]> {
    const dieselFuelType = await this.fuelTypeModel
      .findOne({ name: 'Diesel', isActive: true })
      .exec();
    if (!dieselFuelType) {
      throw new NotFoundException('Diesel fuel type not found');
    }

    const model = await this.vehicleModelModel
      .findOne({
        name: { $regex: new RegExp(modelName, 'i') },
        isActive: true,
        isDeleted: false,
      })
      .exec();

    if (!model) {
      throw new NotFoundException(`Model ${modelName} not found`);
    }

    return this.vehicleVariantModel
      .find({
        vehicleModel: model._id,
        fuelType: dieselFuelType._id,
        isActive: true,
        isDeleted: false,
      })
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .sort({ price: 1 })
      .exec();
  }

  async findCNGVariantsUnderPrice(maxPrice: number): Promise<VehicleVariant[]> {
    const cngFuelType = await this.fuelTypeModel
      .findOne({ name: 'CNG', isActive: true })
      .exec();
    if (!cngFuelType) {
      throw new NotFoundException('CNG fuel type not found');
    }

    return this.vehicleVariantModel
      .find({
        fuelType: cngFuelType._id,
        price: { $lte: maxPrice },
        isActive: true,
        isDeleted: false,
      })
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .sort({ price: 1 })
      .exec();
  }

  async findModelsWithMultipleFuelTypes(
    manufacturerId: string,
  ): Promise<any[]> {
    const petrolFuelType = await this.fuelTypeModel
      .findOne({ name: 'Petrol', isActive: true })
      .exec();
    const cngFuelType = await this.fuelTypeModel
      .findOne({ name: 'CNG', isActive: true })
      .exec();

    if (!petrolFuelType || !cngFuelType) {
      throw new NotFoundException('Required fuel types not found');
    }

    // Find models that have both petrol and CNG variants
    const modelsWithPetrol = await this.vehicleVariantModel.distinct(
      'vehicleModel',
      {
        fuelType: petrolFuelType._id,
        isActive: true,
        isDeleted: false,
      },
    );

    const modelsWithCNG = await this.vehicleVariantModel.distinct(
      'vehicleModel',
      {
        fuelType: cngFuelType._id,
        isActive: true,
        isDeleted: false,
      },
    );

    const modelsWithBoth = modelsWithPetrol.filter((modelId) =>
      modelsWithCNG.includes(modelId),
    );

    // Get model details
    const models = await this.vehicleModelModel
      .find({
        _id: { $in: modelsWithBoth },
        manufacturer: manufacturerId,
        isActive: true,
        isDeleted: false,
      })
      .populate('manufacturer', 'name displayName')
      .exec();

    return models;
  }

  // Lookup methods
  async findAllFuelTypes(): Promise<FuelType[]> {
    return this.fuelTypeModel
      .find({ isActive: true, isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findAllTransmissionTypes(): Promise<TransmissionType[]> {
    return this.transmissionTypeModel
      .find({ isActive: true, isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  // Search and filter methods
  async searchVariants(query: string): Promise<VehicleVariant[]> {
    return this.vehicleVariantModel
      .find({
        $or: [
          { name: { $regex: new RegExp(query, 'i') } },
          { displayName: { $regex: new RegExp(query, 'i') } },
        ],
        isActive: true,
        isDeleted: false,
      })
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .sort({ price: 1 })
      .exec();
  }

  async getPriceRange(): Promise<{ min: number; max: number }> {
    const result = await this.vehicleVariantModel
      .aggregate([
        { $match: { isActive: true, isDeleted: false } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ])
      .exec();

    return result.length > 0
      ? { min: result[0].minPrice, max: result[0].maxPrice }
      : { min: 0, max: 0 };
  }
}
