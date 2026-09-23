import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SearchKey } from '../planner/search-plan';
import { normalizePhrase, slugify } from './text-normalizer';
import { MANUFACTURER_ALIASES } from './inventory-lexicon.materializer';

/**
 * The denormalised search document written onto every ad (audit §C.5).
 *
 * Why it exists: an `Ad` only holds `title` and `description`; the brand,
 * model, variant, fuel and transmission live in `vehicleads` /
 * `commercialvehicleads` as ObjectIds. Nothing text-searchable ever mentioned
 * the brand, and every structured filter needed a `$lookup` before pagination.
 * With these fields on the ad itself, both adapters serve brand/model searches
 * from the `ads` collection by index.
 *
 * Bump SEARCH_DOC_VERSION whenever the composition changes; the backfill
 * rewrites every ad whose `searchDocVersion` is lower.
 */
export const SEARCH_DOC_VERSION = 1;

export interface SearchDoc {
  searchText: string;
  searchKeys: string[];
  vehicleYear?: number;
  bedrooms?: number;
  areaSqft?: number;
  imageCount: number;
  sellerVerified: boolean;
  searchDocVersion: number;
  searchDocBuiltAt: Date;
}

/** What the builder needs to know about an ad. Every field optional but `category`. */
export interface SearchDocInput {
  category: string;
  /** Only the count matters: urls, media ids or entries all work. */
  images?: unknown[] | null;
  location?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  vehicle?: VehicleLike | null;
  commercial?: (VehicleLike & { commercialVehicleType?: string | null; bodyType?: string | null }) | null;
  property?: PropertyLike | null;
}

export interface VehicleLike {
  manufacturerId?: Types.ObjectId | string | null;
  modelId?: Types.ObjectId | string | null;
  variantId?: Types.ObjectId | string | null;
  fuelTypeId?: Types.ObjectId | string | null;
  transmissionTypeId?: Types.ObjectId | string | null;
  year?: number | null;
  color?: string | null;
}

export interface PropertyLike {
  propertyType?: string | null;
  listingType?: string | null;
  bedrooms?: number | null;
  areaSqft?: number | null;
  isFurnished?: boolean | null;
  hasParking?: boolean | null;
}

export interface NamedRef {
  name?: string;
  displayName?: string;
}

/** Resolved catalogue names, keyed by id string. */
export interface InventoryNames {
  manufacturers: Map<string, NamedRef>;
  models: Map<string, NamedRef>;
  variants: Map<string, NamedRef>;
  fuelTypes: Map<string, NamedRef>;
  transmissions: Map<string, NamedRef>;
}

export function emptyInventoryNames(): InventoryNames {
  return {
    manufacturers: new Map(),
    models: new Map(),
    variants: new Map(),
    fuelTypes: new Map(),
    transmissions: new Map(),
  };
}

const idStr = (v: Types.ObjectId | string | null | undefined): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : String(v);

/**
 * Pure composition: input + resolved names → search document. No I/O, so the
 * backfill, the use cases and the tests all produce byte-identical documents.
 */
