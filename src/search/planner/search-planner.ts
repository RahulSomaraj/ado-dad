import { ParsedQuery } from '../dto/parsed-query';
import { DEFAULT_SCORING, ScoringConfig } from '../scoring/scoring.config';
import {
  Boosts,
  CandidateClauses,
  Conflict,
  GeoCircle,
  GeoPoint,
  HardFilters,
  KeyBoost,
  LegacyFilters,
  PageSpec,
  PlanStep,
  SearchKey,
  SearchPlan,
  SearchStrategy,
  SortSpec,
} from './search-plan';

/**
 * The list request as the planner sees it. Structurally identical to
 * ListAdsV2Dto so the use case can pass the DTO straight in; kept as an
 * interface so this module stays free of Nest/class-validator imports and can
 * be unit-tested as a pure function.
 */
export interface SearchRequest {
  category?: string;
  search?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  minPrice?: number;
  maxPrice?: number;
  commercialVehicleTypes?: string[];
  fuelTypeIds?: string[];
  transmissionTypeIds?: string[];
  manufacturerIds?: string[];
  modelIds?: string[];
  minYear?: number;
  maxYear?: number;
  propertyTypes?: string[];
  listingType?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  isFurnished?: boolean;
  hasParking?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
  includeTotal?: boolean;
}

