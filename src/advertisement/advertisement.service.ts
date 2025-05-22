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
    const category = await this.categoryModel.findOne({
      _id: createAdvertisementDto.category,
    });
    if (!category) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Category instance not found',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const advertisement = new this.advertisementModel({
      adTitle: 'Dummy',
      type: createAdvertisementDto.type,
      description: createAdvertisementDto.description,
      price: createAdvertisementDto.price,
      state: createAdvertisementDto.state,
      city: createAdvertisementDto.city,
      district: createAdvertisementDto.district,
      // Set default value for isApproved if not provided
      isApproved: false,
      category: category,
      createdBy: user,
      adStatus: ADSTATUS.AD_CREATED,
    });

    // Save the advertisement document to the database.
    const savedAd = await advertisement.save();

    // Return the saved advertisement.
    return savedAd;
  }

  async findVehicleAdv(findDto: FindAdvertisementsDto) {
    const query: any = {};

    // Top-level filters
    if (findDto.vehicleAdv?.vendor) {
      query.vendor = findDto.vehicleAdv?.vendor;
    }

    if (findDto.vehicleAdv?.name) {
      // Case-insensitive regex search for brand name
      query.name = { $regex: findDto.vehicleAdv?.name, $options: 'i' };
    }

    if (findDto.vehicleAdv?.modelName) {
      // Case-insensitive regex search for top-level modelName
      query.modelName = {
        $regex: findDto.vehicleAdv?.modelName,
        $options: 'i',
      };
    }

    // Filter by modelYear stored in the nested "details" sub-document
    if (
      findDto.vehicleAdv?.modelYear &&
      findDto.vehicleAdv?.modelYear !== undefined
    ) {
      query['details.modelYear'] = findDto.vehicleAdv?.modelYear;
    }

    // Nested vehicle model filters
    if (findDto.vehicleAdv?.vehicleModel) {
      const vm = findDto.vehicleAdv?.vehicleModel;
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
      // Additional info filter inside the vehicle model
      if (vm.additionalInfo) {
        const addInfo = vm.additionalInfo;
        if (addInfo.color) {
          query['vehicleModel.additionalInfo.color'] = {
            $regex: addInfo.color,
            $options: 'i',
          };
        }
      }
    }

    // Optional: Add a generic search that spans multiple fields (if needed)
    // For example, to search across the top-level name, modelName, and vehicleModel.name:
    if (findDto.search) {
      query.$or = [
        { name: { $regex: findDto.search, $options: 'i' } },
        { modelName: { $regex: findDto.search, $options: 'i' } },
        { 'vehicleModel.name': { $regex: findDto.search, $options: 'i' } },
      ];
    }

    // Apply pagination if provided
    const page = findDto?.page || 1;
    const limit = findDto?.limit || 10;
    const skip = (page - 1) * limit;

    // You can also limit the fields returned.
    // For example, to return only vendor, name, modelName, details, and select vehicleModel fields:
    const projection = {
      vendor: 1,
      name: 1,
      modelName: 1,
      'details.modelYear': 1,
      'details.month': 1,
      'vehicleModel.name': 1,
      'vehicleModel.modelName': 1,
      'vehicleModel.fuelType': 1,
      'vehicleModel.transmissionType': 1,
      'vehicleModel.additionalInfo.color': 1,
    };

    const advertisements = await this.advertisementModel
      .find(query)
      .select(projection)
      .skip(skip)
      .limit(limit)
      .exec();

    return advertisements;
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


  // ✅ Update an advertisement (Only allows modification by the creator)
   async update(
  id: string,
  updateAdvertisementDto: UpdateAdvertisementDto,
  userId: string,
): Promise<Advertisement> {
  const updated = await this.advertisementModel.findOneAndUpdate(
    { _id: id, createdBy: userId },
    { $set: updateAdvertisementDto },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new NotFoundException('Advertisement not found or not authorized to update');
  }

  return updated;
}
}