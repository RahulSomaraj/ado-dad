import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  VehicleAd,
  VehicleAdDocument,
} from '../../../ads/schemas/vehicle-ad.schema';

@Injectable()
export class VehicleAdRepository {
  constructor(
    @InjectModel(VehicleAd.name)
    private readonly model: Model<VehicleAdDocument>,
  ) {}

  async createFromDto(
    adId: Types.ObjectId,
    vehicleData: any,
    options?: { session?: ClientSession },
  ): Promise<VehicleAdDocument> {
    const vehicleAd = new this.model({
      ad: adId,
      adId: adId, // Support both field names for compatibility
      vehicleType: vehicleData.vehicleType,
      manufacturerId: new Types.ObjectId(vehicleData.manufacturerId),
      modelId: new Types.ObjectId(vehicleData.modelId),
      variantId: vehicleData.variantId
        ? new Types.ObjectId(vehicleData.variantId)
        : undefined,
      year: vehicleData.year,
      mileage: vehicleData.mileage,
      transmissionTypeId: new Types.ObjectId(vehicleData.transmissionTypeId),
      fuelTypeId: new Types.ObjectId(vehicleData.fuelTypeId),
      color: vehicleData.color,
      isFirstOwner: !!vehicleData.isFirstOwner,
      hasInsurance: !!vehicleData.hasInsurance,
      hasRcBook: !!vehicleData.hasRcBook,
      additionalFeatures: vehicleData.additionalFeatures ?? [],
    });

    return options?.session
      ? vehicleAd.save({ session: options.session })
      : vehicleAd.save();
  }

  async findByAdId(adId: Types.ObjectId): Promise<any> {
    return this.model
      .findOne({ $or: [{ ad: adId }, { adId: adId }] })
      .lean()
      .exec();
  }

  async findByAdIds(adIds: Types.ObjectId[]): Promise<any[]> {
    return this.model
      .find({
        $or: [{ ad: { $in: adIds } }, { adId: { $in: adIds } }],
      })
      .lean()
      .exec();
  }

  async updateByAdId(
    adId: Types.ObjectId,
    updateData: any,
    options?: { session?: ClientSession },
  ): Promise<VehicleAdDocument | null> {
    return this.model
      .findOneAndUpdate({ $or: [{ ad: adId }, { adId: adId }] }, updateData, {
        new: true,
        ...options,
      })
      .exec();
  }

  async deleteByAdId(
    adId: Types.ObjectId,
    options?: { session?: ClientSession },
  ): Promise<any> {
    return this.model
      .deleteOne({ $or: [{ ad: adId }, { adId: adId }] }, options)
      .exec();
  }
}
