import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  CommercialVehicleAd,
  CommercialVehicleAdDocument,
} from '../../../ads/schemas/commercial-vehicle-ad.schema';

@Injectable()
export class CommercialVehicleAdRepository {
  constructor(
    @InjectModel(CommercialVehicleAd.name)
    private readonly model: Model<CommercialVehicleAdDocument>,
  ) {}

  async createFromDto(
    adId: Types.ObjectId,
    commercialData: any,
    options?: { session?: ClientSession },
  ): Promise<CommercialVehicleAdDocument> {
    const commercialVehicleAd = new this.model({
      ad: adId,
      adId: adId, // Support both field names for compatibility
      commercialVehicleType: commercialData.commercialVehicleType,
      bodyType: commercialData.bodyType,
      vehicleType: commercialData.vehicleType,
      manufacturerId: new Types.ObjectId(commercialData.manufacturerId),
      modelId: new Types.ObjectId(commercialData.modelId),
      variantId: commercialData.variantId
        ? new Types.ObjectId(commercialData.variantId)
        : undefined,
      year: commercialData.year,
      mileage: commercialData.mileage,
      payloadCapacity: commercialData.payloadCapacity,
      payloadUnit: commercialData.payloadUnit,
      axleCount: commercialData.axleCount,
      transmissionTypeId: new Types.ObjectId(commercialData.transmissionTypeId),
      fuelTypeId: new Types.ObjectId(commercialData.fuelTypeId),
      color: commercialData.color,
      hasInsurance: !!commercialData.hasInsurance,
      hasFitness: !!commercialData.hasFitness,
      hasPermit: !!commercialData.hasPermit,
      additionalFeatures: commercialData.additionalFeatures ?? [],
      seatingCapacity: commercialData.seatingCapacity,
    });

    return options?.session
      ? commercialVehicleAd.save({ session: options.session })
      : commercialVehicleAd.save();
  }

  async findByAdId(
    adId: Types.ObjectId,
  ): Promise<any> {
    return this.model
      .findOne({ $or: [{ ad: adId }, { adId: adId }] })
      .lean()
      .exec();
  }

  async findByAdIds(
    adIds: Types.ObjectId[],
  ): Promise<any[]> {
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
  ): Promise<CommercialVehicleAdDocument | null> {
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
