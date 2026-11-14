import { Injectable, Logger } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { PropertyAdRepository } from '../../infrastructure/repos/property-ad.repo';
import { VehicleAdRepository } from '../../infrastructure/repos/vehicle-ad.repo';
import { CommercialVehicleAdRepository } from '../../infrastructure/repos/commercial-vehicle-ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { CommercialIntentService } from '../../infrastructure/services/commercial-intent.service';
import { LegacyAdsCacheInvalidator } from '../../infrastructure/services/legacy-ads-cache.invalidator';
import { GeocodingService } from '../../../common/services/geocoding.service';
import { LocationHierarchyService } from '../../../common/services/location-hierarchy.service';
import { MediaService } from '../../../media/media.service';
import { SellConfigService } from '../../../sell/sell-config.service';
import { appendPriceHistory } from '../../../ads/services/ads.service';
import {
  FieldErrors,
  FieldValidationException,
} from '../../../common/errors/api-errors';
import { MAX_PHOTOS_ANY_CATEGORY, sellLimits } from '../../../sell/sell.constants';
import { AdCategoryV2 } from '../../dto/create-ad-v2.dto';
import { UpdateAdV2Dto } from '../../dto/update-ad-v2.dto';
import { buildTitle, mapToDetailedResponseDto } from '../../domain/ad.v2.mappers';
import {
  normalizeCreateAdV2,
  validateCreateAdV2,
} from '../../domain/ad.v2.validators';
import { loadEditableAd } from './get-ad-for-edit.uc';
import { AdSearchDocBuilder, searchDocToUpdate } from '../../../search/services/ad-search-doc.builder';

const FIELD_MEDIA = 'data.media';
const isObjectId = (v: unknown) =>
  typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

type MediaEntry = { mediaId: string } | { url: string };

/**
 * PATCH /v2/ads/:id — full replace of the editable fields of an ad the caller
 * owns (or any ad, for SA). Status and approval are deliberately untouched
 * (open decision: should edits re-enter moderation?).
 */
@Injectable()
export class UpdateAdUc {
  private readonly logger = new Logger(UpdateAdUc.name);

  constructor(
    private readonly adRepo: AdRepository,
    private readonly propRepo: PropertyAdRepository,
    private readonly vehRepo: VehicleAdRepository,
    private readonly cvehRepo: CommercialVehicleAdRepository,
    private readonly inventory: VehicleInventoryGateway,
    private readonly cache: AdsCache,
    private readonly intent: CommercialIntentService,
    private readonly geocodingService: GeocodingService,
    private readonly locationHierarchyService: LocationHierarchyService,
    private readonly media: MediaService,
    private readonly sellConfig: SellConfigService,
    private readonly legacyCache: LegacyAdsCacheInvalidator,
    private readonly searchDoc: AdSearchDocBuilder,
  ) {}

