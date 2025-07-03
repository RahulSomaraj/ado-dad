import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PropertyType,
  PropertyTypeDocument,
} from '../schemas/property-type.schema';

// Minimal DTOs for type safety
export class CreatePropertyTypeDto {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export class UpdatePropertyTypeDto {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class LookupService {
  constructor(
    @InjectModel(PropertyType.name)
    private readonly propertyTypeModel: Model<PropertyTypeDocument>,
  ) {}

  // Property Type methods
  async getPropertyTypes(): Promise<PropertyType[]> {
    return this.propertyTypeModel
      .find({ isActive: true, isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async getPropertyTypeById(id: string): Promise<PropertyType> {
    const propertyType = await this.propertyTypeModel
      .findOne({ _id: id, isActive: true, isDeleted: false })
      .exec();

    if (!propertyType) {
      throw new NotFoundException(`Property type with ID ${id} not found`);
    }

    return propertyType;
  }

  async createPropertyType(
    createDto: CreatePropertyTypeDto,
  ): Promise<PropertyType> {
    // Prevent duplicate property type names (case-insensitive)
    const existing = await this.propertyTypeModel.findOne({
      name: new RegExp(`^${createDto.name}$`, 'i'),
      isDeleted: false,
    });
    if (existing) {
      throw new BadRequestException(
        `Property type with name '${createDto.name}' already exists`,
      );
    }
    const propertyType = new this.propertyTypeModel(createDto);
    return propertyType.save();
  }

  async updatePropertyType(
    id: string,
    updateDto: UpdatePropertyTypeDto,
  ): Promise<PropertyType> {
    const propertyType = await this.getPropertyTypeById(id);
    Object.assign(propertyType, updateDto);
    return (propertyType as PropertyTypeDocument).save();
  }

  async deletePropertyType(id: string): Promise<void> {
    const propertyType = await this.getPropertyTypeById(id);
    propertyType.isActive = false;
    propertyType.isDeleted = true;
    propertyType.deletedAt = new Date();
    await (propertyType as PropertyTypeDocument).save();
  }
}
