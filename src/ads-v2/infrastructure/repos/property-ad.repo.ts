import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  PropertyAd,
  PropertyAdDocument,
} from '../../../ads/schemas/property-ad.schema';

@Injectable()
export class PropertyAdRepository {
  constructor(
    @InjectModel(PropertyAd.name)
    private readonly model: Model<PropertyAdDocument>,
  ) {}

  async createFromDto(
    adId: Types.ObjectId,
    propertyData: any,
    options?: { session?: ClientSession },
  ): Promise<PropertyAdDocument> {
    const propertyAd = new this.model({
      ad: adId,
      adId: adId, // Support both field names for compatibility
      propertyType: propertyData.propertyType,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      listingType: propertyData.listingType,
      areaSqft: propertyData.areaSqft,
      floor: propertyData.floor,
      isFurnished: !!propertyData.isFurnished,
      hasParking: !!propertyData.hasParking,
      hasGarden: !!propertyData.hasGarden,
      amenities: propertyData.amenities ?? [],
    });

    return options?.session
      ? propertyAd.save({ session: options.session })
      : propertyAd.save();
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
  ): Promise<PropertyAdDocument | null> {
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
