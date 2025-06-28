import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite, FavoriteDocument } from './schemas/schema.favorite';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
  ) {}

  async addFavorite(
    userId: string,
    createFavoriteDto: CreateFavoriteDto,
  ): Promise<Favorite> {
    const favorite = new this.favoriteModel({ userId, ...createFavoriteDto });
    return await favorite.save();
  }

  async getUserFavorites(
    userId: string,
    query: { itemId?: string; itemType?: string },
  ): Promise<Favorite[]> {
    const filter: any = { userId };

    if (query.itemId) {
      filter.itemId = query.itemId;
    }

    if (query.itemType) {
      filter.itemType = query.itemType;
    }

    return await this.favoriteModel.find(filter).populate('itemId');
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
    return { message: 'Item removed from favorites' };
  }
}
