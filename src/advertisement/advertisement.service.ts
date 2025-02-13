import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Advertisement } from './schemas/advertisement.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AdvertisementsService {
  constructor(
    @InjectModel(Advertisement.name) private advertisementModel: Model<Advertisement>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // ✅ Create a new advertisement (Handles both Vehicle & Property)
  async create(createAdvertisementDto: CreateAdvertisementDto, userId: string) {
    const createdAdvertisement = new this.advertisementModel({
      ...createAdvertisementDto,
      createdBy: userId, 
    });

    return createdAdvertisement.save();
  }

  // ✅ Get all advertisements with filters (Supports Vehicle & Property)
  async findAll(query: any) {
    const {
      type, createdBy, adTitle, minPrice, maxPrice, propertyType, brandName,
      sortBy = 'createdAt', order = 'desc', page = 1, limit = 10
    } = query;

    const filter: any = {};

    if (type) filter['type'] = type; // Filter by type: Vehicle or Property
    if (createdBy) filter['createdBy'] = createdBy;
    if (adTitle) filter['adTitle'] = { $regex: adTitle, $options: 'i' }; // Case-insensitive search
    if (minPrice || maxPrice) filter['price'] = { ...(minPrice && { $gte: minPrice }), ...(maxPrice && { $lte: maxPrice }) };
    
    if (type === 'Vehicle' && brandName) filter['brandName'] = { $regex: brandName, $options: 'i' };
    if (type === 'Property' && propertyType) filter['propertyType'] = propertyType;

    const advertisements = await this.advertisementModel
      .find(filter)
      .sort({ [sortBy]: order }) // Sort by any field (e.g., price, createdAt)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email'); // Populate User data

    const total = await this.advertisementModel.countDocuments(filter);

    return { total, page, limit, advertisements };
  }

  // ✅ Get a single advertisement by ID
  async findOne(id: string) {
    const advertisement = await this.advertisementModel.findById(id).populate('createdBy', 'name email');
    if (!advertisement) throw new NotFoundException('Advertisement not found');
    return advertisement;
  }

  // ✅ Update an advertisement (Only allows modification by the creator)
  async update(id: string, updateAdvertisementDto: UpdateAdvertisementDto, userId: string) {
    const advertisement = await this.advertisementModel.findById(id);
    if (!advertisement) throw new NotFoundException('Advertisement not found');

    // Check if the user owns the ad
    if (advertisement.createdBy.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized to edit this advertisement');
    }

    return this.advertisementModel.findByIdAndUpdate(id, updateAdvertisementDto, { new: true });
  }

  // ✅ Delete an advertisement (Only allows deletion by the creator)
  async remove(id: string, userId: string) {
    const advertisement = await this.advertisementModel.findById(id);
    if (!advertisement) throw new NotFoundException('Advertisement not found');

    // Check if the user owns the ad
    if (advertisement.createdBy.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized to delete this advertisement');
    }

    return this.advertisementModel.findByIdAndDelete(id);
  }
}
