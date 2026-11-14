import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Ad, AdDocument } from '../../../ads/schemas/ad.schema';

@Injectable()
export class AdRepository {
  /**
   * P3-3: cap on server-side execution time for ads aggregations.
   *
   * The pool is small (maxPoolSize: 10) and a geo list request used to issue
   * two aggregations, so a handful of slow $geoNear scans could saturate it and
   * stall the whole API. maxTimeMS makes a pathological query fail fast instead
   * of holding a connection open for socketTimeoutMS (45 s).
   *
   * Raise only after measuring; log/alert on MaxTimeMSExpired so a timeout
   * never silently hides a regression.
   */
  private static readonly AGGREGATE_MAX_TIME_MS = 5000;

  constructor(
    @InjectModel(Ad.name) private readonly model: Model<AdDocument>,
  ) {}

  async create(
    data: Partial<Ad>,
    options?: { session?: ClientSession },
  ): Promise<AdDocument> {
    const ad = new this.model(data);
    return options?.session ? ad.save({ session: options.session }) : ad.save();
  }

  async findById(id: string | Types.ObjectId): Promise<any> {
    return this.model.findById(id).lean().exec();
  }

  async findByIds(ids: Types.ObjectId[]): Promise<any[]> {
    return this.model
      .find({ _id: { $in: ids }, isDeleted: { $ne: true } })
      .populate('postedBy', 'name email phone')
      .lean()
      .exec();
  }

