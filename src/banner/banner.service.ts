import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner, BannerDocument } from './schemas/schema.banner';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name)
    private readonly bannerModel: Model<BannerDocument>,
    private readonly redisService: RedisService,
  ) {}

  // Create a new banner
  async create(createBannerDto: CreateBannerDto, user: any): Promise<Banner> {
    const createdBanner = new this.bannerModel(createBannerDto);
    const saved = await createdBanner.save();
    await this.invalidateBannerCache((saved._id as any).toString());
    return saved;
  }

  // Get all banners with optional title filtering
  async findAll(
    title?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ banners: Banner[]; totalPages: number; currentPage: number }> {
    const filter = title ? { title: { $regex: title, $options: 'i' } } : {};

    const cacheKey = `banner:list:${JSON.stringify({ title, page, limit })}`;
    const cached = await this.redisService.cacheGet<{
      banners: Banner[];
      totalPages: number;
      currentPage: number;
    }>(cacheKey);
    if (cached) return cached;

    // Count total matching documents for pagination
    const count = await this.bannerModel.countDocuments(filter);

    // Fetch banners with pagination and sorting
    const banners = await this.bannerModel
      .find(filter)
      .sort({ createdAt: -1 }) // Sorting by newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const resp = {
      banners,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
    await this.redisService.cacheSet(cacheKey, resp, 300);
    return resp;
  }

  // Get a banner by its ID
  async findOne(id: string): Promise<Banner> {
    const key = `banner:get:${id}`;
    const cached = await this.redisService.cacheGet<Banner>(key);
    if (cached) return cached as any;

    const banner = await this.bannerModel.findById(id).exec();
    if (!banner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }
    await this.redisService.cacheSet(key, banner, 900);
    return banner;
  }

  // Update a banner by its ID
  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
    user: any,
  ): Promise<Banner> {
    const updatedBanner = await this.bannerModel
      .findByIdAndUpdate(id, updateBannerDto, { new: true })
      .exec();
    if (!updatedBanner) {
      throw new NotFoundException(`Banner with id ${id} not found for update`);
    }
    await this.invalidateBannerCache(id);
    return updatedBanner;
  }

  // Remove a banner by its ID
  async remove(id: string, user: any): Promise<void> {
    const deletionResult = await this.bannerModel.findByIdAndDelete(id).exec();
    if (!deletionResult) {
      throw new NotFoundException(
        `Banner with id ${id} not found for deletion`,
      );
    }
    await this.invalidateBannerCache(id);
  }

  private async invalidateBannerCache(id?: string): Promise<void> {
    try {
      const keys = await this.redisService.keys('banner:list:*');
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
      if (id) {
        await this.redisService.cacheDel(`banner:get:${id}`);
      }
    } catch {}
  }
}
