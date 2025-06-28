import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Advertisement } from './schemas/advertisement.schema';
import { User } from '../users/schemas/user.schema';
import { Category } from 'src/category/schemas/category.schema';
import { Property } from 'src/property/schemas/schema.property';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { FilterAdvertisementDto } from './dto/filter-advertisement.dto';

@Injectable()
export class AdvertisementsService {
  constructor(
    @InjectModel(Advertisement.name)
    private advertisementModel: Model<Advertisement>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Property.name) private propertiesModel: Model<Property>,
  ) {}

  async create(
    createAdDto: CreateAdvertisementDto,
    user: User,
  ): Promise<Advertisement> {
    try {
      // Validate category exists
      const category = await this.categoryModel.findById(createAdDto.category);
      if (!category) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Category not found' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create advertisement with embedded documents
      const advertisement = new this.advertisementModel({
        ...createAdDto,
        category: category._id,
        createdBy: user._id,
        isApproved: createAdDto.isApproved || false,
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

  async findAll(filters: FilterAdvertisementDto): Promise<{
    data: Advertisement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      // Basic filters
      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.category) {
        query.category = new Types.ObjectId(filters.category);
      }

      if (filters.state) {
        query.state = { $regex: filters.state, $options: 'i' };
      }

      if (filters.city) {
        query.city = { $regex: filters.city, $options: 'i' };
      }

      if (filters.district) {
        query.district = { $regex: filters.district, $options: 'i' };
      }

      if (filters.isApproved !== undefined) {
        query.isApproved = filters.isApproved;
      }

      // Price range filter
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        query.price = {};
        if (filters.priceMin !== undefined) {
          query.price.$gte = filters.priceMin;
        }
        if (filters.priceMax !== undefined) {
          query.price.$lte = filters.priceMax;
        }
      }

      // Search filter
      if (filters.search) {
        query.$or = [
          { adTitle: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { name: { $regex: filters.search, $options: 'i' } },
        ];
      }

      // Vehicle-specific filters
      if (filters.type === 'Vehicle' || !filters.type) {
        if (filters.fuelType) {
          query['vehicle.vehicleModel.fuelType'] = filters.fuelType;
        }

        if (filters.transmissionType) {
          query['vehicle.vehicleModel.transmissionType'] =
            filters.transmissionType;
        }

        if (filters.vehicleBrand) {
          query['vehicle.name'] = {
            $regex: filters.vehicleBrand,
            $options: 'i',
          };
        }

        if (filters.vehicleModel) {
          query['vehicle.modelName'] = {
            $regex: filters.vehicleModel,
            $options: 'i',
          };
        }

        if (filters.vehicleColor) {
          query['vehicle.color'] = {
            $regex: filters.vehicleColor,
            $options: 'i',
          };
        }

        if (
          filters.modelYearMin !== undefined ||
          filters.modelYearMax !== undefined
        ) {
          query['vehicle.details.modelYear'] = {};
          if (filters.modelYearMin !== undefined) {
            query['vehicle.details.modelYear'].$gte = filters.modelYearMin;
          }
          if (filters.modelYearMax !== undefined) {
            query['vehicle.details.modelYear'].$lte = filters.modelYearMax;
          }
        }

        if (
          filters.mileageMin !== undefined ||
          filters.mileageMax !== undefined
        ) {
          query['vehicle.vehicleModel.mileage'] = {};
          if (filters.mileageMin !== undefined) {
            query['vehicle.vehicleModel.mileage'].$gte = filters.mileageMin;
          }
          if (filters.mileageMax !== undefined) {
            query['vehicle.vehicleModel.mileage'].$lte = filters.mileageMax;
          }
        }
      }

      // Property-specific filters
      if (filters.type === 'Property' || !filters.type) {
        if (filters.propertyType) {
          query['property.type'] = filters.propertyType;
        }

        if (filters.propertyCategory) {
          query['property.category'] = filters.propertyCategory;
        }

        if (
          filters.bedroomsMin !== undefined ||
          filters.bedroomsMax !== undefined
        ) {
          query['property.bhk'] = {};
          if (filters.bedroomsMin !== undefined) {
            query['property.bhk'].$gte = filters.bedroomsMin;
          }
          if (filters.bedroomsMax !== undefined) {
            query['property.bhk'].$lte = filters.bedroomsMax;
          }
        }

        if (
          filters.bathroomsMin !== undefined ||
          filters.bathroomsMax !== undefined
        ) {
          query['property.bathrooms'] = {};
          if (filters.bathroomsMin !== undefined) {
            query['property.bathrooms'].$gte = filters.bathroomsMin;
          }
          if (filters.bathroomsMax !== undefined) {
            query['property.bathrooms'].$lte = filters.bathroomsMax;
          }
        }

        if (filters.furnished) {
          query['property.furnished'] = filters.furnished;
        }

        if (filters.projectStatus) {
          query['property.projectStatus'] = filters.projectStatus;
        }

        if (
          filters.carpetAreaMin !== undefined ||
          filters.carpetAreaMax !== undefined
        ) {
          query['property.carpetArea'] = {};
          if (filters.carpetAreaMin !== undefined) {
            query['property.carpetArea'].$gte = filters.carpetAreaMin;
          }
          if (filters.carpetAreaMax !== undefined) {
            query['property.carpetArea'].$lte = filters.carpetAreaMax;
          }
        }

        if (
          filters.buildAreaMin !== undefined ||
          filters.buildAreaMax !== undefined
        ) {
          query['property.buildArea'] = {};
          if (filters.buildAreaMin !== undefined) {
            query['property.buildArea'].$gte = filters.buildAreaMin;
          }
          if (filters.buildAreaMax !== undefined) {
            query['property.buildArea'].$lte = filters.buildAreaMax;
          }
        }

        if (
          filters.floorNoMin !== undefined ||
          filters.floorNoMax !== undefined
        ) {
          query['property.floorNo'] = {};
          if (filters.floorNoMin !== undefined) {
            query['property.floorNo'].$gte = filters.floorNoMin;
          }
          if (filters.floorNoMax !== undefined) {
            query['property.floorNo'].$lte = filters.floorNoMax;
          }
        }

        if (
          filters.carParkingMin !== undefined ||
          filters.carParkingMax !== undefined
        ) {
          query['property.carParking'] = {};
          if (filters.carParkingMin !== undefined) {
            query['property.carParking'].$gte = filters.carParkingMin;
          }
          if (filters.carParkingMax !== undefined) {
            query['property.carParking'].$lte = filters.carParkingMax;
          }
        }

        if (filters.facing) {
          query['property.facing'] = filters.facing;
        }

        if (filters.listedBy) {
          query['property.listedBy'] = filters.listedBy;
        }
      }

      // Pagination
      const page = Math.max(1, filters.page || 1);
      const limit = Math.max(1, Math.min(100, filters.limit || 10));
      const skip = (page - 1) * limit;

      // Sorting
      const sort: any = {};
      if (filters.sortBy) {
        sort[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default sort by creation date
      }

      // Projection - preserve embedded documents structure
      const projection = {
        adTitle: 1,
        description: 1,
        price: 1,
        imageUrls: 1,
        type: 1,
        name: 1,
        phoneNumber: 1,
        state: 1,
        city: 1,
        district: 1,
        isApproved: 1,
        category: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        vehicle: 1, // Include entire embedded vehicle object
        property: 1, // Include entire embedded property object
      };

      // Execute query with pagination
      const [data, total] = await Promise.all([
        this.advertisementModel
          .find(query)
          .select(projection)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('category', 'name')
          .populate('createdBy', 'name email')
          .exec(),
        this.advertisementModel.countDocuments(query).exec(),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch advertisements',
          message: error?.message || 'Unknown error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<Advertisement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid Advertisement ID');
    }

    const advertisement = await this.advertisementModel
      .findById(id)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .exec();

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

      // Update category if provided
      if (updateDto.category) {
        const category = await this.categoryModel.findById(updateDto.category);
        if (!category) {
          throw new HttpException(
            { status: HttpStatus.BAD_REQUEST, error: 'Category not found' },
            HttpStatus.BAD_REQUEST,
          );
        }
        advertisement.category = category._id as Types.ObjectId;
      }

      // Update scalar fields
      const scalarFields = [
        'adTitle',
        'description',
        'name',
        'phoneNumber',
        'price',
        'imageUrls',
        'state',
        'city',
        'district',
        'isApproved',
      ];

      for (const field of scalarFields) {
        if (updateDto[field] !== undefined) {
          (advertisement as any)[field] = updateDto[field];
        }
      }

      // Update embedded documents if provided
      if (updateDto.vehicle) {
        advertisement.vehicle = {
          ...advertisement.vehicle?.toObject(),
          ...updateDto.vehicle,
        };
      }

      if (updateDto.property) {
        advertisement.property = {
          ...advertisement.property?.toObject(),
          ...updateDto.property,
        };
      }

      return await advertisement.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to update advertisement',
          message: error?.message || 'Unknown error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          { status: HttpStatus.BAD_REQUEST, error: 'Invalid Advertisement ID' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.advertisementModel.deleteOne({
        _id: id,
        createdBy: userId,
      });

      if (result.deletedCount === 0) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Advertisement not found or not authorized to delete',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return { message: 'Advertisement deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to delete advertisement',
          message: error?.message || 'Unknown error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
