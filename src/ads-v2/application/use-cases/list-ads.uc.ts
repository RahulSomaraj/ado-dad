import { Injectable } from '@nestjs/common';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { ListAdsV2Dto } from '../../dto/list-ads-v2.dto';
import { DetailedAdResponseDto } from '../../../ads/dto/common/ad-response.dto';

export interface PaginatedAdsResponse {
  data: DetailedAdResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class ListAdsUc {
  constructor(private readonly adRepo: AdRepository) {}

  async exec(filters: ListAdsV2Dto): Promise<PaginatedAdsResponse> {
    const {
      category,
      search,
      location,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Base match - exclude deleted ads
    pipeline.push({
      $match: {
        isDeleted: { $ne: true },
        isActive: true,
      },
    });

    // Category filter
    if (category) {
      pipeline.push({
        $match: { category },
      });
    }

    // Price filters
    if (minPrice || maxPrice) {
      const priceMatch: any = {};
      if (minPrice) priceMatch.$gte = minPrice;
      if (maxPrice) priceMatch.$lte = maxPrice;
      pipeline.push({
        $match: { price: priceMatch },
      });
    }

    // Location filter
    if (location) {
      pipeline.push({
        $match: {
          location: { $regex: location, $options: 'i' },
        },
      });
    }

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // User lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'postedBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
      },
    });
    pipeline.push({
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    });

    // Property details lookup
    pipeline.push({
      $lookup: {
        from: 'propertyads',
        localField: '_id',
        foreignField: 'ad',
        as: 'propertyDetails',
      },
    });

    // Vehicle details lookup
    pipeline.push({
      $lookup: {
        from: 'vehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'vehicleDetails',
      },
    });

    // Commercial vehicle details lookup
    pipeline.push({
      $lookup: {
        from: 'commercialvehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: 'commercialVehicleDetails',
      },
    });

    // Add fields for better response structure
    pipeline.push({
      $addFields: {
        id: '$_id',
        postedAt: '$createdAt',
        user: {
          id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phone',
        },
        propertyDetails: { $arrayElemAt: ['$propertyDetails', 0] },
        vehicleDetails: { $arrayElemAt: ['$vehicleDetails', 0] },
        commercialVehicleDetails: {
          $arrayElemAt: ['$commercialVehicleDetails', 0],
        },
      },
    });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 0,
        id: 1,
        title: 1,
        description: 1,
        price: 1,
        location: 1,
        category: 1,
        isActive: 1,
        status: 1,
        postedAt: 1,
        updatedAt: 1,
        postedBy: 1,
        user: 1,
        propertyDetails: 1,
        vehicleDetails: 1,
        commercialVehicleDetails: 1,
        images: 1,
      },
    });

    // Sort
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;
    pipeline.push({
      $sort: { [sortBy]: sortDirection },
    });

    // Count total documents
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute queries
    const [data, countResult] = await Promise.all([
      this.adRepo.aggregate(pipeline),
      this.adRepo.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as DetailedAdResponseDto[],
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
