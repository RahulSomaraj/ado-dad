import { Types } from 'mongoose';
import { CreateAdV2Dto, AdCategoryV2 } from '../dto/create-ad-v2.dto';
import { FieldErrors } from '../../common/errors/api-errors';
import {
  FURNISHING_VALUES,
  LISTING_TYPES,
  MAX_PHOTOS_ANY_CATEGORY,
  PAYLOAD_UNITS,
  PROPERTY_TYPES,
  RESIDENTIAL_PROPERTY_TYPES,
  SellCategory,
  sellLimits,
} from '../../sell/sell.constants';
import { BodyTypeEnum } from '../../ads/schemas/commercial-vehicle-ad.schema';

export interface CreateAdV2ValidationContext {
  /** Active names from the `commercialvehicletypes` collection. */
  commercialVehicleTypes: Set<string> | string[];
  /** Host check for legacy `data.images` URLs (our bucket only). */
  isAllowedImageUrl: (url: string) => boolean;
  now?: Date;
}

const PROPERTY_TYPE_VALUES = new Set(PROPERTY_TYPES.map((p) => p.value));
const BODY_TYPES = new Set<string>(Object.values(BodyTypeEnum));
const MAX_LIST_ITEMS = 30;

const isBlank = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);
const isObjectId = (v: unknown) =>
  typeof v === 'string' && /^[a-f\d]{24}$/i.test(v) && Types.ObjectId.isValid(v);
const isStringList = (v: unknown, max = MAX_LIST_ITEMS) =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 60);

/**
 * Canonicalise a create payload in place before validation and persistence:
 * trims text, fills derived fields, and maps a couple of legacy values.
 * Never invents required data.
 */
export function normalizeCreateAdV2(dto: CreateAdV2Dto): CreateAdV2Dto {
  if (!dto || typeof dto !== 'object') return dto;
  const data: any = dto.data;
  if (data && typeof data === 'object') {
    for (const k of ['title', 'description', 'location', 'link']) {
      if (typeof data[k] === 'string') data[k] = data[k].trim();
    }
    if (data.title === '') delete data.title;
    if (data.location === '') delete data.location;
  }

  const veh: any =
    dto.category === AdCategoryV2.COMMERCIAL_VEHICLE ? dto.commercial : dto.vehicle;
  if (veh && typeof veh === 'object' && dto.category !== AdCategoryV2.PROPERTY) {
    if (typeof veh.color === 'string') veh.color = veh.color.trim();
    if (isBlank(veh.vehicleType)) {
      veh.vehicleType =
        dto.category === AdCategoryV2.TWO_WHEELER ? 'two_wheeler' : 'four_wheeler';
    }
    if (isBlank(veh.variantId)) delete veh.variantId;
    if (isBlank(veh.transmissionTypeId)) delete veh.transmissionTypeId;
    if (isInt(veh.ownerCount)) veh.isFirstOwner = veh.ownerCount === 1;
    if (dto.category === AdCategoryV2.COMMERCIAL_VEHICLE) {
      if (typeof veh.commercialVehicleType === 'string') {
        veh.commercialVehicleType = veh.commercialVehicleType.trim();
      }
      if (veh.payloadUnit === 'ton' || veh.payloadUnit === 'tons') {
        veh.payloadUnit = 'tonne';
      }
    }
  }

  const prop: any = dto.property;
  if (dto.category === AdCategoryV2.PROPERTY && prop && typeof prop === 'object') {
    if (!RESIDENTIAL_PROPERTY_TYPES.has(prop.propertyType)) {
      // Older clients send 0 for plots/shops; 0 means "not applicable".
      if (prop.bedrooms === 0) delete prop.bedrooms;
      if (prop.bathrooms === 0) delete prop.bathrooms;
    }
    if (typeof prop.furnishing === 'string' && prop.isFurnished === undefined) {
      prop.isFurnished = prop.furnishing !== 'unfurnished';
    }
  }
  return dto;
}

