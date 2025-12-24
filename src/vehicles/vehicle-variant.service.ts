import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VehicleVariant } from './schemas/vehicle-variant.schema';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import { UpdateVehicleVariantDto } from './dto/update-vehicle-variant.dto';
import { DuplicateEntityException } from '../common/exceptions/business.exceptions';

@Injectable()
export class VehicleVariantService {
  constructor(
    @InjectModel(VehicleVariant.name) private readonly variantModel: Model<VehicleVariant>,
  ) {}

  private buildUniqueQuery(dto: CreateVehicleVariantDto) {
    return {
      modelId: new Types.ObjectId(dto.modelId),
      fuelType: dto.fuelType,
      transmissionType: dto.transmissionType,
      featurePackage: dto.featurePackage,
    };
  }

  async create(createVariantDto: CreateVehicleVariantDto): Promise<VehicleVariant> {
    const existingVariant = await this.variantModel
      .findOne(this.buildUniqueQuery(createVariantDto))
      .exec();

    if (existingVariant) {
      throw new DuplicateEntityException(
        'Vehicle Variant',
        `modelId "${createVariantDto.modelId}", fuelType "${createVariantDto.fuelType}", transmissionType "${createVariantDto.transmissionType}", featurePackage "${createVariantDto.featurePackage}"`
      );
    }

    const newVariant = new this.variantModel(createVariantDto);
    return newVariant.save();
  }

  async createOrSkip(createVariantDto: CreateVehicleVariantDto): Promise<VehicleVariant | null> {
    const existingVariant = await this.variantModel
      .findOne(this.buildUniqueQuery(createVariantDto))
      .exec();

    if (existingVariant) {
      return null; // Skip if exists
    }

    const newVariant = new this.variantModel(createVariantDto);
    return newVariant.save();
  }

  async findByUniqueCombination(
    modelId: string,
    fuelType: string,
    transmissionType: string,
    featurePackage: string,
  ): Promise<VehicleVariant | null> {
    return this.variantModel
      .findOne({
        modelId: new Types.ObjectId(modelId),
        fuelType,
        transmissionType,
        featurePackage,
      })
      .exec();
  }

  async findAll(query?: { modelId?: string; fuelType?: string; transmissionType?: string; featurePackage?: string; isActive?: boolean }): Promise<VehicleVariant[]> {
    const filter: any = {};
    
    if (query?.modelId) {
      if (!Types.ObjectId.isValid(query.modelId)) {
        throw new NotFoundException(`Invalid model ID: ${query.modelId}`);
      }
      filter.modelId = new Types.ObjectId(query.modelId);
    } else {
      filter.modelId = { $exists: true, $ne: null };
    }
    
    if (query?.fuelType) {
      filter.fuelType = query.fuelType;
    }
    if (query?.transmissionType) {
      filter.transmissionType = query.transmissionType;
    }
    if (query?.featurePackage) {
      filter.featurePackage = query.featurePackage;
    }
    if (query?.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    return this.variantModel.find(filter).populate({
      path: 'modelId',
      select: 'name displayName vehicleType manufacturerId',
      populate: {
        path: 'manufacturerId',
        select: 'name displayName logo'
      }
    }).exec();
  }

  async findByModel(modelId: string): Promise<VehicleVariant[]> {
    if (!Types.ObjectId.isValid(modelId)) {
      throw new NotFoundException(`Invalid model ID: ${modelId}`);
    }
    return this.variantModel.find({ 
      modelId: new Types.ObjectId(modelId)
    }).populate({
      path: 'modelId',
      select: 'name displayName vehicleType manufacturerId',
      populate: {
        path: 'manufacturerId',
        select: 'name displayName logo'
      }
    }).exec();
  }

  async findOne(id: string): Promise<VehicleVariant> {
    const variant = await this.variantModel.findById(id).populate({
      path: 'modelId',
      select: 'name displayName vehicleType manufacturerId',
      populate: {
        path: 'manufacturerId',
        select: 'name displayName logo'
      }
    }).exec();
    if (!variant) {
      throw new NotFoundException(`Variant with id ${id} not found`);
    }
    return variant;
  }

  async update(id: string, updateVariantDto: UpdateVehicleVariantDto): Promise<VehicleVariant> {
    const updatedVariant = await this.variantModel
      .findByIdAndUpdate(id, updateVariantDto, { new: true })
      .populate({
        path: 'modelId',
        select: 'name displayName vehicleType manufacturerId',
        populate: {
          path: 'manufacturerId',
          select: 'name displayName logo'
        }
      })
      .exec();
    if (!updatedVariant) {
      throw new NotFoundException(`Variant with id ${id} not found`);
    }
    return updatedVariant;
  }

  async remove(id: string): Promise<void> {
    const result = await this.variantModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Variant with id ${id} not found`);
    }
  }
}

