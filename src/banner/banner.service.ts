import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner, BannerDocument } from './schemas/schema.banner';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private readonly bannerModel: Model<BannerDocument>,
  ) {}

  // Create a new banner
  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const createdBanner = new this.bannerModel(createBannerDto);
    return createdBanner.save();
  }

  // Get all banners with optional title filtering
  async findAll(title?: string): Promise<Banner[]> {
    const filter = title ? { title: { $regex: title, $options: 'i' } } : {};
    return this.bannerModel.find(filter).exec();
  }

  // Get a banner by its ID
  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findById(id).exec();
    if (!banner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }
    return banner;
  }

  // Update a banner by its ID
  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const updatedBanner = await this.bannerModel
      .findByIdAndUpdate(id, updateBannerDto, { new: true })
      .exec();
    if (!updatedBanner) {
      throw new NotFoundException(`Banner with id ${id} not found for update`);
    }
    return updatedBanner;
  }

  // Remove a banner by its ID
  async remove(id: string): Promise<void> {
    const deletionResult = await this.bannerModel.findByIdAndDelete(id).exec();
    if (!deletionResult) {
      throw new NotFoundException(`Banner with id ${id} not found for deletion`);
    }
  }
}
