import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { PropertyAdRepository } from '../../infrastructure/repos/property-ad.repo';
import { VehicleAdRepository } from '../../infrastructure/repos/vehicle-ad.repo';
import { CommercialVehicleAdRepository } from '../../infrastructure/repos/commercial-vehicle-ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { IdempotencyService } from '../../infrastructure/services/idempotency.service';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { CommercialIntentService } from '../../infrastructure/services/commercial-intent.service';
import { OutboxService } from '../../infrastructure/services/outbox.service';
import { LegacyAdsCacheInvalidator } from '../../infrastructure/services/legacy-ads-cache.invalidator';
import { AdSearchDocBuilder, searchDocFields } from '../../../search/services/ad-search-doc.builder';
import { GeocodingService } from '../../../common/services/geocoding.service';
import { LocationHierarchyService } from '../../../common/services/location-hierarchy.service';
import { MediaService } from '../../../media/media.service';
import { SellConfigService } from '../../../sell/sell-config.service';
import {
  ApiErrorCode,
  ApiErrorException,
  FieldErrors,
  FieldValidationException,
} from '../../../common/errors/api-errors';
import { CreateAdV2Dto, AdCategoryV2 } from '../../dto/create-ad-v2.dto';
import {
  mapToDetailedResponseDto,
  buildTitle,
} from '../../domain/ad.v2.mappers';
import {
  normalizeCreateAdV2,
  validateCreateAdV2,
} from '../../domain/ad.v2.validators';

/** Idempotency record lifetime (contract: EX 900). */
const IDEMPOTENCY_TTL_SEC = 15 * 60;

type LocationHierarchy = {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
};

