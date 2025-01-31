import { Injectable } from '@nestjs/common';
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

  async create(createAdvertisementDto: CreateAdvertisementDto) {
    const createdAdvertisement = new this.advertisementModel(createAdvertisementDto);
    return createdAdvertisement.save();
  }

  async findAll(query: any) {
    const { type, createdBy, heading, sortBy, order, page = 1, limit = 10 } = query;
    const filter = {};

    if (type) filter['type'] = type;
    if (createdBy) filter['createdBy'] = createdBy;
    if (heading) filter['adTitle'] = { $regex: heading, $options: 'i' };

    const advertisements = await this.advertisementModel
      .find(filter)
      .sort({ [sortBy || 'createdAt']: order || 'asc' })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await this.advertisementModel.countDocuments(filter);
    return { total, page, limit, advertisements };
  }

  async findOne(id: string) {
    return this.advertisementModel.findById(id).populate('createdBy', 'name email');
  }

  async update(id: string, updateAdvertisementDto: UpdateAdvertisementDto) {
    return this.advertisementModel.findByIdAndUpdate(id, updateAdvertisementDto, { new: true });
  }

  async remove(id: string) {
    return this.advertisementModel.findByIdAndDelete(id); // Use findByIdAndDelete instead of findByIdAndRemove
  }
}