export interface PlannerOptions {
  /**
   * When true, explicit client filters (brand, model, fuel, transmission,
   * year, property type, listing) are expressed as `searchKeys` groups on the
   * ad document. When false they stay on the legacy $lookup path. Flip only
   * after `search:validate` reports 100 % of ads carry a search document.
   */
  keysFilters: boolean;
  scoring?: ScoringConfig;
  /** Radius for a typed place with no `radiusKmHint` in the gazetteer. */
  defaultPlaceRadiusKm?: number;
  /** Page-1 spare rows for seller diversity. */
  spareRows?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * DTO + ParsedQuery → SearchPlan. Pure: no I/O, no clock, no randomness.
 *
 * Precedence, top to bottom:
 *   explicit client filters  >  parsed entities/category  >  text  >  boosts
 *
 * Parsed ENTITIES constrain (as candidate clauses with the category they imply);
 * parsed ATTRIBUTES rank. Recognised words are never removed from the text
 * clause. The only relaxation is dropping a parsed (never explicit) category,
 * and it runs only when the first step returns nothing.
 */
export class SearchPlanner {
  plan(req: SearchRequest, parsed: ParsedQuery | undefined, opts: PlannerOptions): SearchPlan {
    const cfg = opts.scoring ?? DEFAULT_SCORING;
    const original = (req.search ?? '').trim();

    if (!original) {
      // No search string: the feed path in list-ads.uc.ts handles it unchanged.
      return {
        strategy: 'feed',
        steps: [],
        scoring: { config: cfg },
        sort: this.sort(req),
        page: this.page(req, cfg, opts),
        conflicts: [],
        original,
        parsed,
      };
    }

    const conflicts: Conflict[] = [];
    const explicitBrandOrModel = !!(req.manufacturerIds?.length || req.modelIds?.length);

    // ---- category -----------------------------------------------------------
    let categories: string[] | undefined;
    let categoryExplicit = false;
    let useParsedEntities = !!parsed && !explicitBrandOrModel;

    if (req.category) {
      categories = [req.category];
      categoryExplicit = true;
      if (parsed && useParsedEntities) {
        const entityCategory = this.entityCategory(parsed);
        const entityCategories = entityCategory
          ? [entityCategory]
          : parsed.brandCategories ?? [];
        const hasEntity = !!(parsed.modelIds?.length || parsed.manufacturerIds?.length);
        if (hasEntity && entityCategories.length > 0 && !entityCategories.includes(req.category)) {
          // Bikes tab + "creta": keep the tab, keep the word as text, drop the
          // impossible entity filter, and say so.
          conflicts.push({
            kind: 'category',
            parsed: this.describeEntity(parsed),
            parsedCategory: entityCategory ?? entityCategories.join('|'),
            explicitCategory: req.category,
          });
          useParsedEntities = false;
        }
      }
    } else if (parsed?.category) {
      categories = [parsed.category];
    } else if (parsed?.brandCategories?.length) {
      categories = [...parsed.brandCategories];
    }

    // ---- candidates ---------------------------------------------------------
    const entityKeys: string[] = [];
    if (parsed && useParsedEntities) {
      if (parsed.modelIds?.length) {
        for (const id of parsed.modelIds) entityKeys.push(SearchKey.model(id));
      } else if (parsed.manufacturerIds?.length) {
        for (const id of parsed.manufacturerIds) entityKeys.push(SearchKey.manufacturer(id));
      }
    }
    let text = parsed ? parsed.textQuery : original.toLowerCase();

    // ---- hard filters from the client (never relaxed) -----------------------
    const legacy: LegacyFilters = {};
    const keyGroups: string[][] = [];
    const ids = (list?: string[]) => (list ?? []).filter(Boolean);

    if (opts.keysFilters) {
      if (ids(req.manufacturerIds).length) keyGroups.push(ids(req.manufacturerIds).map(SearchKey.manufacturer));
      if (ids(req.modelIds).length) keyGroups.push(ids(req.modelIds).map(SearchKey.model));
      if (ids(req.fuelTypeIds).length) keyGroups.push(ids(req.fuelTypeIds).map(SearchKey.fuel));
      if (ids(req.transmissionTypeIds).length) {
        keyGroups.push(ids(req.transmissionTypeIds).map(SearchKey.transmission));
      }
      if (ids(req.commercialVehicleTypes).length) {
        keyGroups.push(ids(req.commercialVehicleTypes).map(SearchKey.commercialVehicleType));
      }
      if (ids(req.propertyTypes).length) keyGroups.push(ids(req.propertyTypes).map(SearchKey.propertyType));
      if (req.listingType) keyGroups.push([SearchKey.listingType(req.listingType)]);
      if (req.isFurnished === true) keyGroups.push([SearchKey.furnished()]);
      if (req.hasParking === true) keyGroups.push([SearchKey.parking()]);
      // false booleans have no key; keep them on the legacy path.
      if (req.isFurnished === false) legacy.isFurnished = false;
      if (req.hasParking === false) legacy.hasParking = false;
    } else {
      Object.assign(legacy, this.pick(req, [
        'manufacturerIds', 'modelIds', 'fuelTypeIds', 'transmissionTypeIds',
        'commercialVehicleTypes', 'propertyTypes', 'listingType',
        'isFurnished', 'hasParking',
      ]));
    }

    // Parsed STRUCTURAL words (property type, listing, commercial-vehicle type,
    // BHK, money, comparator years) are filters: the user typed a constraint,
    // not an attribute. They fill only what the client left empty.
    if (parsed) {
      if (!req.propertyTypes?.length && parsed.propertyTypes?.length) {
        opts.keysFilters
          ? keyGroups.push(parsed.propertyTypes.map(SearchKey.propertyType))
          : (legacy.propertyTypes = parsed.propertyTypes);
      }
      if (!req.listingType && parsed.listingType) {
        opts.keysFilters
          ? keyGroups.push([SearchKey.listingType(parsed.listingType)])
          : (legacy.listingType = parsed.listingType);
      }
      if (!req.commercialVehicleTypes?.length && parsed.commercialVehicleTypes?.length) {
        opts.keysFilters
          ? keyGroups.push(parsed.commercialVehicleTypes.map(SearchKey.commercialVehicleType))
          : (legacy.commercialVehicleTypes = parsed.commercialVehicleTypes);
      }
    }

    const price = this.range(
      req.minPrice ?? parsed?.minPrice,
      req.maxPrice ?? parsed?.maxPrice,
    );
    // A bare year is an attribute (boost); a comparator year ("2018 model",
    // "after 2018") is a range the user typed.
    const parsedMinYear = parsed && parsed.exactYear === undefined ? parsed.minYear : undefined;
    const vehicleYear = this.range(req.minYear ?? parsedMinYear, req.maxYear ?? parsed?.maxYear);
    const bedrooms = this.range(req.minBedrooms ?? parsed?.bedrooms, req.maxBedrooms);
    const areaSqft = this.range(req.minArea, req.maxArea);
    if (!opts.keysFilters) {
      if (vehicleYear?.min !== undefined) legacy.minYear = vehicleYear.min;
      if (vehicleYear?.max !== undefined) legacy.maxYear = vehicleYear.max;
      if (bedrooms?.min !== undefined) legacy.minBedrooms = bedrooms.min;
      if (bedrooms?.max !== undefined) legacy.maxBedrooms = bedrooms.max;
      if (areaSqft?.min !== undefined) legacy.minArea = areaSqft.min;
      if (areaSqft?.max !== undefined) legacy.maxArea = areaSqft.max;
    }

    // ---- geo ----------------------------------------------------------------
    const device: GeoPoint | undefined =
      typeof req.latitude === 'number' && typeof req.longitude === 'number'
        ? { lng: req.longitude, lat: req.latitude }
        : undefined;
    const typed: GeoPoint | undefined = parsed?.location?.centroid
      ? { lng: parsed.location.centroid[0], lat: parsed.location.centroid[1] }
      : undefined;

    let geoWithin: GeoCircle | undefined;
    let origin: GeoPoint | undefined;
    if (device && req.maxDistance) {
      // An explicit radius from the filter sheet beats a typed place (D3).
      geoWithin = { ...device, radiusKm: req.maxDistance };
      origin = device;
    } else if (typed) {
      geoWithin = {
        ...typed,
        radiusKm: parsed?.location?.radiusKmHint ?? opts.defaultPlaceRadiusKm ?? 25,
      };
      origin = typed;
    } else {
      origin = device;
    }

    let locationText: string | undefined = req.location?.trim() || undefined;
    if (!locationText && parsed?.location && !typed) {
      // A place the gazetteer knows but cannot place on the map: match the
      // ad's free-text location instead of silently dropping the word.
      locationText = parsed.location.displayName;
    }

    // ---- boosts -------------------------------------------------------------
    const boostKeys: KeyBoost[] = [];
    if (parsed && useParsedEntities) {
      if (!req.fuelTypeIds?.length) {
        for (const id of parsed.fuelTypeIds ?? []) {
          boostKeys.push({ key: SearchKey.fuel(id), weight: cfg.boosts.fuel });
        }
      }
      if (!req.transmissionTypeIds?.length) {
        for (const id of parsed.transmissionTypeIds ?? []) {
          boostKeys.push({ key: SearchKey.transmission(id), weight: cfg.boosts.transmission });
        }
      }
      for (const id of parsed.variantIds ?? []) {
        boostKeys.push({ key: SearchKey.variant(id), weight: cfg.boosts.variant });
      }
      if (parsed.modelIds?.length && parsed.manufacturerIds?.length) {
        for (const id of parsed.manufacturerIds) {
          boostKeys.push({ key: SearchKey.manufacturer(id), weight: cfg.boosts.brand });
        }
      }
    }
    const words = parsed
      ? [...new Set(parsed.freeText.split(' ').filter((w) => w.length >= 2))]
      : [];
    const boosts: Boosts = {
      keys: boostKeys,
      exactYear:
        parsed?.exactYear !== undefined
          ? { year: parsed.exactYear, weight: cfg.boosts.exactYear, nearWeight: cfg.boosts.nearYear }
          : undefined,
      words,
      wordWeight: cfg.boosts.word,
    };

    // ---- strategy -----------------------------------------------------------
    let strategy: SearchStrategy;
    const hasStructure =
      !!categories?.length || !!geoWithin || keyGroups.length > 0 ||
      Object.keys(legacy).length > 0 || !!price || !!vehicleYear || !!bedrooms || !!locationText;
    if (entityKeys.length > 0) strategy = 'hybrid';
    else if (text) strategy = 'text';
    else if (hasStructure) strategy = 'category';
    else {
      // Nothing recognised and nothing left to search? Cannot happen for a
      // non-empty query, but never return "everything" for a search string.
      text = original.toLowerCase();
      strategy = 'text';
    }

    const filters: HardFilters = {
      categories,
      categoryExplicit,
      keyGroups,
      price,
      vehicleYear,
      bedrooms,
      areaSqft,
      geoWithin,
      locationText,
      legacy,
    };
    const candidates: CandidateClauses = { entityKeys, text };

    // ---- steps --------------------------------------------------------------
    const steps: PlanStep[] = [{ filters, candidates, boosts }];
    const canRelaxCategory =
      !categoryExplicit && !!categories?.length && (entityKeys.length > 0 || !!text);
    if (canRelaxCategory) {
      steps.push({
        filters: { ...filters, categories: undefined },
        candidates,
        boosts,
        relaxation: { dropped: 'category', reason: 'zero_results' },
      });
    }

    return {
      strategy,
      steps,
      scoring: { config: cfg, origin },
      sort: this.sort(req),
      page: this.page(req, cfg, opts),
      conflicts,
      original,
      parsed,
    };
  }