  async exec(input: {
    adId: string;
    dto: UpdateAdV2Dto;
    userId: string;
    userType?: string;
  }) {
    const { userId } = input;
    const ad = await loadEditableAd(this.adRepo, input.adId, userId, input.userType);
    const adId: Types.ObjectId = ad._id;
    const currentImages: string[] = Array.isArray(ad.images) ? ad.images : [];
    const currentLink: string | undefined = ad.link || undefined;

    // ---- 1) Normalise + the create rules against the new body ----
    const dto: any = normalizeCreateAdV2(JSON.parse(JSON.stringify(input.dto ?? {})));
    const fields: FieldErrors = {};
    if (dto.category !== ad.category) {
      fields.category = "Category can't be changed. Post a new ad instead";
    }
    const enriched: any = normalizeCreateAdV2(
      dto.category === AdCategoryV2.COMMERCIAL_VEHICLE && dto.commercial
        ? await this.intent.applyIfCommercial(dto)
        : dto,
    );
    const data: any = enriched.data && typeof enriched.data === 'object' ? enriched.data : {};

    // Photos come from data.media here; run the shared rules without the
    // create-only photo keys so they don't report on fields the client didn't send.
    const forRules = { ...enriched, data: { ...data } };
    delete forRules.data.mediaIds;
    delete forRules.data.images;
    const commercialVehicleTypes =
      enriched.category === AdCategoryV2.COMMERCIAL_VEHICLE
        ? await this.sellConfig.getActiveCommercialTypeNames()
        : new Set<string>();
    const ruleErrors = validateCreateAdV2(forRules, {
      commercialVehicleTypes,
      isAllowedImageUrl: () => true,
    });
    for (const [k, v] of Object.entries(ruleErrors)) {
      if (k === 'data.mediaIds' || k === 'data.images') continue;
      if (k === 'category' && fields.category) continue;
      fields[k] = v;
    }

    // ---- 2) Media entries ----
    const entries = this.parseMedia(
      data.media,
      currentImages,
      ad.category as AdCategoryV2,
      fields,
    );
    const newMediaIds = entries
      .filter((e): e is { mediaId: string } => 'mediaId' in e)
      .map((e) => e.mediaId);

    // ---- 3) Video ----
    const removeVideo = data.removeVideo === true;
    const videoMediaId: string | undefined =
      typeof data.videoMediaId === 'string' && data.videoMediaId ? data.videoMediaId : undefined;
    if (removeVideo && videoMediaId) {
      fields['data.removeVideo'] = 'Choose either a new video or removing the video';
    }
    if (
      !removeVideo &&
      !videoMediaId &&
      data.videoUrl !== undefined &&
      data.videoUrl !== null &&
      data.videoUrl !== currentLink
    ) {
      fields['data.videoUrl'] = 'Video is no longer available. Upload it again';
    }

    // ---- 4) Async checks ----
    const checks: Promise<FieldErrors>[] = [];
    if (!fields[FIELD_MEDIA] && !fields['data.videoMediaId'] && (newMediaIds.length || videoMediaId)) {
      checks.push(
        this.media
          .checkForAd(userId, newMediaIds, videoMediaId)
          .then((e) => this.remapMediaErrors(e)),
      );
    }
    if (enriched.category !== AdCategoryV2.PROPERTY && enriched.category === ad.category) {
      const prefix =
        enriched.category === AdCategoryV2.COMMERCIAL_VEHICLE ? 'commercial' : 'vehicle';
      const veh: any = enriched[prefix];
      if (veh && typeof veh === 'object') {
        const refs: Record<string, string | undefined> = {};
        for (const k of ['manufacturerId', 'modelId', 'variantId', 'transmissionTypeId', 'fuelTypeId']) {
          if (!fields[`${prefix}.${k}`] && veh[k]) refs[k] = veh[k];
        }
        checks.push(this.inventory.findInvalidRefs(prefix, refs));
      }
    }
    for (const extra of await Promise.all(checks)) {
      for (const [k, v] of Object.entries(extra)) if (!fields[k]) fields[k] = v;
    }
    if (Object.keys(fields).length) throw new FieldValidationException(fields);

    // ---- 5) Derived values ----
    const hierarchy = await this.resolveLocation(data);
    const title = await buildTitle(enriched, this.inventory);
    const hasCoords = data.latitude != null && data.longitude != null;
    const priceChanged = Number(ad.price) !== Number(data.price);
    const searchDoc = await this.searchDoc.build(
      {
        category: ad.category,
        images: entries,
        location: data.location,
        city: hierarchy.city,
        district: hierarchy.district,
        state: hierarchy.state,
        vehicle: enriched.vehicle ?? null,
        commercial: enriched.commercial ?? null,
        property: enriched.property ?? null,
      },
      ad.postedBy,
    );
    const searchUpdate = searchDocToUpdate(searchDoc);

    // ---- 6) Transaction ----
    let orphanKeys: string[] = [];
    const session: ClientSession = await this.adRepo.startSession();
    try {
      await session.withTransaction(async () => {
        const attached = await this.attachRemapped({
          ownerId: userId,
          adId,
          mediaIds: newMediaIds,
          videoMediaId,
          session,
        });
        let next = 0;
        const images = entries.map((e) =>
          'url' in e ? e.url : attached.imageUrls[next++],
        );
        const link = removeVideo
          ? undefined
          : videoMediaId
            ? attached.videoUrl
            : currentLink;

        orphanKeys = await this.media.orphanForAd({
          adId,
          keepUrls: [...images, ...(link ? [link] : [])],
          session,
        });

        const $set: Record<string, any> = {
          title,
          description: data.description,
          price: data.price,
          images,
        };
        const $unset: Record<string, ''> = {};
        const setOrUnset = (k: string, v: unknown) => {
          if (v === undefined || v === null || v === '') $unset[k] = '';
          else $set[k] = v;
        };
        setOrUnset('location', data.location);
        setOrUnset('latitude', hasCoords ? data.latitude : undefined);
        setOrUnset('longitude', hasCoords ? data.longitude : undefined);
        setOrUnset(
          'geoLocation',
          hasCoords ? { type: 'Point', coordinates: [data.longitude, data.latitude] } : undefined,
        );
        setOrUnset('city', hierarchy.city);
        setOrUnset('district', hierarchy.district);
        setOrUnset('state', hierarchy.state);
        setOrUnset('country', hierarchy.country);
        setOrUnset('link', link);
        if (priceChanged) {
          $set.priceHistory = appendPriceHistory(ad.priceHistory, ad.price);
        }

        Object.assign($set, searchUpdate.$set);
        Object.assign($unset, searchUpdate.$unset);
        const update: Record<string, any> = { $set };
        if (Object.keys($unset).length) update.$unset = $unset;
        await this.adRepo.updateOne({ _id: adId, isDeleted: { $ne: true } }, update, { session });

        await this.replaceDetail(ad.category as AdCategoryV2, adId, enriched, session);
      });
    } finally {
      await session.endSession();
    }

    // ---- 7) Post-commit, best-effort ----
    const adIdStr = String(adId);
    if (orphanKeys.length) {
      await this.media.deleteObjectsBestEffort(orphanKeys);
    }
    for (const [label, step] of [
      ['v2 byId', () => this.cache.invalidateById(adIdStr)],
      ['v2 lists', () => this.cache.invalidateLists()],
      ['v1 byId', () => this.legacyCache.invalidateById(adIdStr)],
      ['v1 lists', () => this.legacyCache.invalidateLists()],
    ] as [string, () => Promise<void>][]) {
      try {
        await step();
      } catch (error) {
        this.logger.warn(`${label} cache invalidation failed: ${(error as Error)?.message}`);
      }
    }

    try {
      const detailed = await this.adRepo.aggregateOneByIdDetailed(adId);
      if (detailed) return mapToDetailedResponseDto(detailed);
    } catch (error) {
      this.logger.warn(`response hydrate failed for ${adIdStr}: ${(error as Error)?.message}`);
    }
    return {
      id: adIdStr,
      status: ad.status ?? 'pending',
      title,
      description: data.description,
      price: data.price,
      category: ad.category,
      location: data.location,
      isActive: ad.isActive,
      soldOut: ad.soldOut,
      isApproved: ad.isApproved,
      postedBy: String(ad.postedBy),
    };
  }