/**
 * Server-authoritative create rules (SELL_API_CONTRACT §4). Returns EVERY field
 * error keyed by request path; empty object = valid.
 *
 * Required checks are explicit because the global ValidationPipe runs with
 * `skipMissingProperties: true`. Reference existence (manufacturer, model, …)
 * and media ownership are async and checked by the use case.
 */
export function validateCreateAdV2(
  dto: CreateAdV2Dto,
  ctx: CreateAdV2ValidationContext,
): FieldErrors {
  const e: FieldErrors = {};
  const set = (k: string, msg: string) => {
    if (!e[k]) e[k] = msg;
  };

  const category = dto?.category as unknown as SellCategory;
  const validCategory = Object.values(AdCategoryV2).includes(
    category as unknown as AdCategoryV2,
  );
  if (!validCategory) set('category', 'Choose a category');
  const L = sellLimits(validCategory ? category : 'private_vehicle', ctx.now);

  // ---- common ----
  const d: any = dto?.data && typeof dto.data === 'object' ? dto.data : {};

  if (!isBlank(d.title)) {
    const t = typeof d.title === 'string' ? d.title.trim() : '';
    if (t.length < L.titleMin || t.length > L.titleMax) {
      set('data.title', `Title must be ${L.titleMin} to ${L.titleMax} characters`);
    }
  }

  const desc = typeof d.description === 'string' ? d.description.trim() : '';
  if (desc.length < L.descriptionMin || desc.length > L.descriptionMax) {
    set(
      'data.description',
      desc.length === 0
        ? 'Add a description'
        : `Description must be ${L.descriptionMin} to ${L.descriptionMax} characters`,
    );
  }

  if (!isNum(d.price) || d.price < L.priceMin || d.price > L.priceMax) {
    set('data.price', 'Enter a price above ₹0');
  }

  const hasLat = d.latitude !== undefined && d.latitude !== null;
  const hasLng = d.longitude !== undefined && d.longitude !== null;
  if (hasLat && (!isNum(d.latitude) || d.latitude < -90 || d.latitude > 90)) {
    set('data.latitude', 'Choose a location');
  }
  if (hasLng && (!isNum(d.longitude) || d.longitude < -180 || d.longitude > 180)) {
    set('data.longitude', 'Choose a location');
  }
  if (hasLat !== hasLng) {
    set('data.location', 'Choose a location');
  }
  const hasLabel = typeof d.location === 'string' && d.location.trim().length > 0;
  if (!hasLabel && !(hasLat && hasLng)) {
    set('data.location', 'Choose a location');
  }

  const maxPhotos = Math.min(L.maxPhotos, MAX_PHOTOS_ANY_CATEGORY);
  const hasMediaIds = Array.isArray(d.mediaIds) && d.mediaIds.length > 0;
  if (d.mediaIds !== undefined && d.mediaIds !== null && !Array.isArray(d.mediaIds)) {
    set('data.mediaIds', 'Add at least one photo');
  } else if (hasMediaIds) {
    if (d.mediaIds.length > maxPhotos) {
      set('data.mediaIds', `Add up to ${maxPhotos} photos`);
    } else if (!d.mediaIds.every(isObjectId)) {
      set('data.mediaIds', 'Some photos are no longer available. Remove them and try again');
    } else if (new Set(d.mediaIds).size !== d.mediaIds.length) {
      set('data.mediaIds', 'The same photo was added twice');
    }
  } else if (
    Array.isArray(d.mediaIds) &&
    (!Array.isArray(d.images) || d.images.length === 0)
  ) {
    // An explicit empty mediaIds (new app) with nothing else = no photos.
    // Old clients that omit both keys stay accepted (backward compatible).
    set('data.mediaIds', 'Add at least one photo');
  }
  if (!hasMediaIds && d.images !== undefined && d.images !== null) {
    if (!Array.isArray(d.images)) {
      set('data.images', 'Photos must be uploaded through the app');
    } else if (d.images.length > MAX_PHOTOS_ANY_CATEGORY) {
      set('data.images', `Add up to ${MAX_PHOTOS_ANY_CATEGORY} photos`);
    } else if (!d.images.every((u: unknown) => typeof u === 'string' && ctx.isAllowedImageUrl(u))) {
      set('data.images', 'Photos must be uploaded through the app');
    }
  }
  if (!isBlank(d.videoMediaId) && !isObjectId(d.videoMediaId)) {
    set('data.videoMediaId', 'Video could not be attached. Upload it again');
  }

  // ---- category specific ----
  switch (dto?.category) {
    case AdCategoryV2.PROPERTY:
      validateProperty(dto.property, set);
      break;
    case AdCategoryV2.PRIVATE_VEHICLE:
    case AdCategoryV2.TWO_WHEELER:
      validateVehicle('vehicle', dto.vehicle, dto.category, L, set);
      break;
    case AdCategoryV2.COMMERCIAL_VEHICLE:
      validateVehicle('commercial', dto.commercial, dto.category, L, set);
      validateCommercial(dto.commercial, ctx, set);
      break;
  }
  return e;
}