  async aggregateOneByIdDetailed(id: string | Types.ObjectId): Promise<any> {
    const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;

    const pipeline = [
      { $match: { _id: objectId, isDeleted: { $ne: true } } },

      // User lookup
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // Property lookups
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: '_propA',
        },
      },
      {
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'adId',
          as: '_propB',
        },
      },
      {
        $addFields: {
          propertyDetails: { $setUnion: ['$_propA', '$_propB'] },
        },
      },
      { $project: { _propA: 0, _propB: 0 } },

      // Vehicle lookups
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: '_vehA',
        },
      },
      {
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'adId',
          as: '_vehB',
        },
      },
      {
        $addFields: {
          vehicleDetails: { $setUnion: ['$_vehA', '$_vehB'] },
        },
      },
      { $project: { _vehA: 0, _vehB: 0 } },

      // Commercial vehicle lookups
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: '_cvehA',
        },
      },
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'adId',
          as: '_cvehB',
        },
      },
      {
        $addFields: {
          commercialVehicleDetails: { $setUnion: ['$_cvehA', '$_cvehB'] },
        },
      },
      { $project: { _cvehA: 0, _cvehB: 0 } },

      // Vehicle inventory lookups for vehicle details
      {
        $lookup: {
          from: 'manufacturers',
          localField: 'vehicleDetails.manufacturerId',
          foreignField: '_id',
          as: 'manufacturerInfo',
        },
      },
      {
        $lookup: {
          from: 'manufacturers',
          localField: 'commercialVehicleDetails.manufacturerId',
          foreignField: '_id',
          as: 'commercialManufacturerInfo',
        },
      },
      {
        $lookup: {
          from: 'vehiclemodels',
          localField: 'vehicleDetails.modelId',
          foreignField: '_id',
          as: 'modelInfo',
        },
      },
      {
        $lookup: {
          from: 'vehiclemodels',
          localField: 'commercialVehicleDetails.modelId',
          foreignField: '_id',
          as: 'commercialModelInfo',
        },
      },
      {
        $lookup: {
          from: 'vehiclevariants',
          localField: 'vehicleDetails.variantId',
          foreignField: '_id',
          as: 'variantInfo',
        },
      },
      {
        $lookup: {
          from: 'vehiclevariants',
          localField: 'commercialVehicleDetails.variantId',
          foreignField: '_id',
          as: 'commercialVariantInfo',
        },
      },
      {
        $lookup: {
          from: 'transmissiontypes',
          localField: 'vehicleDetails.transmissionTypeId',
          foreignField: '_id',
          as: 'transmissionInfo',
        },
      },
      {
        $lookup: {
          from: 'transmissiontypes',
          localField: 'commercialVehicleDetails.transmissionTypeId',
          foreignField: '_id',
          as: 'commercialTransmissionInfo',
        },
      },
      {
        $lookup: {
          from: 'fueltypes',
          localField: 'vehicleDetails.fuelTypeId',
          foreignField: '_id',
          as: 'fuelInfo',
        },
      },
      {
        $lookup: {
          from: 'fueltypes',
          localField: 'commercialVehicleDetails.fuelTypeId',
          foreignField: '_id',
          as: 'commercialFuelInfo',
        },
      },

      // Add inventory details to vehicle details
      {
        $addFields: {
          'vehicleDetails.inventory': {
            $map: {
              input: '$vehicleDetails',
              as: 'veh',
              in: {
                $mergeObjects: [
                  '$$veh',
                  {
                    manufacturer: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$manufacturerInfo',
                            cond: {
                              $eq: ['$$this._id', '$$veh.manufacturerId'],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    model: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$modelInfo',
                            cond: { $eq: ['$$this._id', '$$veh.modelId'] },
                          },
                        },
                        0,
                      ],
                    },
                    variant: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$variantInfo',
                            cond: { $eq: ['$$this._id', '$$veh.variantId'] },
                          },
                        },
                        0,
                      ],
                    },
                    transmissionType: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$transmissionInfo',
                            cond: {
                              $eq: ['$$this._id', '$$veh.transmissionTypeId'],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    fuelType: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$fuelInfo',
                            cond: { $eq: ['$$this._id', '$$veh.fuelTypeId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
          'commercialVehicleDetails.inventory': {
            $map: {
              input: '$commercialVehicleDetails',
              as: 'cveh',
              in: {
                $mergeObjects: [
                  '$$cveh',
                  {
                    manufacturer: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commercialManufacturerInfo',
                            cond: {
                              $eq: ['$$this._id', '$$cveh.manufacturerId'],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    model: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commercialModelInfo',
                            cond: { $eq: ['$$this._id', '$$cveh.modelId'] },
                          },
                        },
                        0,
                      ],
                    },
                    variant: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commercialVariantInfo',
                            cond: { $eq: ['$$this._id', '$$cveh.variantId'] },
                          },
                        },
                        0,
                      ],
                    },
                    transmissionType: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commercialTransmissionInfo',
                            cond: {
                              $eq: ['$$this._id', '$$cveh.transmissionTypeId'],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    fuelType: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commercialFuelInfo',
                            cond: { $eq: ['$$this._id', '$$cveh.fuelTypeId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // Clean up inventory lookup fields
      {
        $project: {
          manufacturerInfo: 0,
          commercialManufacturerInfo: 0,
          modelInfo: 0,
          commercialModelInfo: 0,
          variantInfo: 0,
          commercialVariantInfo: 0,
          transmissionInfo: 0,
          commercialTransmissionInfo: 0,
          fuelInfo: 0,
          commercialFuelInfo: 0,
        },
      },
    ];

    const [result] = await this.model
      .aggregate(pipeline)
      .option({ maxTimeMS: AdRepository.AGGREGATE_MAX_TIME_MS })
      .exec();
    return result;
  }

  async startSession(): Promise<ClientSession> {
    return this.model.startSession();
  }

  async updateOne(
    filter: any,
    update: any,
    options?: { session?: ClientSession },
  ): Promise<any> {
    return this.model.updateOne(filter, update, options).exec();
  }

  async deleteOne(
    filter: any,
    options?: { session?: ClientSession },
  ): Promise<any> {
    return this.model.deleteOne(filter, options).exec();
  }

  /**
   * P1-5: atomically bump viewCount and return the new value.
   *
   * The detail response is now served from cache, so the cached payload's
   * viewCount is a snapshot. Reading the post-increment value back from the
   * write we already perform keeps the displayed count exact without adding a
   * second query.
   */
  async incrementViewCount(
    id: string | Types.ObjectId,
  ): Promise<number | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id },
        { $inc: { viewCount: 1 } },
        { new: true, projection: { viewCount: 1 } },
      )
      .lean()
      .exec();
    return (doc as any)?.viewCount ?? null;
  }

  async aggregate(
    pipeline: any[],
    options?: { maxTimeMS?: number; allowDiskUse?: boolean },
  ): Promise<any[]> {
    return this.model
      .aggregate(pipeline)
      .option({
        maxTimeMS: options?.maxTimeMS ?? AdRepository.AGGREGATE_MAX_TIME_MS,
        // Left off deliberately: the list pipeline must stay within the 100 MB
        // in-memory limit. If a stage ever needs disk, that is a pipeline bug
        // to fix, not a flag to flip.
        ...(options?.allowDiskUse !== undefined
          ? { allowDiskUse: options.allowDiskUse }
          : {}),
      })
      .exec();
  }
}
