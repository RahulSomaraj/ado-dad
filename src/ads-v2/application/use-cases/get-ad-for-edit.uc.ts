import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { PropertyAdRepository } from '../../infrastructure/repos/property-ad.repo';
import { VehicleAdRepository } from '../../infrastructure/repos/vehicle-ad.repo';
import { CommercialVehicleAdRepository } from '../../infrastructure/repos/commercial-vehicle-ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import {
  ApiErrorCode,
  ApiErrorException,
} from '../../../common/errors/api-errors';
import { UserType } from '../../../users/enums/user.types';
import { AdCategoryV2 } from '../../dto/create-ad-v2.dto';

const str = (v: unknown): string | null =>
  v === undefined || v === null ? null : String(v);
const val = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

export function adNotFound() {
  return new ApiErrorException(
    HttpStatus.NOT_FOUND,
    ApiErrorCode.NOT_FOUND,
    'Advertisement not found',
  );
}

/**
 * Loads an ad the caller may edit: owner, or super admin. Anything else
 * (missing, deleted, someone else's) is the same 404 so ids cannot be probed.
 */
export async function loadEditableAd(
  adRepo: AdRepository,
  adId: string,
  userId: string,
  userType?: string,
): Promise<any> {
  if (!Types.ObjectId.isValid(adId)) throw adNotFound();
  const ad = await adRepo.findById(adId);
  if (!ad || ad.isDeleted) throw adNotFound();
  const isOwner = String(ad.postedBy) === String(userId);
  if (!isOwner && userType !== UserType.SUPER_ADMIN) throw adNotFound();
  return ad;
}

/** GET /v2/ads/:id/edit — the ad in POST /v2/ads body shape, for pre-filling the form. */
@Injectable()
export class GetAdForEditUc {
  constructor(
    private readonly adRepo: AdRepository,
    private readonly propRepo: PropertyAdRepository,
    private readonly vehRepo: VehicleAdRepository,
    private readonly cvehRepo: CommercialVehicleAdRepository,
    private readonly inventory: VehicleInventoryGateway,
  ) {}

  async exec(input: { adId: string; userId: string; userType?: string }) {
    const ad = await loadEditableAd(
      this.adRepo,
      input.adId,
      input.userId,
      input.userType,
    );

    const out: Record<string, any> = {
      id: String(ad._id),
      status: ad.status ?? (ad.isApproved ? 'approved' : 'pending'),
      category: ad.category,
      data: {
        title: val(ad.title),
        description: val(ad.description),
        price: val(ad.price),
        location: val(ad.location),
        latitude: typeof ad.latitude === 'number' ? ad.latitude : null,
        longitude: typeof ad.longitude === 'number' ? ad.longitude : null,
        media: (ad.images ?? []).map((url: string) => ({ url })),
        videoUrl: ad.link ? String(ad.link) : null,
      },
    };

    switch (ad.category) {
      case AdCategoryV2.PROPERTY: {
        const p = await this.propRepo.findByAdId(ad._id);
        out.property = p
          ? {
              listingType: val(p.listingType),
              propertyType: val(p.propertyType),
              bedrooms: val(p.bedrooms),
              bathrooms: val(p.bathrooms),
              areaSqft: val(p.areaSqft),
              landAreaSqft: val(p.landAreaSqft),
              floor: val(p.floor),
              isFurnished: val(p.isFurnished),
              furnishing: val(p.furnishing),
              hasParking: val(p.hasParking),
              hasGarden: val(p.hasGarden),
              amenities: p.amenities ?? [],
            }
          : null;
        break;
      }
      case AdCategoryV2.PRIVATE_VEHICLE:
      case AdCategoryV2.TWO_WHEELER: {
        const v = await this.vehRepo.findByAdId(ad._id);
        out.vehicle = v ? await this.vehicleBlock(v) : null;
        break;
      }
      case AdCategoryV2.COMMERCIAL_VEHICLE: {
        const c = await this.cvehRepo.findByAdId(ad._id);
        out.commercial = c
          ? {
              ...(await this.vehicleBlock(c)),
              commercialVehicleType: val(c.commercialVehicleType),
              bodyType: val(c.bodyType),
              payloadCapacity: val(c.payloadCapacity),
              payloadUnit: val(c.payloadUnit),
              axleCount: val(c.axleCount),
              seatingCapacity: val(c.seatingCapacity),
              hasFitness: val(c.hasFitness),
              hasPermit: val(c.hasPermit),
            }
          : null;
        break;
      }
    }
    return out;
  }

  private async vehicleBlock(v: any) {
    const [manufacturer, model, variant] = await Promise.all([
      v.manufacturerId ? this.inventory.getManufacturer(String(v.manufacturerId)) : null,
      v.modelId ? this.inventory.getModel(String(v.modelId)) : null,
      v.variantId ? this.inventory.getVariant(String(v.variantId)) : null,
    ]);
    const name = (doc: any): string | null => {
      const n = doc?.displayName || doc?.name;
      return n && n !== 'Not Found' ? String(n) : null;
    };
    return {
      vehicleType: val(v.vehicleType),
      manufacturerId: str(v.manufacturerId),
      modelId: str(v.modelId),
      variantId: str(v.variantId),
      year: val(v.year),
      mileage: val(v.mileage),
      transmissionTypeId: str(v.transmissionTypeId),
      fuelTypeId: str(v.fuelTypeId),
      color: val(v.color),
      ownerCount: val(v.ownerCount),
      isFirstOwner: val(v.isFirstOwner),
      hasInsurance: val(v.hasInsurance),
      hasRcBook: val(v.hasRcBook),
      additionalFeatures: v.additionalFeatures ?? [],
      manufacturerName: name(manufacturer),
      modelName: name(model),
      variantName: name(variant),
    };
  }
}