  /** Validates `data.media` into typed entries; records a single `data.media` error. */
  private parseMedia(
    raw: unknown,
    currentImages: string[],
    category: AdCategoryV2,
    fields: FieldErrors,
  ): MediaEntry[] {
    const max = Math.min(sellLimits(category as any).maxPhotos, MAX_PHOTOS_ANY_CATEGORY);
    if (!Array.isArray(raw) || raw.length === 0) {
      fields[FIELD_MEDIA] = 'Add at least one photo';
      return [];
    }
    if (raw.length > max) {
      fields[FIELD_MEDIA] = `Add up to ${max} photos`;
      return [];
    }
    const current = new Set(currentImages);
    const seen = new Set<string>();
    const entries: MediaEntry[] = [];
    for (const e of raw as any[]) {
      const hasId = e && typeof e === 'object' && e.mediaId !== undefined;
      const hasUrl = e && typeof e === 'object' && e.url !== undefined;
      let entry: MediaEntry | undefined;
      if (hasId && !hasUrl && isObjectId(e.mediaId)) entry = { mediaId: e.mediaId };
      else if (hasUrl && !hasId && typeof e.url === 'string' && current.has(e.url)) {
        entry = { url: e.url };
      }
      const dedupe = entry ? ('url' in entry ? `u:${entry.url}` : `m:${entry.mediaId}`) : '';
      if (!entry || seen.has(dedupe)) {
        fields[FIELD_MEDIA] = entry
          ? 'The same photo was added twice'
          : 'Some photos are no longer available. Remove them and try again';
        return [];
      }
      seen.add(dedupe);
      entries.push(entry);
    }
    return entries;
  }

