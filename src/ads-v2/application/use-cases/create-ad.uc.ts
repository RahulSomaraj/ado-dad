import { Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { PropertyAdRepository } from '../../infrastructure/repos/property-ad.repo';
import { VehicleAdRepository } from '../../infrastructure/repos/vehicle-ad.repo';
import { CommercialVehicleAdRepository } from '../../infrastructure/repos/commercial-vehicle-ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { IdempotencyService } from '../../infrastructure/services/idempotency.service';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { CommercialIntentService } from '../../infrastructure/services/commercial-intent.service';
import { OutboxService } from '../../infrastructure/services/outbox.service';
import { GeocodingService } from '../../../common/services/geocoding.service';
import { CreateAdV2Dto, AdCategoryV2 } from '../../dto/create-ad-v2.dto';
import {
  mapToDetailedResponseDto,
  buildTitle,
} from '../../domain/ad.v2.mappers';
import { validateCreateCombination } from '../../domain/ad.v2.validators';

const TTL = { LIST: 120, BY_ID: 900 };

@Injectable()
export class CreateAdUc {
  constructor(
    private readonly adRepo: AdRepository,
    private readonly propRepo: PropertyAdRepository,
    private readonly vehRepo: VehicleAdRepository,
    private readonly cvehRepo: CommercialVehicleAdRepository,
    private readonly inventory: VehicleInventoryGateway,
    private readonly idem: IdempotencyService,
    private readonly cache: AdsCache,
    private readonly intent: CommercialIntentService,
    private readonly outbox: OutboxService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async exec(input: {
    dto: CreateAdV2Dto;
    userId: string;
    userType: string;
    idempotencyKey?: string;
  }) {
    const { dto, userId, userType, idempotencyKey } = input;

    // 1) Idempotency guard (returns previous result if exists)
    const idemKey = idempotencyKey
      ? `ads:v2:create:${idempotencyKey}`
      : undefined;
    if (idemKey) {
      const prior = await this.idem.get(idemKey);
      if (prior) {
        return prior;
      }
    }

    // 2) Domain validation for combination shape
    validateCreateCombination(dto);

    // 3) Optional auto-detection for commercial
    const enrichedDto = await this.intent.applyIfCommercial(dto);

    // 3.5) Auto-generate location from coordinates if not provided
    if (
      !enrichedDto.data.location &&
      enrichedDto.data.latitude &&
      enrichedDto.data.longitude
    ) {
      try {
        const geocodingResult = await this.geocodingService.reverseGeocode(
          enrichedDto.data.latitude,
          enrichedDto.data.longitude,
        );
        enrichedDto.data.location = geocodingResult.location;
      } catch (error) {
        // If geocoding fails, use coordinates as fallback
        enrichedDto.data.location = `${enrichedDto.data.latitude.toFixed(4)}, ${enrichedDto.data.longitude.toFixed(4)}`;
      }
    }

    // 4) Inventory integrity checks (vehicle/commercial only)
    if (enrichedDto.category !== AdCategoryV2.PROPERTY) {
      const veh =
        enrichedDto.category === AdCategoryV2.COMMERCIAL_VEHICLE
          ? enrichedDto.commercial!
          : enrichedDto.vehicle!;
      await this.inventory.assertRefs(
        veh.manufacturerId,
        veh.modelId,
        veh.variantId,
        veh.transmissionTypeId,
        veh.fuelTypeId,
      );
    }

    // 5) Transactional create
    const session = await this.adRepo.startSession();
    session.startTransaction();

    try {
      // Title generation (for vehicles)
      const title = await buildTitle(enrichedDto, this.inventory);

      // Prepare geoLocation if coordinates are provided
      const geoLocation:
        | { type: 'Point'; coordinates: [number, number] }
        | undefined =
        enrichedDto.data.latitude !== undefined &&
        enrichedDto.data.longitude !== undefined
          ? {
              type: 'Point' as const,
              coordinates: [
                enrichedDto.data.longitude,
                enrichedDto.data.latitude,
              ] as [number, number], // [longitude, latitude]
            }
          : undefined;

      const savedAd = await this.adRepo.create(
        {
          title,
          description: enrichedDto.data.description,
          price: enrichedDto.data.price,
          images: (enrichedDto.data.images ?? []).slice(0, 20),
          location: enrichedDto.data.location,
          latitude: enrichedDto.data.latitude,
          longitude: enrichedDto.data.longitude,
          geoLocation,
          link: enrichedDto.data.link,
          postedBy: new Types.ObjectId(userId),
          category: enrichedDto.category as any, // Cast to match schema enum
          isActive: true,
          soldOut: false, // Always set soldOut to false by default
          isApproved: false, // Always set isApproved to false by default
        },
        { session },
      );

      // Create category-specific subdocument
      switch (enrichedDto.category) {
        case AdCategoryV2.PROPERTY:
          if (!enrichedDto.property) {
            throw new BadRequestException('Property data is required');
          }
          await this.propRepo.createFromDto(savedAd._id, enrichedDto.property, {
            session,
          });
          break;

        case AdCategoryV2.PRIVATE_VEHICLE:
        case AdCategoryV2.TWO_WHEELER:
          if (!enrichedDto.vehicle) {
            throw new BadRequestException('Vehicle data is required');
          }
          await this.vehRepo.createFromDto(savedAd._id, enrichedDto.vehicle, {
            session,
          });
          break;

        case AdCategoryV2.COMMERCIAL_VEHICLE:
          if (!enrichedDto.commercial) {
            throw new BadRequestException(
              'Commercial vehicle data is required',
            );
          }
          await this.cvehRepo.createFromDto(
            savedAd._id,
            enrichedDto.commercial,
            { session },
          );
          break;

        default:
          throw new BadRequestException(
            `Invalid category: ${enrichedDto.category}`,
          );
      }

      await session.commitTransaction();
      session.endSession();

      // 6) Outbox event (async enrichments)
      await this.outbox.enqueue('ad.created', {
        adId: savedAd._id.toString(),
        category: enrichedDto.category,
        userId: userId,
        userType: userType,
      });

      // 7) Invalidate list caches
      await this.cache.invalidateLists();

      // 8) Hydrate read model for response
      const detailed = await this.adRepo.aggregateOneByIdDetailed(savedAd._id);
      if (!detailed) {
        throw new BadRequestException(
          'Failed to retrieve created advertisement',
        );
      }

      const response = mapToDetailedResponseDto(detailed);

      // 9) Idempotency store
      if (idemKey) {
        await this.idem.set(idemKey, response, 15 * 60); // 15 minutes TTL
      }

      return response;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error creating advertisement:', error);
      throw error;
    }
  }
}
