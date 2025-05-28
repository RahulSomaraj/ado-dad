import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Advertisement } from './schemas/advertisement.schema';
import { User } from '../users/schemas/user.schema';
import { Category } from 'src/category/schemas/category.schema';
import { VehicleAdv } from 'src/vehicles-adv/schemas/vehicleadv.schema';
import { Property } from 'src/property/schemas/schema.property';
import { FindAdvertisementsDto } from './dto/get-advertisement.dto';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { ADSTATUS } from './enums/advertisement.enum';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { NotFoundException } from '@nestjs/common/exceptions';

@Injectable()
export class AdvertisementsService {
  constructor(
    @InjectModel(Advertisement.name)
    private advertisementModel: Model<Advertisement>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(VehicleAdv.name) private vehicleAdvsModel: Model<VehicleAdv>,
    @InjectModel(Property.name) private propertiesModel: Model<Property>,
  ) {}

  async createAdvertisement(
    createAdvertisementDto: CreateAdvertisementDto,
    user: User,
  ): Promise<Advertisement> {
    try {
      const category = await this.categoryModel
        .findById(createAdvertisementDto.category)
        .exec();

      if (!category) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Category not found',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const advertisement = new this.advertisementModel({
        adTitle: 'Dummy', // You can update this to dynamic title if needed
        type: createAdvertisementDto.type,
        description: createAdvertisementDto.description,
        price: createAdvertisementDto.price,
        isApproved: false,
        category,
        createdBy: user,
        adStatus: ADSTATUS.AD_CREATED,
      });

      return await advertisement.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to create advertisement',
          message: error?.message || 'Unknown error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findVehicleAdvertisements(findDto: FindAdvertisementsDto) {
    const query: any = {};
    const vehicleAdv = findDto.vehicleAdv;

    // 1. Top-Level Filters
    if (vehicleAdv?.vendor) {
      query.vendor = vehicleAdv.vendor;
    }

    if (vehicleAdv?.name) {
      query.name = { $regex: vehicleAdv.name, $options: 'i' };
    }

    if (vehicleAdv?.modelName) {
      query.modelName = { $regex: vehicleAdv.modelName, $options: 'i' };
    }

    if (vehicleAdv?.modelYear) {
      query['details.modelYear'] = vehicleAdv.modelYear;
    }

    // 2. Nested vehicleModel Filters
    const vm = vehicleAdv?.vehicleModel;
    if (vm) {
      if (vm.name) {
        query['vehicleModel.name'] = { $regex: vm.name, $options: 'i' };
      }
      if (vm.modelName) {
        query['vehicleModel.modelName'] = {
          $regex: vm.modelName,
          $options: 'i',
        };
      }
      if (vm.modelDetails) {
        query['vehicleModel.modelDetails'] = {
          $regex: vm.modelDetails,
          $options: 'i',
        };
      }
      if (vm.fuelType) {
        query['vehicleModel.fuelType'] = vm.fuelType;
      }
      if (vm.transmissionType) {
        query['vehicleModel.transmissionType'] = vm.transmissionType;
      }
      if (vm.additionalInfo?.color) {
        query['vehicleModel.additionalInfo.color'] = {
          $regex: vm.additionalInfo.color,
          $options: 'i',
        };
      }
    }

    // 3. Generic Search
    if (findDto.search) {
      query.$or = [
        { name: { $regex: findDto.search, $options: 'i' } },
        { modelName: { $regex: findDto.search, $options: 'i' } },
        { 'vehicleModel.name': { $regex: findDto.search, $options: 'i' } },
      ];
    }

    // 4. Price Range
    if (findDto.minPrice !== undefined || findDto.maxPrice !== undefined) {
      query.price = {};
      if (findDto.minPrice !== undefined) {
        query.price.$gte = findDto.minPrice;
      }
      if (findDto.maxPrice !== undefined) {
        query.price.$lte = findDto.maxPrice;
      }
    }

    // 5. Pagination
    const page = Math.max(1, findDto.page || 1);
    const limit = Math.max(1, findDto.limit || 10);
    const skip = (page - 1) * limit;

    // 6. Projection
    const projection = {
      adTitle: 1,
      description: 1,
      price: 1,
      imageUrls: 1,
      type: 1,
      city: 1,
      district: 1,
      state: 1,
      isApproved: 1,
      createdAt: 1,
      vehicle: 1, // Include entire embedded vehicle object
      property: 1, // Include entire embedded property object
    };

    // 7. Execute and return results
    return this.advertisementModel
      .find(query)
      .select(projection)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<Advertisement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid Advertisement ID');
    }

    const advertisement = await this.advertisementModel.findById(id).exec();
    if (!advertisement) {
      throw new NotFoundException('Advertisement not found');
    }
    return advertisement;
  }

  async update(
    id: string,
    updateDto: UpdateAdvertisementDto,
    userId: string,
  ): Promise<Advertisement> {
    try {
      // Validate advertisement ID
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Invalid Advertisement ID' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Find the advertisement created by this user
      const advertisement = await this.advertisementModel.findOne({
        _id: id,
        createdBy: userId,
      });

      if (!advertisement) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Advertisement not found or not authorized to update',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Scalar and directly assignable fields
      const fieldsToUpdate: (keyof UpdateAdvertisementDto)[] = [
        'type',
        'modelType',
        'adTitle',
        'description',
        'price',
        'imageUrls',
        'state',
        'city',
        'district',
        'fuelType',
      ];

      for (const field of fieldsToUpdate) {
        if (updateDto[field] !== undefined) {
          (advertisement[field] as any) = updateDto[field];
        }
      }

      // Validate and update category if provided
      if (updateDto.category !== undefined) {
        const category = await this.categoryModel.findById(updateDto.category);
        if (!category) {
          throw new HttpException(
            { status: HttpStatus.BAD_REQUEST, error: 'Category not found' },
            HttpStatus.BAD_REQUEST,
          );
        }
        advertisement.category = category._id as Types.ObjectId;
      }

      const updatedAd = await advertisement.save();
      return updatedAd;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to update advertisement',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