@Injectable()
export class CreateAdUc {
  private readonly logger = new Logger(CreateAdUc.name);

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
    private readonly locationHierarchyService: LocationHierarchyService,
    private readonly media: MediaService,
    private readonly sellConfig: SellConfigService,
    private readonly legacyCache: LegacyAdsCacheInvalidator,
    private readonly searchDoc: AdSearchDocBuilder,
  ) {}

  async exec(input: {
    dto: CreateAdV2Dto;
    userId: string;
    userType: string;
    idempotencyKey?: string;
  }) {
    const { userId, userType } = input;
    const rawKey = input.idempotencyKey?.trim();

    // 1) Idempotency claim — scoped to the caller, atomic (SET NX), body-bound.
    let idemKey: string | undefined;
    let bodyHash = '';
    if (rawKey) {
      if (!IdempotencyService.isValidKey(rawKey)) {
        throw new ApiErrorException(
          HttpStatus.BAD_REQUEST,
          ApiErrorCode.BAD_REQUEST,
          'Invalid Idempotency-Key header',
        );
      }
      bodyHash = IdempotencyService.hashBody(input.dto);
      const key = `ads:v2:create:${userId}:${rawKey}`;
      const claim = await this.idem.begin<any>(key, bodyHash, IDEMPOTENCY_TTL_SEC);
      if (claim.kind === 'replay') return claim.response;
      if (claim.kind === 'started') idemKey = key;
      // 'unavailable' → Redis down: proceed without idempotency (fail open).
    }

    let committed = false;
    try {
      const response = await this.createOnce(input.dto, userId, userType, () => {
        committed = true;
      });

      if (idemKey) {
        try {
          await this.idem.complete(idemKey, bodyHash, response, IDEMPOTENCY_TTL_SEC);
        } catch (error) {
          this.logger.warn(`Idempotency store failed: ${(error as Error)?.message}`);
        }
      }
      return response;
    } catch (error) {
      if (idemKey && !committed) {
        await this.idem.release(idemKey).catch(() => undefined);
      }
      throw error;
    }
  }

  private async createOnce(
    rawDto: CreateAdV2Dto,
    userId: string,
    userType: string,
    onCommitted: () => void,
  ) {
    // Work on a copy: the idempotency hash was taken over the request as sent.
    const dto = normalizeCreateAdV2(JSON.parse(JSON.stringify(rawDto ?? {})));

    // 2) Commercial auto-detection only fills gaps (bodyType, payload, …).
    const enriched = normalizeCreateAdV2(
      dto?.category === AdCategoryV2.COMMERCIAL_VEHICLE && dto.commercial
        ? await this.intent.applyIfCommercial(dto)
        : dto,
    );

    // 3) All synchronous field rules, reported together.
    const commercialVehicleTypes =
      enriched?.category === AdCategoryV2.COMMERCIAL_VEHICLE
        ? await this.sellConfig.getActiveCommercialTypeNames()
        : new Set<string>();
    const fields: FieldErrors = validateCreateAdV2(enriched, {
      commercialVehicleTypes,
      isAllowedImageUrl: (url) => this.media.isOwnBucketUrl(url),
    });

    // 4) Async checks (only where the sync shape is valid, to avoid noise).
    const data: any = enriched.data ?? {};
    const hasMediaIds = Array.isArray(data.mediaIds) && data.mediaIds.length > 0;
    const asyncChecks: Promise<FieldErrors>[] = [];
    if (!fields['data.mediaIds'] && !fields['data.videoMediaId']) {
      if (hasMediaIds || data.videoMediaId) {
        asyncChecks.push(
          this.media.checkForAd(userId, hasMediaIds ? data.mediaIds : [], data.videoMediaId),
        );
      }
    }
    if (enriched.category !== AdCategoryV2.PROPERTY) {
      const prefix =
        enriched.category === AdCategoryV2.COMMERCIAL_VEHICLE ? 'commercial' : 'vehicle';
      const veh: any =
        prefix === 'commercial' ? enriched.commercial : enriched.vehicle;
      if (veh && typeof veh === 'object') {
        const refs: Record<string, string | undefined> = {};
        for (const k of [
          'manufacturerId',
          'modelId',
          'variantId',
          'transmissionTypeId',
          'fuelTypeId',
        ]) {
          if (!fields[`${prefix}.${k}`] && veh[k]) refs[k] = veh[k];
        }
        asyncChecks.push(this.inventory.findInvalidRefs(prefix, refs));
      }
    }
    for (const extra of await Promise.all(asyncChecks)) {
      for (const [k, v] of Object.entries(extra)) if (!fields[k]) fields[k] = v;
    }
    if (Object.keys(fields).length) {
      throw new FieldValidationException(fields);
    }

    // 5) Location: geocode only fills what is missing. 0 is a valid coordinate.
    const locationHierarchy = await this.resolveLocation(data);

    const title = await buildTitle(enriched, this.inventory);
    // Search document (brand/model/variant words + exact-match keys), built
    // here so a v2 ad is never observable without it. Image count is known
    // before the media attach: it is the number of ids or urls supplied.
    const searchDoc = await this.searchDoc.build(
      {
        category: enriched.category,
        images: hasMediaIds ? data.mediaIds : (data.images ?? []).slice(0, 20),
        location: data.location,
        city: locationHierarchy.city,
        district: locationHierarchy.district,
        state: locationHierarchy.state,
        vehicle: enriched.vehicle ?? null,
        commercial: enriched.commercial ?? null,
        property: enriched.property ?? null,
      },
      userId,
    );
    const geoLocation =
      data.latitude != null && data.longitude != null
        ? {
            type: 'Point' as const,
            coordinates: [data.longitude, data.latitude] as [number, number],
          }
        : undefined;

    // 6) Transaction: Ad + detail + media attach. withTransaction retries
    //    transient errors and never calls abort after a successful commit.
    const session: ClientSession = await this.adRepo.startSession();
    let savedAdId!: Types.ObjectId;
    try {
      await session.withTransaction(async () => {
        const adId = new Types.ObjectId();
        let images: string[] = hasMediaIds ? [] : (data.images ?? []).slice(0, 20);
        let link: string | undefined = data.link;

        if (hasMediaIds || data.videoMediaId) {
          const resolved = await this.media.attachForAd({
            ownerId: userId,
            adId,
            mediaIds: hasMediaIds ? data.mediaIds : [],
            videoMediaId: data.videoMediaId,
            session,
          });
          if (hasMediaIds) images = resolved.imageUrls;
          // The app plays `link` as the ad video (see add_*_form.dart).
          if (resolved.videoUrl) link = resolved.videoUrl;
        }

        const savedAd = await this.adRepo.create(
          {
            _id: adId,
            title,
            description: data.description,
            price: data.price,
            images,
            location: data.location,
            latitude: data.latitude,
            longitude: data.longitude,
            geoLocation,
            city: locationHierarchy.city,
            district: locationHierarchy.district,
            state: locationHierarchy.state,
            country: locationHierarchy.country,
            link,
            postedBy: new Types.ObjectId(userId),
            category: enriched.category as any,
            isActive: true,
            soldOut: false,
            isApproved: false,
            ...searchDocFields(searchDoc),
          },
          { session },
        );

        switch (enriched.category) {
          case AdCategoryV2.PROPERTY:
            await this.propRepo.createFromDto(savedAd._id, enriched.property, { session });
            break;
          case AdCategoryV2.PRIVATE_VEHICLE:
          case AdCategoryV2.TWO_WHEELER:
            await this.vehRepo.createFromDto(savedAd._id, enriched.vehicle, { session });
            break;
          case AdCategoryV2.COMMERCIAL_VEHICLE:
            await this.cvehRepo.createFromDto(savedAd._id, enriched.commercial, { session });
            break;
        }
        savedAdId = savedAd._id;
      });
    } finally {
      await session.endSession();
    }
    onCommitted();

    // 7) Post-commit. Each step is best-effort: a committed ad is never an error.
    const adIdStr = savedAdId.toString();
    try {
      await this.outbox.enqueue('ad.created', {
        adId: adIdStr,
        category: enriched.category,
        userId,
        userType,
      });
    } catch (error) {
      this.logger.warn(`outbox enqueue failed for ${adIdStr}: ${(error as Error)?.message}`);
    }
    try {
      await this.cache.invalidateLists();
    } catch (error) {
      this.logger.warn(`v2 list cache invalidation failed: ${(error as Error)?.message}`);
    }
    try {
      await this.cache.invalidateById(adIdStr);
      await this.cache.del(this.cache.makeKey({ op: 'sellerStats', id: userId }));
    } catch (error) {
      this.logger.warn(`v2 by-id/seller cache invalidation failed: ${(error as Error)?.message}`);
    }
    try {
      await this.legacyCache.invalidateLists();
    } catch (error) {
      this.logger.warn(`v1 cache invalidation failed: ${(error as Error)?.message}`);
    }

    try {
      const detailed = await this.adRepo.aggregateOneByIdDetailed(savedAdId);
      if (detailed) return mapToDetailedResponseDto(detailed);
    } catch (error) {
      this.logger.warn(`response hydrate failed for ${adIdStr}: ${(error as Error)?.message}`);
    }
    // Minimal but contract-complete fallback.
    return {
      id: adIdStr,
      status: 'pending',
      title,
      description: data.description,
      price: data.price,
      category: enriched.category,
      location: data.location,
      isActive: true,
      soldOut: false,
      isApproved: false,
      postedBy: userId,
    };
  }

  private async resolveLocation(data: any): Promise<LocationHierarchy> {
    const hierarchy: LocationHierarchy = {};
    const hasCoords = data.latitude != null && data.longitude != null;
    if (!hasCoords) return hierarchy;

    try {
      const geo = await this.geocodingService.reverseGeocode(
        data.latitude,
        data.longitude,
      );
      if (!data.location && geo?.location) data.location = geo.location;
      hierarchy.city = geo?.city;
      hierarchy.state = geo?.state;
      hierarchy.country = geo?.country;
    } catch {
      if (!data.location) {
        data.location = `${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`;
      }
    }
    try {
      hierarchy.district = this.locationHierarchyService.getLocationFilter(
        data.latitude,
        data.longitude,
      ).district;
    } catch {
      // optional
    }
    return hierarchy;
  }
}
