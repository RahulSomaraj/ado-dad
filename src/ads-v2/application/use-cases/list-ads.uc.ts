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

    // Vehicle inventory lookups for enhanced search
    // Manufacturer lookup for vehicle ads
    pipeline.push({
      $lookup: {
        from: 'manufacturers',
        let: { vehicleDetails: '$vehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$vehicleDetails.manufacturerId'],
              },
            },
          },
        ],
        as: 'vehicleManufacturerDetails',
      },
    });

    // Vehicle model lookup for vehicle ads
    pipeline.push({
      $lookup: {
        from: 'vehiclemodels',
        let: { vehicleDetails: '$vehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$vehicleDetails.modelId'],
              },
            },
          },
        ],
        as: 'vehicleModelDetails',
      },
    });

    // Vehicle variant lookup for vehicle ads
    pipeline.push({
      $lookup: {
        from: 'vehiclevariants',
        let: { vehicleDetails: '$vehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$vehicleDetails.variantId'],
              },
            },
          },
        ],
        as: 'vehicleVariantDetails',
      },
    });

    // Fuel type lookup for vehicle ads
    pipeline.push({
      $lookup: {
        from: 'fueltypes',
        let: { vehicleDetails: '$vehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$vehicleDetails.fuelTypeId'],
              },
            },
          },
        ],
        as: 'vehicleFuelTypeDetails',
      },
    });

    // Transmission type lookup for vehicle ads
    pipeline.push({
      $lookup: {
        from: 'transmissiontypes',
        let: { vehicleDetails: '$vehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$vehicleDetails.transmissionTypeId'],
              },
            },
          },
        ],
        as: 'vehicleTransmissionTypeDetails',
      },
    });

    // Commercial vehicle inventory lookups for enhanced search
    // Manufacturer lookup for commercial vehicle ads
    pipeline.push({
      $lookup: {
        from: 'manufacturers',
        let: { commercialVehicleDetails: '$commercialVehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$commercialVehicleDetails.manufacturerId'],
              },
            },
          },
        ],
        as: 'commercialManufacturerDetails',
      },
    });

    // Vehicle model lookup for commercial vehicle ads
    pipeline.push({
      $lookup: {
        from: 'vehiclemodels',
        let: { commercialVehicleDetails: '$commercialVehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$commercialVehicleDetails.modelId'],
              },
            },
          },
        ],
        as: 'commercialVehicleModelDetails',
      },
    });

    // Vehicle variant lookup for commercial vehicle ads
    pipeline.push({
      $lookup: {
        from: 'vehiclevariants',
        let: { commercialVehicleDetails: '$commercialVehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$commercialVehicleDetails.variantId'],
              },
            },
          },
        ],
        as: 'commercialVehicleVariantDetails',
      },
    });

    // Fuel type lookup for commercial vehicle ads
    pipeline.push({
      $lookup: {
        from: 'fueltypes',
        let: { commercialVehicleDetails: '$commercialVehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$commercialVehicleDetails.fuelTypeId'],
              },
            },
          },
        ],
        as: 'commercialFuelTypeDetails',
      },
    });

    // Transmission type lookup for commercial vehicle ads
    pipeline.push({
      $lookup: {
        from: 'transmissiontypes',
        let: { commercialVehicleDetails: '$commercialVehicleDetails' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$commercialVehicleDetails.transmissionTypeId'],
              },
            },
          },
        ],
        as: 'commercialTransmissionTypeDetails',
      },
    });

    // Enhanced search filter - search across title, description, and vehicle inventory fields
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            // Basic ad fields
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },

            // Vehicle manufacturer names
            {
              'vehicleManufacturerDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'vehicleManufacturerDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Vehicle model names
            { 'vehicleModelDetails.name': { $regex: search, $options: 'i' } },
            {
              'vehicleModelDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Vehicle variant names
            { 'vehicleVariantDetails.name': { $regex: search, $options: 'i' } },
            {
              'vehicleVariantDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Fuel type names
            {
              'vehicleFuelTypeDetails.name': { $regex: search, $options: 'i' },
            },
            {
              'vehicleFuelTypeDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Transmission type names
            {
              'vehicleTransmissionTypeDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'vehicleTransmissionTypeDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Commercial vehicle manufacturer names
            {
              'commercialManufacturerDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'commercialManufacturerDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Commercial vehicle model names
            {
              'commercialVehicleModelDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'commercialVehicleModelDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Commercial vehicle variant names
            {
              'commercialVehicleVariantDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'commercialVehicleVariantDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Commercial vehicle fuel type names
            {
              'commercialFuelTypeDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'commercialFuelTypeDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },

            // Commercial vehicle transmission type names
            {
              'commercialTransmissionTypeDetails.name': {
                $regex: search,
                $options: 'i',
              },
            },
            {
              'commercialTransmissionTypeDetails.displayName': {
                $regex: search,
                $options: 'i',
              },
            },
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
          phone: '$user.phone',
        },
        propertyDetails: { $arrayElemAt: ['$propertyDetails', 0] },
        vehicleDetails: {
          $let: {
            vars: {
              vehicle: { $arrayElemAt: ['$vehicleDetails', 0] },
            },
            in: {
              $cond: {
                if: { $ne: ['$$vehicle', null] },
                then: {
                  $mergeObjects: [
                    '$$vehicle',
                    {
                      manufacturer: {
                        $arrayElemAt: ['$vehicleManufacturerDetails', 0],
                      },
                      model: { $arrayElemAt: ['$vehicleModelDetails', 0] },
                      variant: { $arrayElemAt: ['$vehicleVariantDetails', 0] },
                      fuelType: {
                        $arrayElemAt: ['$vehicleFuelTypeDetails', 0],
                      },
                      transmissionType: {
                        $arrayElemAt: ['$vehicleTransmissionTypeDetails', 0],
                      },
                    },
                  ],
                },
                else: null,
              },
            },
          },
        },
        commercialVehicleDetails: {
          $let: {
            vars: {
              commercial: { $arrayElemAt: ['$commercialVehicleDetails', 0] },
            },
            in: {
              $cond: {
                if: { $ne: ['$$commercial', null] },
                then: {
                  $mergeObjects: [
                    '$$commercial',
                    {
                      manufacturer: {
                        $arrayElemAt: ['$commercialManufacturerDetails', 0],
                      },
                      model: {
                        $arrayElemAt: ['$commercialVehicleModelDetails', 0],
                      },
                      variant: {
                        $arrayElemAt: ['$commercialVehicleVariantDetails', 0],
                      },
                      fuelType: {
                        $arrayElemAt: ['$commercialFuelTypeDetails', 0],
                      },
                      transmissionType: {
                        $arrayElemAt: ['$commercialTransmissionTypeDetails', 0],
                      },
                    },
                  ],
                },
                else: null,
              },
            },
          },
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