export function composeSearchDoc(
  input: SearchDocInput,
  names: InventoryNames,
  opts: { sellerVerified?: boolean; now?: Date } = {},
): SearchDoc {
  const words: string[] = [];
  const keys: string[] = [SearchKey.category(input.category)];
  const addWords = (...values: (string | number | null | undefined)[]) => {
    for (const v of values) {
      if (v === null || v === undefined || v === '') continue;
      const n = normalizePhrase(String(v));
      if (n) words.push(n);
    }
  };
  const addNamed = (ref: NamedRef | undefined) => {
    if (!ref) return;
    addWords(ref.name, ref.displayName);
  };

  let vehicleYear: number | undefined;
  let bedrooms: number | undefined;
  let areaSqft: number | undefined;

  const veh = input.commercial ?? input.vehicle;
  if (veh) {
    const mfrId = idStr(veh.manufacturerId);
    const modelId = idStr(veh.modelId);
    const variantId = idStr(veh.variantId);
    const fuelId = idStr(veh.fuelTypeId);
    const txId = idStr(veh.transmissionTypeId);

    if (mfrId) {
      keys.push(SearchKey.manufacturer(mfrId));
      const m = names.manufacturers.get(mfrId);
      addNamed(m);
      // Every spelling the lexicon knows for this brand ("tata" for Tata
      // Motors), so the text clause matches what people actually type.
      for (const n of [m?.name, m?.displayName]) {
        if (!n) continue;
        for (const alias of MANUFACTURER_ALIASES[normalizePhrase(n)] ?? []) addWords(alias);
      }
    }
    if (modelId) {
      keys.push(SearchKey.model(modelId));
      addNamed(names.models.get(modelId));
    }
    if (variantId) {
      keys.push(SearchKey.variant(variantId));
      addNamed(names.variants.get(variantId));
    }
    if (fuelId) {
      keys.push(SearchKey.fuel(fuelId));
      addNamed(names.fuelTypes.get(fuelId));
    }
    if (txId) {
      keys.push(SearchKey.transmission(txId));
      addNamed(names.transmissions.get(txId));
    }
    if (typeof veh.year === 'number' && Number.isFinite(veh.year)) {
      vehicleYear = veh.year;
      addWords(veh.year);
    }
    addWords(veh.color);
  }
  if (input.commercial) {
    const cvt = input.commercial.commercialVehicleType;
    if (cvt) {
      keys.push(SearchKey.commercialVehicleType(cvt));
      addWords(cvt.replace(/_/g, ' '));
    }
    if (input.commercial.bodyType) addWords(input.commercial.bodyType);
  }

  const prop = input.property;
  if (prop) {
    if (prop.propertyType) {
      keys.push(SearchKey.propertyType(prop.propertyType));
      addWords(prop.propertyType.replace(/_/g, ' '));
    }
    if (prop.listingType) {
      keys.push(SearchKey.listingType(prop.listingType));
      addWords(prop.listingType === 'rent' ? 'rent for rent' : 'sale for sale');
    }
    if (typeof prop.bedrooms === 'number' && prop.bedrooms > 0) {
      bedrooms = prop.bedrooms;
      addWords(`${prop.bedrooms}bhk`, `${prop.bedrooms} bhk`);
    }
    if (typeof prop.areaSqft === 'number' && Number.isFinite(prop.areaSqft)) {
      areaSqft = prop.areaSqft;
    }
    if (prop.isFurnished) {
      keys.push(SearchKey.furnished());
      addWords('furnished');
    }
    if (prop.hasParking) {
      keys.push(SearchKey.parking());
      addWords('parking');
    }
  }

  // Place words: the ad's own city/district/state plus its free-text location.
  addWords(input.city, input.district, input.state, input.location);
  if (input.district) keys.push(SearchKey.district(slugify(input.district)));

  // Dedupe tokens, keep first-seen order (stable, so the doc is deterministic).
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const w of words.join(' ').split(' ')) {
    if (!w || seen.has(w)) continue;
    seen.add(w);
    tokens.push(w);
  }

  return {
    searchText: tokens.join(' '),
    searchKeys: [...new Set(keys)],
    vehicleYear,
    bedrooms,
    areaSqft,
    imageCount: Array.isArray(input.images) ? input.images.length : 0,
    sellerVerified: !!opts.sellerVerified,
    searchDocVersion: SEARCH_DOC_VERSION,
    searchDocBuiltAt: opts.now ?? new Date(),
  };
}

/** Plain fields for an insert (undefined numbers left out). */
export function searchDocFields(doc: SearchDoc): Record<string, any> {
  const out: Record<string, any> = {
    searchText: doc.searchText,
    searchKeys: doc.searchKeys,
    imageCount: doc.imageCount,
    sellerVerified: doc.sellerVerified,
    searchDocVersion: doc.searchDocVersion,
    searchDocBuiltAt: doc.searchDocBuiltAt,
  };
  for (const k of ['vehicleYear', 'bedrooms', 'areaSqft'] as const) {
    if (doc[k] !== undefined) out[k] = doc[k];
  }
  return out;
}

