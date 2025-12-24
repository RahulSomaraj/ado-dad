import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { VehicleModelDocument } from './schemas/schema.model';
import { DuplicateEntityException, EntityNotFoundException } from '../common/exceptions/business.exceptions';

@Injectable()
export class ModelService {
  constructor(
    @InjectModel('Model') private readonly modelModel: Model<VehicleModelDocument>,
  ) {}

  async create(createModelDto: CreateModelDto): Promise<VehicleModelDocument> {
    const existingModel = await this.findByName(createModelDto.name);
    if (existingModel) {
      throw new DuplicateEntityException('Vehicle Model', `name "${createModelDto.name}"`);
    }
    
    const newModel = new this.modelModel(createModelDto);
    return newModel.save();
  }

  async createOrSkip(createModelDto: CreateModelDto): Promise<VehicleModelDocument | null> {
    const existingModel = await this.findByName(createModelDto.name);
    if (existingModel) {
      return null; // Skip if exists
    }
    
    const newModel = new this.modelModel(createModelDto);
    return newModel.save();
  }

  async findByName(name: string): Promise<VehicleModelDocument | null> {
    return this.modelModel.findOne({ name }).exec();
  }

  async findAll(query: { manufacturerId?: string; fuelType?: string; launchYear?: string; vehicleType?: string; isActive?: boolean; pagination?: { page: number; limit: number }; sortOptions?: any }): Promise<VehicleModelDocument[]> {
    const filter: any = {};
    
    if (query.manufacturerId) {
      if (!Types.ObjectId.isValid(query.manufacturerId)) {
        throw new EntityNotFoundException('Manufacturer', `ID "${query.manufacturerId}"`);
      }
      filter.manufacturerId = new Types.ObjectId(query.manufacturerId);
    } else {
      filter.manufacturerId = { $exists: true, $ne: null };
    }
    
    if (query.fuelType) {
      filter.fuelTypes = query.fuelType;
    }
    if (query.launchYear) {
      filter.launchYear = parseInt(query.launchYear, 10);
    }
    if (query.vehicleType) {
      filter.vehicleType = query.vehicleType;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const modelsQuery = this.modelModel.find(filter).populate({
      path: 'manufacturerId',
      select: 'name displayName logo isActive'
    });

    if (query.sortOptions) {
      modelsQuery.sort(query.sortOptions);
    }

    if (query.pagination) {
      const { page, limit } = query.pagination;
      modelsQuery.skip((page - 1) * limit).limit(limit);
    }

    return modelsQuery.exec();
  }

  async findByManufacturer(manufacturerId: string): Promise<VehicleModelDocument[]> {
    if (!Types.ObjectId.isValid(manufacturerId)) {
      throw new EntityNotFoundException('Manufacturer', `ID "${manufacturerId}"`);
    }
    return this.modelModel.find({ 
      manufacturerId: new Types.ObjectId(manufacturerId)
    }).populate({
      path: 'manufacturerId',
      select: 'name displayName logo isActive'
    }).exec();
  }

  async findOne(id: string): Promise<VehicleModelDocument> {
    const model = await this.modelModel.findById(id).populate({
      path: 'manufacturerId',
      select: 'name displayName logo isActive'
    }).exec();
    if (!model) {
      throw new NotFoundException(`Model with id ${id} not found`);
    }
    return model;
  }

  async update(id: string, updateModelDto: UpdateModelDto): Promise<VehicleModelDocument> {
    const updatedModel = await this.modelModel.findByIdAndUpdate(id, updateModelDto, { new: true })
      .populate({
        path: 'manufacturerId',
        select: 'name displayName logo isActive'
      })
      .exec();
    if (!updatedModel) {
      throw new NotFoundException(`Model with id ${id} not found`);
    }
    return updatedModel;
  }

  async remove(id: string): Promise<void> {
    const result = await this.modelModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Model with id ${id} not found`);
    }
  }
}