  // ---------------------------------------------------------------------------

  private entityCategory(parsed: ParsedQuery): string | undefined {
    if (parsed.category && parsed.categorySource === 'entity') return parsed.category;
    return undefined;
  }

  private describeEntity(parsed: ParsedQuery): string {
    if (parsed.modelNames?.length) return `model:${parsed.modelNames.join('|')}`;
    if (parsed.manufacturerNames?.length) return `brand:${parsed.manufacturerNames.join('|')}`;
    return 'entity';
  }

  private range(min?: number, max?: number): { min?: number; max?: number } | undefined {
    const r: { min?: number; max?: number } = {};
    if (typeof min === 'number' && Number.isFinite(min)) r.min = min;
    if (typeof max === 'number' && Number.isFinite(max)) r.max = max;
    return r.min === undefined && r.max === undefined ? undefined : r;
  }

  private pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
    const out: Partial<T> = {};
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined || v === null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = v;
    }
    return out;
  }

  /**
   * `createdAt` is the DTO's class default, so it cannot be told apart from
   * "no preference": for a search it means scored order. A client that really
   * wants newest-first on a search sends `sortBy: 'newest'`.
   */
  private sort(req: SearchRequest): SortSpec {
    const order = (req.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (req.sortBy) {
      case 'price':
        return { by: 'price', order };
      case 'newest':
      case 'postedAt':
        return { by: 'createdAt', order };
      case 'year':
        return { by: 'year', order };
      case 'distance':
        return { by: 'distance', order: 'ASC' };
      default:
        return { by: 'score', order: 'DESC' };
    }
  }

  private page(req: SearchRequest, cfg: ScoringConfig, opts: PlannerOptions): PageSpec {
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(req.limit ?? DEFAULT_LIMIT)));
    const page = Math.min(cfg.pageCap, Math.max(1, Math.floor(req.page ?? 1)));
    return {
      page,
      limit,
      offset: (page - 1) * limit,
      spare: page === 1 ? opts.spareRows ?? 10 : 0,
      includeTotal: req.includeTotal !== false,
    };
  }
}
