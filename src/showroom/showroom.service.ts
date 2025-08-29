import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Showroom, ShowroomDocument } from './schemas/showroom.schema';
import { RedisService } from '../shared/redis.service';
import { CreateShowroomDto } from './dto/create-showroom.dto';
import { UpdateShowroomDto } from './dto/update-showroom.dto';

@Injectable()
export class ShowroomService {
  constructor(
    @InjectModel(Showroom.name)
    private readonly showroomModel: Model<ShowroomDocument>,
    private readonly redisService: RedisService,
  ) {}

  // Get all showrooms
  async getShowrooms(p0: {
    location: string | undefined;
    brand: string | undefined;
    pagination: { page: number; limit: number };
    sortOptions: any;
  }): Promise<ShowroomDocument[]> {
    const cacheKey = `showroom:list:${JSON.stringify(p0)}`;
    const cached =
      await this.redisService.cacheGet<ShowroomDocument[]>(cacheKey);
    if (cached) return cached as any;
    const data = await this.showroomModel.find().exec();
    await this.redisService.cacheSet(cacheKey, data, 300);
    return data;
  }

  // Get showroom by ID
  async getShowroomById(id: string): Promise<ShowroomDocument> {
    const key = `showroom:get:${id}`;
    const cached = await this.redisService.cacheGet<ShowroomDocument>(key);
    if (cached) return cached as any;
    const showroom = await this.showroomModel.findById(id).exec();
    if (!showroom) {
      throw new NotFoundException(`Showroom with ID "${id}" not found.`);
    }
    await this.redisService.cacheSet(key, showroom, 900);
    return showroom;
  }

  // Add a new showroom
  async addShowroom(
    createShowroomDto: CreateShowroomDto,
    user: any,
  ): Promise<ShowroomDocument> {
    const newShowroom = new this.showroomModel(createShowroomDto);
    const saved = await newShowroom.save();
    await this.invalidateShowroomCache((saved._id as any).toString());
    return saved;
  }

  // Update a showroom
  async updateShowroom(
    id: string,
    updateShowroomDto: UpdateShowroomDto,
    user: any,
  ): Promise<ShowroomDocument> {
    const updatedShowroom = await this.showroomModel
      .findByIdAndUpdate(id, updateShowroomDto, {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!updatedShowroom) {
      throw new NotFoundException(`Showroom with ID "${id}" not found.`);
    }
    await this.invalidateShowroomCache(id);
    return updatedShowroom;
  }

  // Delete a showroom
  async deleteShowroom(id: string, user: any): Promise<void> {
    const result = await this.showroomModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Showroom with ID "${id}" not found.`);
    }
    await this.invalidateShowroomCache(id);
  }

  private async invalidateShowroomCache(id?: string): Promise<void> {
    try {
      const keys = await this.redisService.keys('showroom:list:*');
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
      if (id) {
        await this.redisService.cacheDel(`showroom:get:${id}`);
      }
    } catch {}
  }
}