type Setter = (key: string, msg: string) => void;

function validateVehicle(
  p: 'vehicle' | 'commercial',
  v: any,
  category: AdCategoryV2,
  L: ReturnType<typeof sellLimits>,
  set: Setter,
) {
  if (!v || typeof v !== 'object') {
    set(p, 'Add the vehicle details');
    set(`${p}.manufacturerId`, 'Choose a brand');
    set(`${p}.modelId`, 'Choose a model');
    return;
  }
  // Defaulted from the category by normalizeCreateAdV2 when missing.
  if (!['four_wheeler', 'two_wheeler'].includes(v.vehicleType)) {
    set(`${p}.vehicleType`, 'Choose the vehicle type');
  }
  if (!isObjectId(v.manufacturerId)) set(`${p}.manufacturerId`, 'Choose a brand');
  if (!isObjectId(v.modelId)) set(`${p}.modelId`, 'Choose a model');
  if (!isBlank(v.variantId) && !isObjectId(v.variantId)) {
    set(`${p}.variantId`, 'Choose a valid variant');
  }
  if (!isObjectId(v.fuelTypeId)) set(`${p}.fuelTypeId`, 'Choose a fuel type');
  const transmissionOptional = category === AdCategoryV2.TWO_WHEELER;
  if (isBlank(v.transmissionTypeId)) {
    if (!transmissionOptional) set(`${p}.transmissionTypeId`, 'Choose a transmission');
  } else if (!isObjectId(v.transmissionTypeId)) {
    set(`${p}.transmissionTypeId`, 'Choose a transmission');
  }
  if (!isInt(v.year) || v.year < L.yearMin || v.year > L.yearMax) {
    set(`${p}.year`, `Choose a year between ${L.yearMin} and ${L.yearMax}`);
  }
  if (!isNum(v.mileage) || v.mileage < 0 || v.mileage > L.mileageMax) {
    set(`${p}.mileage`, 'Enter kilometres driven (0 or more)');
  }
  if (typeof v.color !== 'string' || v.color.trim().length === 0 || v.color.length > 40) {
    set(`${p}.color`, 'Choose a colour');
  }
  if (v.ownerCount !== undefined && v.ownerCount !== null) {
    if (!isInt(v.ownerCount) || v.ownerCount < 1 || v.ownerCount > 10) {
      set(`${p}.ownerCount`, 'Owners must be between 1 and 10');
    }
  }
  if (v.additionalFeatures !== undefined && v.additionalFeatures !== null) {
    if (!isStringList(v.additionalFeatures)) {
      set(`${p}.additionalFeatures`, 'Choose features from the list');
    }
  }
}

