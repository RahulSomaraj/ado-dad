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
import { VehicleAdv } from 'src/vehicles-adv/schemas/vehicleadv.schema';
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

  async create(createAdvertisementDto: CreateAdvertisementDto) {}

  async findAdvertisements(
    findDto: FindAdvertisementsDto,
  ): Promise<Advertisement[]> {
    const page = findDto.page || 1;
    const limit = findDto.limit || 10;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      // Only consider vehicle ads that are not deleted.
      { $match: { type: 'Vehicle', isDeleted: { $ne: true } } },
      // Lookup the associated vehicle document from the vehicleAdv collection.
      {
        $lookup: {
          from: 'vehicleadvs', // Adjust this if your vehicle adv collection name is different.
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      // Unwind the vehicle array (each ad should have one vehicle).
      { $unwind: '$vehicle' },
      // Apply pagination.
      { $skip: skip },
      { $limit: limit },
    ];

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