  private remapMediaErrors(errors: FieldErrors): FieldErrors {
    const out: FieldErrors = {};
    for (const [k, v] of Object.entries(errors)) {
      out[k === 'data.mediaIds' ? FIELD_MEDIA : k] = v;
    }
    return out;
  }

  private async attachRemapped(params: Parameters<MediaService['attachForAd']>[0]) {
    try {
      return await this.media.attachForAd(params);
    } catch (error) {
      if (error instanceof FieldValidationException) {
        throw new FieldValidationException(this.remapMediaErrors(error.fields));
      }
      throw error;
    }
  }

  private async replaceDetail(
    category: AdCategoryV2,
    adId: Types.ObjectId,
    dto: any,
    session: ClientSession,
  ) {
    const oid = (v: unknown) => (v ? new Types.ObjectId(String(v)) : undefined);
    let repo: { updateByAdId: Function; createFromDto: Function };
    let src: any;
    let doc: Record<string, unknown>;

    if (category === AdCategoryV2.PROPERTY) {
      repo = this.propRepo;
      src = dto.property;
      doc = {
        propertyType: src.propertyType,
        listingType: src.listingType,
        bedrooms: src.bedrooms,
        bathrooms: src.bathrooms,
        areaSqft: src.areaSqft,
        landAreaSqft: src.landAreaSqft,
        floor: src.floor,
        furnishing: src.furnishing,
        isFurnished: !!src.isFurnished,
        hasParking: !!src.hasParking,
        hasGarden: !!src.hasGarden,
        amenities: src.amenities ?? [],
      };
    } else {
      const commercial = category === AdCategoryV2.COMMERCIAL_VEHICLE;
      repo = commercial ? this.cvehRepo : this.vehRepo;
      src = commercial ? dto.commercial : dto.vehicle;
      doc = {
        vehicleType: src.vehicleType,
        manufacturerId: oid(src.manufacturerId),
        modelId: oid(src.modelId),
        variantId: oid(src.variantId),
        year: src.year,
        mileage: src.mileage,
        transmissionTypeId: oid(src.transmissionTypeId),
        fuelTypeId: oid(src.fuelTypeId),
        color: src.color,
        ownerCount: src.ownerCount,
        isFirstOwner: !!src.isFirstOwner,
        hasInsurance: !!src.hasInsurance,
        additionalFeatures: src.additionalFeatures ?? [],
      };
      if (commercial) {
        Object.assign(doc, {
          commercialVehicleType: src.commercialVehicleType,
          bodyType: src.bodyType,
          payloadCapacity: src.payloadCapacity,
          payloadUnit: src.payloadUnit,
          axleCount: src.axleCount,
          seatingCapacity: src.seatingCapacity,
          hasFitness: !!src.hasFitness,
          hasPermit: !!src.hasPermit,
        });
      } else {
        doc.hasRcBook = !!src.hasRcBook;
      }
    }

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ''> = {};
    for (const [k, v] of Object.entries(doc)) {
      if (v === undefined || v === null || v === '') $unset[k] = '';
      else $set[k] = v;
    }
    const update: Record<string, unknown> = { $set };
    if (Object.keys($unset).length) update.$unset = $unset;

    const updated = await repo.updateByAdId(adId, update, { session });
    if (!updated) {
      // Legacy ad without a detail document: create it.
      await repo.createFromDto(adId, src, { session });
    }
  }

  private async resolveLocation(data: any) {
    const hierarchy: { city?: string; district?: string; state?: string; country?: string } = {};
    if (data.latitude == null || data.longitude == null) return hierarchy;
    try {
      const geo = await this.geocodingService.reverseGeocode(data.latitude, data.longitude);
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
