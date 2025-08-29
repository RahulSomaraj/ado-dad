import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating } from './schemas/schema.rating';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<Rating>,
    private readonly redisService: RedisService,
  ) {}

  private getRatingCacheKey(productId: string, query: any = {}): string {
    const queryString = JSON.stringify(query);
    return `ratings:product:${productId}:${queryString}`;
  }

  private getRatingCacheKeyById(ratingId: string): string {
    return `rating:${ratingId}`;
  }

  async create(createRatingDto: CreateRatingDto, user: any) {
    const newRating = new this.ratingModel(createRatingDto);
    const savedRating = await newRating.save();

    // Invalidate caches for this product's ratings and aggregates
    await this.invalidateProductRatingCaches(createRatingDto.product as any);

    // Cache the new rating
    await this.redisService.cacheSet(
      this.getRatingCacheKeyById(savedRating._id?.toString() || ''),
      savedRating,
      3600, // 1 hour
    );

    return savedRating;
  }

  async update(ratingId: string, updateRatingDto: UpdateRatingDto, user: any) {
    const rating = await this.ratingModel.findByIdAndUpdate(
      ratingId,
      updateRatingDto,
      { new: true },
    );

    if (!rating) {
      throw new Error('Rating not found');
    }

    // Invalidate caches for this product's ratings and aggregates
    await this.invalidateProductRatingCaches((rating as any).product);

    // Update cache for this specific rating
    await this.redisService.cacheSet(
      this.getRatingCacheKeyById(ratingId),
      rating,
      3600, // 1 hour
    );

    return rating;
  }

  async getRatingsByProduct(productId: string, query: any) {
    const { minRating, maxRating, page = 1, limit = 10 } = query;

    // Try to get from cache first
    const cacheKey = this.getRatingCacheKey(productId, query);
    const cachedRatings = await this.redisService.cacheGet(cacheKey);

    if (cachedRatings) {
      return cachedRatings;
    }

    // If not in cache, fetch from database
    const filter = { product: productId };
    if (minRating) filter['rating'] = { $gte: minRating };
    if (maxRating) filter['rating'] = { $lte: maxRating };

    const ratings = await this.ratingModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    // Cache the results for 30 minutes
    await this.redisService.cacheSet(cacheKey, ratings, 1800);

    return ratings;
  }

  async getRatingById(ratingId: string) {
    // Try to get from cache first
    const cacheKey = this.getRatingCacheKeyById(ratingId);
    const cachedRating = await this.redisService.cacheGet(cacheKey);

    if (cachedRating) {
      return cachedRating;
    }

    // If not in cache, fetch from database
    const rating = await this.ratingModel.findById(ratingId);

    if (rating) {
      // Cache the rating for 1 hour
      await this.redisService.cacheSet(cacheKey, rating, 3600);
    }

    return rating;
  }

  async delete(ratingId: string, user: any) {
    const rating = await this.ratingModel.findByIdAndDelete(ratingId);

    if (!rating) {
      throw new Error('Rating not found');
    }

    // Remove from cache and invalidate product-related caches
    await this.redisService.cacheDel(this.getRatingCacheKeyById(ratingId));
    await this.invalidateProductRatingCaches((rating as any).product);

    return { message: 'Rating deleted successfully' };
  }

  async getAverageRating(productId: string): Promise<number> {
    const cacheKey = `avg_rating:product:${productId}`;

    // Try to get from cache first
    const cachedAvg = await this.redisService.cacheGet<number>(cacheKey);

    if (cachedAvg !== null) {
      return cachedAvg;
    }

    // Calculate average rating from database
    const result = await this.ratingModel.aggregate([
      { $match: { product: productId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);

    const averageRating = result.length > 0 ? result[0].avgRating : 0;

    // Cache the average rating for 1 hour
    await this.redisService.cacheSet(cacheKey, averageRating, 3600);

    return averageRating;
  }

  async getRatingStats(productId: string) {
    const cacheKey = `rating_stats:product:${productId}`;

    // Try to get from cache first
    const cachedStats = await this.redisService.cacheGet(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    // Calculate rating statistics from database
    const stats = await this.ratingModel.aggregate([
      { $match: { product: productId } },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          minRating: { $min: '$rating' },
          maxRating: { $max: '$rating' },
        },
      },
    ]);

    const ratingStats =
      stats.length > 0
        ? stats[0]
        : {
            totalRatings: 0,
            avgRating: 0,
            minRating: 0,
            maxRating: 0,
          };

    // Cache the stats for 1 hour
    await this.redisService.cacheSet(cacheKey, ratingStats, 3600);

    return ratingStats;
  }

  private async invalidateProductRatingCaches(productId: string) {
    // Delete list caches for any query permutations
    const pattern = `ratings:product:${productId}:*`;
    const keys = await this.redisService.keys(pattern);
    if (keys && keys.length) {
      await Promise.all(keys.map((k) => this.redisService.cacheDel(k)));
    }
    // Delete aggregates
    await this.redisService.cacheDel(`avg_rating:product:${productId}`);
    await this.redisService.cacheDel(`rating_stats:product:${productId}`);
  }
}
