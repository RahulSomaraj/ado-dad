import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite, FavoriteDocument } from './schemas/schema.favorite';
import { RedisService } from '../shared/redis.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    private readonly redisService: RedisService,
  ) {}

  async addFavorite(
    userId: string,
    createFavoriteDto: CreateFavoriteDto,
  ): Promise<Favorite> {
    if (createFavoriteDto.itemType !== 'ad') {
      throw new Error('Only ads can be favorited');
    }
    const favorite = new this.favoriteModel({ userId, ...createFavoriteDto });
    const saved = await favorite.save();
    await this.invalidateFavoritesCache(userId);
    return saved;
  }

  async getUserFavorites(
    userId: string,
    query: { itemId?: string; itemType?: string },
  ): Promise<Favorite[]> {
    const cacheKey = `fav:list:${userId}:${JSON.stringify(query || {})}`;
    const cached = await this.redisService.cacheGet<Favorite[]>(cacheKey);
    if (cached) return cached as any;
    const filter: any = { userId };

    if (query.itemId) {
      filter.itemId = query.itemId;
    }

    if (query.itemType) {
      filter.itemType = query.itemType;
    }

    // Always populate ad details
    const data = await this.favoriteModel.find(filter).populate('itemId');
    await this.redisService.cacheSet(cacheKey, data as any, 120);
    return data as any;
  }

  async getFavoriteById(userId: string, favoriteId: string): Promise<Favorite> {
    const favorite = await this.favoriteModel
      .findOne({ _id: favoriteId, userId })
      .populate('itemId');
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    return favorite;
  }

  async updateFavorite(
    userId: string,
    favoriteId: string,
    updateFavoriteDto: UpdateFavoriteDto,
  ): Promise<Favorite> {
    const favorite = await this.favoriteModel.findOneAndUpdate(
      { _id: favoriteId, userId },
      updateFavoriteDto,
      { new: true },
    );
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    await this.invalidateFavoritesCache(userId);
    return favorite;
  }

  async removeFavorite(
    userId: string,
    favoriteId: string,
  ): Promise<{ message: string }> {
    const favorite = await this.favoriteModel.findOneAndDelete({
      _id: favoriteId,
      userId,
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    await this.invalidateFavoritesCache(userId);
    return { message: 'Item removed from favorites' };
  }

  private async invalidateFavoritesCache(userId: string): Promise<void> {
    try {
      const keys = await this.redisService.keys(`fav:list:${userId}:*`);
      if (keys?.length) {
        await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
      }
    } catch {}
  }
}