/** `$set` / `$unset` shape for a Mongo update from a SearchDoc. */
export function searchDocToUpdate(doc: SearchDoc): { $set: Record<string, any>; $unset: Record<string, ''> } {
  const $set: Record<string, any> = {
    searchText: doc.searchText,
    searchKeys: doc.searchKeys,
    imageCount: doc.imageCount,
    sellerVerified: doc.sellerVerified,
    searchDocVersion: doc.searchDocVersion,
    searchDocBuiltAt: doc.searchDocBuiltAt,
  };
  const $unset: Record<string, ''> = {};
  for (const k of ['vehicleYear', 'bedrooms', 'areaSqft'] as const) {
    if (doc[k] === undefined) $unset[k] = '';
    else $set[k] = doc[k];
  }
  return { $set, $unset };
}

/**
 * Resolves catalogue names for the builder. Talks to the inventory collections
 * directly (lean, batched) so it can be used from SearchModule without
 * importing AdsV2Module's gateway — which would be a circular import.
 */
@Injectable()
export class AdSearchDocBuilder {
  constructor(
    @InjectModel('Manufacturer') private readonly manufacturerModel: Model<any>,
    @InjectModel('VehicleModel') private readonly vehicleModelModel: Model<any>,
    @InjectModel('VehicleVariant') private readonly variantModel: Model<any>,
    @InjectModel('FuelType') private readonly fuelTypeModel: Model<any>,
    @InjectModel('TransmissionType') private readonly transmissionModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
  ) {}

  /** Resolve every name referenced by the given inputs in five batched queries. */
  async resolveNames(inputs: SearchDocInput[]): Promise<InventoryNames> {
    const want = {
      manufacturers: new Set<string>(),
      models: new Set<string>(),
      variants: new Set<string>(),
      fuelTypes: new Set<string>(),
      transmissions: new Set<string>(),
    };
    for (const input of inputs) {
      const veh = input.commercial ?? input.vehicle;
      if (!veh) continue;
      const add = (set: Set<string>, v: any) => {
        const s = idStr(v);
        if (s && Types.ObjectId.isValid(s)) set.add(s);
      };
      add(want.manufacturers, veh.manufacturerId);
      add(want.models, veh.modelId);
      add(want.variants, veh.variantId);
      add(want.fuelTypes, veh.fuelTypeId);
      add(want.transmissions, veh.transmissionTypeId);
    }

    const load = async (model: Model<any>, ids: Set<string>): Promise<Map<string, NamedRef>> => {
      const out = new Map<string, NamedRef>();
      if (ids.size === 0) return out;
      const docs = await model
        .find({ _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } })
        .select('_id name displayName')
        .lean()
        .exec();
      for (const d of docs as any[]) out.set(String(d._id), { name: d.name, displayName: d.displayName });
      return out;
    };

    const [manufacturers, models, variants, fuelTypes, transmissions] = await Promise.all([
      load(this.manufacturerModel, want.manufacturers),
      load(this.vehicleModelModel, want.models),
      load(this.variantModel, want.variants),
      load(this.fuelTypeModel, want.fuelTypes),
      load(this.transmissionModel, want.transmissions),
    ]);
    return { manufacturers, models, variants, fuelTypes, transmissions };
  }

  /** Verified flag per seller id, one query. */
  async resolveSellers(userIds: (Types.ObjectId | string | null | undefined)[]): Promise<Map<string, boolean>> {
    const ids = [...new Set(userIds.map(idStr).filter((s): s is string => !!s && Types.ObjectId.isValid(s)))];
    const out = new Map<string, boolean>();
    if (ids.length === 0) return out;
    const docs = await this.userModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .select('_id isVerified')
      .lean()
      .exec();
    for (const d of docs as any[]) out.set(String(d._id), !!d.isVerified);
    return out;
  }

  /** One ad, names and seller resolved. Used by the v2 create/update use cases. */
  async build(input: SearchDocInput, postedBy?: Types.ObjectId | string | null): Promise<SearchDoc> {
    const [names, sellers] = await Promise.all([
      this.resolveNames([input]),
      this.resolveSellers([postedBy]),
    ]);
    const sellerId = idStr(postedBy);
    return composeSearchDoc(input, names, {
      sellerVerified: sellerId ? sellers.get(sellerId) ?? false : false,
    });
  }
}
