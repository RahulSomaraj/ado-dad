import { Injectable } from '@nestjs/common';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
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
  constructor(
    private readonly adRepo: AdRepository,
    private readonly inventory: VehicleInventoryGateway,
  ) {}

  async exec(
    filters: ListAdsV2Dto,
    userId?: string,
  ): Promise<PaginatedAdsResponse> {
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

    // Build simplified aggregation pipeline
    const pipeline: any[] = [];

    // Base match - exclude deleted ads and only show approved ads
    pipeline.push({
      $match: {
        isDeleted: { $ne: true },
        isActive: true,
        isApproved: true, // Only show approved ads in listings
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

    // User lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'postedBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phoneNumber: 1,
              profilePic: 1,
              type: 1,
              createdAt: 1,
              isDeleted: 1,
            },
          },
        ],
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

    // Favorites lookup (only if userId is provided)
    if (userId) {
      pipeline.push({
        $lookup: {
          from: 'favorites',
          let: { adId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', { $toObjectId: userId }] },
                    { $eq: ['$itemId', '$$adId'] },
                  ],
                },
              },
            },
          ],
          as: 'favoriteDetails',
        },
      });
    }

    // Enhanced search filter - search across title, description, and basic vehicle fields
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            // Basic ad fields
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },

            // Property search fields
            {
              'propertyDetails.propertyType': { $regex: search, $options: 'i' },
            },
            { 'propertyDetails.amenities': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Add fields for better response structure
    pipeline.push({
      $addFields: {
        id: '$_id',
        postedAt: '$createdAt',
        user: {
          id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phoneNumber',
        },
        isFavorite: userId
          ? { $gt: [{ $size: '$favoriteDetails' }, 0] }
          : false,
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
        _id: 1,
        title: 1,
        description: 1,
        price: 1,
        images: 1,
        location: 1,
        category: 1,
        isActive: 1,
        soldOut: 1,
        postedBy: 1,
        createdAt: 1,
        updatedAt: 1,
        viewCount: 1,
        id: 1,
        postedAt: 1,
        user: 1,
        isFavorite: 1,
        propertyDetails: 1,
        vehicleDetails: 1,
        commercialVehicleDetails: 1,
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

    // Map the data to include vehicle inventory details
    const mappedData = await Promise.all(
      data.map((ad) => this.mapToDetailedResponseDto(ad)),
    );

    return {
      data: mappedData,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private async mapToDetailedResponseDto(
    ad: any,
  ): Promise<DetailedAdResponseDto> {
    // Process vehicle details with inventory information
    const vehicleDetails = ad.vehicleDetails;
    let processedVehicleDetails = vehicleDetails;

    if (vehicleDetails) {
      // Fetch vehicle inventory details individually
      const [manufacturer, model, variant, fuelType, transmissionType] =
        await Promise.all([
          vehicleDetails.manufacturerId
            ? this.inventory.getManufacturer(vehicleDetails.manufacturerId)
            : Promise.resolve(undefined),
          vehicleDetails.modelId
            ? this.inventory.getModel(vehicleDetails.modelId)
            : Promise.resolve(undefined),
          vehicleDetails.variantId
            ? this.inventory.getVariant(vehicleDetails.variantId)
            : Promise.resolve(undefined),
          vehicleDetails.fuelTypeId
            ? this.inventory.getFuelType(vehicleDetails.fuelTypeId)
            : Promise.resolve(undefined),
          vehicleDetails.transmissionTypeId
            ? this.inventory.getTransmissionType(
                vehicleDetails.transmissionTypeId,
              )
            : Promise.resolve(undefined),
        ]);

      processedVehicleDetails = {
        ...vehicleDetails,
        manufacturer,
        model,
        variant,
        fuelType,
        transmissionType,
      };
    }

    // Process commercial vehicle details with inventory information
    const commercialVehicleDetails = ad.commercialVehicleDetails;
    let processedCommercialVehicleDetails = commercialVehicleDetails;

    if (commercialVehicleDetails) {
      // Fetch commercial vehicle inventory details individually
      const [manufacturer, model, variant, fuelType, transmissionType] =
        await Promise.all([
          commercialVehicleDetails.manufacturerId
            ? this.inventory.getManufacturer(
                commercialVehicleDetails.manufacturerId,
              )
            : Promise.resolve(undefined),
          commercialVehicleDetails.modelId
            ? this.inventory.getModel(commercialVehicleDetails.modelId)
            : Promise.resolve(undefined),
          commercialVehicleDetails.variantId
            ? this.inventory.getVariant(commercialVehicleDetails.variantId)
            : Promise.resolve(undefined),
          commercialVehicleDetails.fuelTypeId
            ? this.inventory.getFuelType(commercialVehicleDetails.fuelTypeId)
            : Promise.resolve(undefined),
          commercialVehicleDetails.transmissionTypeId
            ? this.inventory.getTransmissionType(
                commercialVehicleDetails.transmissionTypeId,
              )
            : Promise.resolve(undefined),
        ]);

      processedCommercialVehicleDetails = {
        ...commercialVehicleDetails,
        manufacturer,
        model,
        variant,
        fuelType,
        transmissionType,
      };
    }

    return {
      id: ad._id.toString(),
      title: ad.title,
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      latitude: ad.latitude || 9.3311,
      longitude: ad.longitude || 76.9222,
      link: ad.link || '',
      category: ad.category,
      isActive: ad.isActive,
      soldOut: ad.soldOut || false,
      isApproved: ad.isApproved || false,
      approvedBy: ad.approvedBy ? ad.approvedBy.toString() : undefined,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy.toString(),
      user: ad.user
        ? {
            id: ad.user._id.toString(),
            name: ad.user.name,
            email: ad.user.email,
            phone: ad.user.phone,
          }
        : undefined,
      propertyDetails: ad.propertyDetails || undefined,
      vehicleDetails: processedVehicleDetails,
      commercialVehicleDetails: processedCommercialVehicleDetails,
      isFavorite: ad.isFavorite || false,
    };
  }
}
