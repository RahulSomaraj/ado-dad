import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Favorite, FavoriteDocument } from './schemas/schema.favorite';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { AdsService } from '../ads/services/ads.service';

const toObjectId = (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException({
      error: { status: 400, message: `Invalid ObjectId: ${id}` },
    });
  }
  return new Types.ObjectId(id);
};

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    private readonly adsService: AdsService,
  ) {}

  // -------- CREATE / TOGGLE --------

  async addFavorite(
    userId: string,
    createFavoriteDto: CreateFavoriteDto,
  ): Promise<{ isFavorited: boolean; favoriteId?: string; message: string }> {
    const adId = createFavoriteDto.adId;

    // 1) Validate IDs + existence
    const userOid = toObjectId(userId);
    const adOid = toObjectId(adId);
    const adExists = await this.adsService.exists(adId);
    if (!adExists) {
      throw new BadRequestException({
        error: { status: 400, message: `Ad with ID ${adId} not found` },
      });
    }

    // 2) Toggle behavior
    const existing = await this.favoriteModel
      .findOne({ userId: userOid, itemId: adOid })
      .lean();

    if (existing) {
      await this.favoriteModel.deleteOne({ _id: existing._id });
      return { isFavorited: false, message: 'Ad removed from favorites' };
    }

    const saved = await new this.favoriteModel({
      userId: userOid,
      itemId: adOid,
    }).save();

    return {
      isFavorited: true,
      favoriteId: (saved._id as any).toString(),
      message: 'Ad added to favorites',
    };
  }

  async toggleFavorite(
    userId: string,
    adId: string,
  ): Promise<{ isFavorited: boolean; favoriteId?: string; message: string }> {
    return this.addFavorite(userId, { adId } as CreateFavoriteDto);
  }

  // -------- READ (LIST + GET ONE) --------

  async getUserFavorites(
    userId: string,
    query: {
      itemId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const userOid = toObjectId(userId);
    const itemOid = query.itemId ? toObjectId(query.itemId) : null;

    // Single pipeline computes both data & total WITH THE SAME FILTERS
    const pipeline: any[] = [
      {
        $match: {
          userId: userOid,
          ...(itemOid ? { itemId: itemOid } : {}),
        },
      },

      // Normalize itemId type for lookup (handles string/ObjectId mismatch)
      {
        $set: {
          itemIdObj: {
            $cond: [
              { $eq: [{ $type: '$itemId' }, 'string'] },
              { $toObjectId: '$itemId' },
              '$itemId',
            ],
          },
        },
      },

      // Lookup Ad
      {
        $lookup: {
          from: 'ads',
          localField: 'itemIdObj',
          foreignField: '_id',
          as: 'ad',
          pipeline: [
            // Filter out sold-out ads
            {
              $match: {
                soldOut: false,
                isDeleted: { $ne: true },
                isActive: true,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'postedBy',
                foreignField: '_id',
                as: 'user',
                pipeline: [
                  {
                    $project: {
                      name: 1,
                      email: 1,
                      countryCode: 1,
                      phoneNumber: 1,
                      profilePic: 1,
                      type: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'propertyads',
                localField: '_id',
                foreignField: 'ad',
                as: 'propertyDetails',
              },
            },
            {
              $lookup: {
                from: 'vehicleads',
                localField: '_id',
                foreignField: 'ad',
                as: 'vehicleDetails',
              },
            },
            {
              $lookup: {
                from: 'commercialvehicleads',
                localField: '_id',
                foreignField: 'ad',
                as: 'commercialVehicleDetails',
              },
            },
            // keep the ad doc light
            {
              $project: {
                description: 1,
                price: 1,
                images: 1,
                location: 1,
                category: 1,
                isActive: 1,
                createdAt: 1,
                updatedAt: 1,
                postedBy: 1,
                user: 1,
                propertyDetails: { $slice: ['$propertyDetails', 1] },
                vehicleDetails: { $slice: ['$vehicleDetails', 1] },
                commercialVehicleDetails: {
                  $slice: ['$commercialVehicleDetails', 1],
                },
              },
            },
          ],
        },
      },
      { $unwind: { path: '$ad', preserveNullAndEmptyArrays: false } }, // exclude non-matching

      // Sort once
      { $sort: { createdAt: -1 } },

      // Facet for pagination + exact total
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0] },
        },
      },
    ];

    const agg = await this.favoriteModel.aggregate(pipeline).allowDiskUse(true);
    const res = agg[0] || { data: [], total: 0 };

    // map to your response shape
    const detailedAds = res.data.map((favorite: any) => {
      const ad = favorite.ad;
      return {
        id: ad._id.toString(),
        description: ad.description,
        price: ad.price,
        images: ad.images || [],
        location: ad.location,
        category: ad.category,
        isActive: ad.isActive,
        postedAt: ad.createdAt,
        updatedAt: ad.updatedAt,
        postedBy: ad.postedBy?._id?.toString?.(),
        user: ad.user
          ? {
              id: ad.user._id?.toString?.(),
              name: ad.user.name,
              email: ad.user.email,
              countryCode: ad.user.countryCode,
              phoneNumber: ad.user.phoneNumber,
            }
          : undefined,
        propertyDetails: ad.propertyDetails?.[0] || undefined,
        vehicleDetails: ad.vehicleDetails?.[0] || undefined,
        commercialVehicleDetails: ad.commercialVehicleDetails?.[0] || undefined,
        favoriteId: favorite._id.toString(),
        favoritedAt: favorite.createdAt,
        isFavorite: true, // All ads in favorites list are favorited
        isFavorited: true, // Alternative field name for consistency
      };
    });

    const total = res.total as number;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const result = {
      data: detailedAds,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return result;
  }

  async getFavoriteById(userId: string, favoriteId: string): Promise<any> {
    const userOid = toObjectId(userId);
    const favOid = toObjectId(favoriteId);

    const pipeline: any[] = [
      { $match: { _id: favOid, userId: userOid } },
      {
        $set: {
          itemIdObj: {
            $cond: [
              { $eq: [{ $type: '$itemId' }, 'string'] },
              { $toObjectId: '$itemId' },
              '$itemId',
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'ads',
          localField: 'itemIdObj',
          foreignField: '_id',
          as: 'ad',
          pipeline: [
            {
              $lookup: {
                from: 'users',
                localField: 'postedBy',
                foreignField: '_id',
                as: 'user',
                pipeline: [
                  {
                    $project: {
                      name: 1,
                      email: 1,
                      countryCode: 1,
                      phoneNumber: 1,
                      profilePic: 1,
                      type: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'propertyads',
                localField: '_id',
                foreignField: 'ad',
                as: 'propertyDetails',
              },
            },
            {
              $lookup: {
                from: 'vehicleads',
                localField: '_id',
                foreignField: 'ad',
                as: 'vehicleDetails',
              },
            },
            {
              $lookup: {
                from: 'commercialvehicleads',
                localField: '_id',
                foreignField: 'ad',
                as: 'commercialVehicleDetails',
              },
            },
            {
              $project: {
                description: 1,
                price: 1,
                images: 1,
                location: 1,
                category: 1,
                isActive: 1,
                createdAt: 1,
                updatedAt: 1,
                postedBy: 1,
                user: 1,
                propertyDetails: { $slice: ['$propertyDetails', 1] },
                vehicleDetails: { $slice: ['$vehicleDetails', 1] },
                commercialVehicleDetails: {
                  $slice: ['$commercialVehicleDetails', 1],
                },
              },
            },
          ],
        },
      },
      { $unwind: { path: '$ad', preserveNullAndEmptyArrays: false } },
    ];

    const favorites = await this.favoriteModel.aggregate(pipeline);
    if (!favorites.length) throw new NotFoundException('Favorite not found');

    const fav = favorites[0];
    const ad = fav.ad;
    return {
      id: ad._id.toString(),
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      category: ad.category,
      isActive: ad.isActive,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy?._id?.toString?.(),
      user: ad.user
        ? {
            id: ad.user._id?.toString?.(),
            name: ad.user.name,
            email: ad.user.email,
            countryCode: ad.user.countryCode,
            phoneNumber: ad.user.phoneNumber,
          }
        : undefined,
      propertyDetails: ad.propertyDetails?.[0] || undefined,
      vehicleDetails: ad.vehicleDetails?.[0] || undefined,
      commercialVehicleDetails: ad.commercialVehicleDetails?.[0] || undefined,
      favoriteId: fav._id.toString(),
      favoritedAt: fav.createdAt,
      isFavorite: true,
      isFavorited: true,
    };
  }

  // -------- UPDATE / DELETE --------

  async updateFavorite(
    userId: string,
    favoriteId: string,
    updateFavoriteDto: UpdateFavoriteDto,
  ): Promise<Favorite> {
    const userOid = toObjectId(userId);
    const favOid = toObjectId(favoriteId);
    const newAdOid = toObjectId(updateFavoriteDto.adId);

    const adExists = await this.adsService.exists(updateFavoriteDto.adId);
    if (!adExists) {
      throw new BadRequestException({
        error: {
          status: 400,
          message: `Ad with ID ${updateFavoriteDto.adId} not found`,
        },
      });
    }

    const exists = await this.favoriteModel
      .findOne({ userId: userOid, itemId: newAdOid, _id: { $ne: favOid } })
      .lean();

    if (exists) {
      throw new BadRequestException({
        error: { status: 400, message: 'Ad is already in your favorites' },
      });
    }

    const oldFavorite = await this.favoriteModel.findById(favOid);

    const favorite = await this.favoriteModel.findOneAndUpdate(
      { _id: favOid, userId: userOid },
      { itemId: newAdOid },
      { new: true },
    );
    if (!favorite) throw new NotFoundException('Favorite not found');

    return favorite;
  }

  async removeFavorite(
    userId: string,
    favoriteId: string,
  ): Promise<{ message: string }> {
    const userOid = toObjectId(userId);
    const favOid = toObjectId(favoriteId);

    const favorite = await this.favoriteModel.findOneAndDelete({
      _id: favOid,
      userId: userOid,
    });
    if (!favorite) throw new NotFoundException('Favorite not found');

    return { message: 'Item removed from favorites' };
  }

  // -------- COUNT --------

  async getFavoritesCount(userId: string): Promise<{ count: number }> {
    const userOid = toObjectId(userId);

    const pipeline: any[] = [
      { $match: { userId: userOid } },
      {
        $set: {
          itemIdObj: {
            $cond: [
              { $eq: [{ $type: '$itemId' }, 'string'] },
              { $toObjectId: '$itemId' },
              '$itemId',
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'ads',
          localField: 'itemIdObj',
          foreignField: '_id',
          as: 'ad',
          pipeline: [{ $project: { _id: 1 } }],
        },
      },
      { $match: { ad: { $ne: [] } } }, // keep only favorites with a matching ad
      { $count: 'count' },
    ];

    const res = await this.favoriteModel.aggregate(pipeline);
    const count = res[0]?.count ?? 0;
    return { count };
  }
}