function validateCommercial(
  c: any,
  ctx: CreateAdV2ValidationContext,
  set: Setter,
) {
  if (!c || typeof c !== 'object') {
    set('commercial.commercialVehicleType', 'Choose a vehicle type');
    return;
  }
  const names =
    ctx.commercialVehicleTypes instanceof Set
      ? ctx.commercialVehicleTypes
      : new Set(ctx.commercialVehicleTypes);
  if (
    typeof c.commercialVehicleType !== 'string' ||
    !names.has(c.commercialVehicleType)
  ) {
    set('commercial.commercialVehicleType', 'Choose a vehicle type');
  }
  if (!isBlank(c.bodyType) && !BODY_TYPES.has(c.bodyType)) {
    set('commercial.bodyType', 'Choose a valid body type');
  }
  if (c.payloadCapacity !== undefined && c.payloadCapacity !== null) {
    if (!isNum(c.payloadCapacity) || c.payloadCapacity < 0 || c.payloadCapacity > 1_000_000) {
      set('commercial.payloadCapacity', 'Enter a valid payload');
    }
  }
  if (!isBlank(c.payloadUnit) && !(PAYLOAD_UNITS as readonly string[]).includes(c.payloadUnit)) {
    set('commercial.payloadUnit', 'Choose kg or tonne');
  }
  if (c.axleCount !== undefined && c.axleCount !== null) {
    if (!isInt(c.axleCount) || c.axleCount < 1 || c.axleCount > 10) {
      set('commercial.axleCount', 'Axles must be between 1 and 10');
    }
  }
  if (c.seatingCapacity !== undefined && c.seatingCapacity !== null) {
    if (!isInt(c.seatingCapacity) || c.seatingCapacity < 1 || c.seatingCapacity > 100) {
      set('commercial.seatingCapacity', 'Enter valid seating capacity');
    }
  }
}

function validateProperty(p: any, set: Setter) {
  if (!p || typeof p !== 'object') {
    set('property', 'Add the property details');
    set('property.propertyType', 'Choose a property type');
    set('property.areaSqft', 'Enter the built-up area');
    return;
  }
  if (!PROPERTY_TYPE_VALUES.has(p.propertyType)) {
    set('property.propertyType', 'Choose a property type');
  }
  if (!isBlank(p.listingType) && !(LISTING_TYPES as readonly string[]).includes(p.listingType)) {
    set('property.listingType', 'Choose sell or rent');
  }

  const residential = RESIDENTIAL_PROPERTY_TYPES.has(p.propertyType);
  for (const [k, label] of [
    ['bedrooms', 'bedrooms'],
    ['bathrooms', 'bathrooms'],
  ] as const) {
    const v = p[k];
    const present = v !== undefined && v !== null;
    if (residential) {
      if (!present || !isInt(v) || v < 0 || v > 50) {
        set(`property.${k}`, `Enter the number of ${label}`);
      }
    } else if (present && PROPERTY_TYPE_VALUES.has(p.propertyType)) {
      const typeLabel =
        PROPERTY_TYPES.find((t) => t.value === p.propertyType)?.label.toLowerCase() ??
        'this property';
      set(`property.${k}`, `${label.charAt(0).toUpperCase()}${label.slice(1)} don't apply to a ${typeLabel}`);
    }
  }

  if (!isNum(p.areaSqft) || p.areaSqft <= 0 || p.areaSqft > 100_000_000) {
    set('property.areaSqft', 'Enter the built-up area');
  }
  if (p.landAreaSqft !== undefined && p.landAreaSqft !== null) {
    if (!isNum(p.landAreaSqft) || p.landAreaSqft <= 0 || p.landAreaSqft > 1_000_000_000) {
      set('property.landAreaSqft', 'Enter a valid land area');
    }
  }
  if (p.floor !== undefined && p.floor !== null) {
    if (!isInt(p.floor) || p.floor < 0 || p.floor > 200) {
      set('property.floor', 'Enter a valid floor');
    }
  }
  if (!isBlank(p.furnishing) && !(FURNISHING_VALUES as readonly string[]).includes(p.furnishing)) {
    set('property.furnishing', 'Choose furnishing');
  }
  if (p.amenities !== undefined && p.amenities !== null && !isStringList(p.amenities)) {
    set('property.amenities', 'Choose amenities from the list');
  }
}
