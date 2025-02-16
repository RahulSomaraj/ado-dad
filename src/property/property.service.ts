import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './schemas/schema.property';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async getAllProperties(query: any) {
    const filter = {};

    if (query.title) {
      filter['title'] = { $regex: query.title, $options: 'i' };
    }

    if (query.type) {
      filter['type'] = query.type;
    }

    if (query.category) {
      filter['category'] = query.category;
    }

    if (query.minPrice) {
      filter['price'] = { $gte: query.minPrice };
    }

    if (query.maxPrice) {
      filter['price'] = { $lte: query.maxPrice };
    }

    return await this.propertyModel
      .find(filter)
      .populate('owner', 'name email');
  }

  async getPropertyById(id: string) {
    return await this.propertyModel
      .findById(id)
      .populate('owner', 'name email');
  }

  async createProperty(
    createPropertyDto: CreatePropertyDto,
  ): Promise<Property> {
    // Validate that the owner exists.
    const owner = await this.userModel.findById(createPropertyDto.owner);
    if (!owner) {
      throw new HttpException('Owner not found', HttpStatus.BAD_REQUEST);
    }

    // Additional conditional validations:
    const propertyType = createPropertyDto.type;
    if (['house', 'apartment', 'pgAndGuestHouse'].includes(propertyType)) {
      if (!createPropertyDto.bhk) {
        throw new HttpException(
          'BHK is required for this property type',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!createPropertyDto.bathrooms) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bathrooms are required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!createPropertyDto.totalFloors) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Total floors are required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        createPropertyDto.floorNo === undefined ||
        createPropertyDto.floorNo === null
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Floor number is required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (propertyType !== 'land' && !createPropertyDto.projectStatus) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Project status is required for non-land properties',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const newProperty = new this.propertyModel(createPropertyDto);
      return await newProperty.save();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateProperty(
    propertyId: string,
    updatePropertyDto: UpdatePropertyDto,
  ): Promise<Property | {}> {
    // Retrieve the existing property
    const property = await this.propertyModel.findById(propertyId);
    if (!property) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Property not found',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Determine the effective property type after update.
    const effectiveType = updatePropertyDto.type || property.type;

    // For property types that require additional fields, check if the fields exist in the update payload or are already set.
    if (['house', 'apartment', 'pgAndGuestHouse'].includes(effectiveType)) {
      if (updatePropertyDto.bhk === undefined && property.bhk === undefined) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'BHK is required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        updatePropertyDto.bathrooms === undefined &&
        property.bathrooms === undefined
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bathrooms are required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        updatePropertyDto.totalFloors === undefined &&
        property.totalFloors === undefined
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Total floors are required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        (updatePropertyDto.floorNo === undefined ||
          updatePropertyDto.floorNo === null) &&
        (property.floorNo === undefined || property.floorNo === null)
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Floor number is required for this property type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (effectiveType !== 'land') {
      if (
        updatePropertyDto.projectStatus === undefined &&
        property.projectStatus === undefined
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Project status is required for non-land properties',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    try {
      const updatedProperty = await this.propertyModel.findByIdAndUpdate(
        propertyId,
        updatePropertyDto,
        { new: true, runValidators: true },
      );
      return updatedProperty ?? { };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteProperty(id: string) {
    return await this.propertyModel.findByIdAndDelete(id);
  }
}
