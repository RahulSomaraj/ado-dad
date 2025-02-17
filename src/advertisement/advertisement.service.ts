import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdvertisementType,
  CreateAdvertisementDto,
} from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Advertisement } from './schemas/advertisement.schema';
import { User } from '../users/schemas/user.schema';
import { Category } from 'src/category/schemas/category.schema';
import { VehicleAdv } from 'src/vehicles-adv/schemas/vehicle.schema';
import { Property } from 'src/property/schemas/schema.property';
import { FindAdvertisementsDto } from './dto/get-advertisement.dto';

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

  async create(createAdvertisementDto: CreateAdvertisementDto, userId: string) {
    // Validate that the creator exists.
    const creator = await this.userModel.findById(userId);
    if (!creator) {
      throw new HttpException(
        'Creator user not found.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate that the approver exists.
    const approver = await this.userModel.findById(
      createAdvertisementDto.approvedBy,
    );
    if (!approver) {
      throw new HttpException(
        'Approver user not found.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate that the category exists.
    const category = await this.categoryModel.findById(
      createAdvertisementDto.category,
    );
    if (!category) {
      throw new HttpException('Category not found.', HttpStatus.BAD_REQUEST);
    }

    // Conditional validations based on the advertisement type.
    if (createAdvertisementDto.type === AdvertisementType.Vehicle) {
      // Vehicle ads must have a vehicle reference and fuel type.
      if (!createAdvertisementDto.vehicle) {
        throw new HttpException(
          'Vehicle reference is required for Vehicle type ads.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (createAdvertisementDto.property) {
        throw new HttpException(
          'Property reference should not be provided for Vehicle type ads.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!createAdvertisementDto.fuelType) {
        throw new HttpException(
          'Fuel type is required for Vehicle advertisements.',
          HttpStatus.BAD_REQUEST,
        );
      }
      // Validate that the vehicle reference exists.
      const vehicle = await this.vehicleAdvsModel.findById(
        createAdvertisementDto.vehicle,
      );
      if (!vehicle) {
        throw new HttpException('Vehicle not found.', HttpStatus.BAD_REQUEST);
      }
    } else if (createAdvertisementDto.type === AdvertisementType.Property) {
      // Property ads must have a property reference.
      if (!createAdvertisementDto.property) {
        throw new HttpException(
          'Property reference is required for Property type ads.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (createAdvertisementDto.vehicle) {
        throw new HttpException(
          'Vehicle reference should not be provided for Property type ads.',
          HttpStatus.BAD_REQUEST,
        );
      }
      // Validate that the property reference exists.
      const property = await this.propertiesModel.findById(
        createAdvertisementDto.property,
      );
      if (!property) {
        throw new HttpException('Property not found.', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException(
        'Invalid advertisement type.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // If all validations pass, create and save the advertisement.
    const createdAdvertisement = new this.advertisementModel({
      ...createAdvertisementDto,
      createdBy: userId,
    });

    return createdAdvertisement.save();
  }

  async findAdvertisements(
    findDto: FindAdvertisementsDto,
  ): Promise<Advertisement[]> {
    const page = findDto.page || 1;
    const limit = findDto.limit || 10;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      // Only consider Vehicle ads.
      { $match: { type: 'Vehicle', isDeleted: { $ne: true } } },
    ];

    // Filter by category if provided.
    if (findDto.category) {
      pipeline.push({
        $match: { category: findDto.category },
      });
    }

    // Lookup the associated vehicle document.
    pipeline.push({
      $lookup: {
        from: 'vehicleadvs', // Adjust this if your vehicle collection name is different.
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicle',
      },
    });

    // Unwind the vehicle array (each ad should have one vehicle).
    pipeline.push({ $unwind: '$vehicle' });

    // Lookup the vendor inside the vehicle.
    pipeline.push({
      $lookup: {
        from: 'vehiclecompanies', // Adjust this if your vendor collection name is different.
        localField: 'vehicle.vendor',
        foreignField: '_id',
        as: 'vehicle.vendor',
      },
    });

    // Unwind the vendor array.
    pipeline.push({ $unwind: '$vehicle.vendor' });

    // Filter by vendor name if provided.
    if (findDto.vendorName) {
      pipeline.push({
        $match: {
          'vehicle.vendor.name': { $regex: findDto.vendorName, $options: 'i' },
        },
      });
    }

    // If vehicle DTO filters are provided, add matching criteria.
    if (findDto.vehicle) {
      // For example: filter by vehicle name.
      if (findDto.vehicle.name) {
        pipeline.push({
          $match: {
            'vehicle.name': { $regex: findDto.vehicle.name, $options: 'i' },
          },
        });
      }
      // Filter by vehicle modelName.
      if (findDto.vehicle.modelName) {
        pipeline.push({
          $match: {
            'vehicle.modelName': {
              $regex: findDto.vehicle.modelName,
              $options: 'i',
            },
          },
        });
      }
      // If needed, filter by other vehicle fields (such as fuelType, transmissionType, etc.).
      // For example, filtering vehicleModels nested within vehicle:
      if (findDto.vehicle.fuelType) {
        pipeline.push({
          $match: {
            'vehicle.vehicleModels.fuelType': findDto.vehicle.fuelType,
          },
        });
      }
    }

    // Apply pagination.
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const advertisements = await this.advertisementModel
      .aggregate(pipeline)
      .exec();
    return advertisements;
  }

  // ✅ Get a single advertisement by ID
  async findOne(id: string) {
    const advertisement = await this.advertisementModel
      .findById(id)
      .populate('createdBy', 'name email');
    if (!advertisement) throw new NotFoundException('Advertisement not found');
    return advertisement;
  }

  // ✅ Update an advertisement (Only allows modification by the creator)
  async update(
    id: string,
    updateAdvertisementDto: UpdateAdvertisementDto,
    userId: string,
  ) {
    const advertisement = await this.advertisementModel.findById(id);
    if (!advertisement) throw new NotFoundException('Advertisement not found');

    // Check if the user owns the ad
    if (advertisement.createdBy.toString() !== userId) {
      throw new UnauthorizedException(
        'Unauthorized to edit this advertisement',
      );
    }

    return this.advertisementModel.findByIdAndUpdate(
      id,
      updateAdvertisementDto,
      { new: true },
    );
  }

  // ✅ Delete an advertisement (Only allows deletion by the creator)
  async remove(id: string, userId: string) {
    const advertisement = await this.advertisementModel.findById(id);
    if (!advertisement) throw new NotFoundException('Advertisement not found');

    // Check if the user owns the ad
    if (advertisement.createdBy.toString() !== userId) {
      throw new UnauthorizedException(
        'Unauthorized to delete this advertisement',
      );
    }

    return this.advertisementModel.findByIdAndDelete(id);
  }
}
