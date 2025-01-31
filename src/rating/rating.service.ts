import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating } from './schemas/schema.rating';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingService {
  constructor(@InjectModel(Rating.name) private ratingModel: Model<Rating>) {}

  async create(createRatingDto: CreateRatingDto) {
    const newRating = new this.ratingModel(createRatingDto);
    return await newRating.save();
  }

  async update(ratingId: string, updateRatingDto: UpdateRatingDto) {
    const rating = await this.ratingModel.findByIdAndUpdate(
      ratingId,
      updateRatingDto,
      { new: true }
    );
    if (!rating) {
      throw new Error('Rating not found');
    }
    return rating;
  }

  async getRatingsByProduct(productId: string, query: any) {
    const { minRating, maxRating, page = 1, limit = 10 } = query;

    const filter = { product: productId };
    if (minRating) filter['rating'] = { $gte: minRating };
    if (maxRating) filter['rating'] = { $lte: maxRating };

    return this.ratingModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async delete(ratingId: string) {
    const rating = await this.ratingModel.findByIdAndDelete(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }
    return { message: 'Rating deleted successfully' };
  }
}
