import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdRepository } from '../../infrastructure/repos/ad.repo';
import { VehicleInventoryGateway } from '../../infrastructure/services/vehicle-inventory.gateway';
import { AdsCache } from '../../infrastructure/services/ads-cache';
import { RedisService } from '../../../shared/redis.service';
import { ListAdsV2Dto } from '../../dto/list-ads-v2.dto';
import { DetailedAdResponseDto } from '../../../ads/dto/common/ad-response.dto';
import {
  Favorite,
  FavoriteDocument,
} from '../../../favorites/schemas/schema.favorite';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationHierarchyService } from '../../../common/services/location-hierarchy.service';
import { AdStatus } from '../../../ads/schemas/ad.schema';

export interface PaginatedAdsResponse {
  data: DetailedAdResponseDto[];
  total?: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  /** Set when using cursor pagination; use this for the next request. */
  nextCursor?: string | null;
  /** Set when using cursor pagination; use this for the previous page. */
  prevCursor?: string | null;
}

export interface CachedListData {
  data: DetailedAdResponseDto[];
  total?: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  cachedAt: number;
}

@Injectable()
export class ListAdsUc {
  private static readonly CACHE_TTL = 300; // 5 minutes

  private readonly logger = new Logger(ListAdsUc.name);

  /**
   * P1-2 instrumentation: in-process counters so the geo-bucket change can be
   * measured from the app logs without adding a metrics dependency. Emitted
   * every REPORT_EVERY list requests.
   */
  private static readonly REPORT_EVERY = 500;
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheSkipped = 0;

  constructor(
    private readonly adRepo: AdRepository,
    private readonly inventory: VehicleInventoryGateway,
    private readonly cache: AdsCache,
    private readonly redisService: RedisService,
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    private readonly locationHierarchyService: LocationHierarchyService,
  ) { }

  async exec(
    filters: ListAdsV2Dto,
    userId?: string,
  ): Promise<PaginatedAdsResponse> {
    // 1. Check if this request should be cached
    const cacheKey = this.generateListCacheKey(filters);

    let baseData: CachedListData | null = null;

    if (cacheKey) {
      // 2. Try to get from cache (only for cacheable request shapes)
      baseData = await this.cache.get<CachedListData>(cacheKey);
    }

    this.recordCacheOutcome(
      cacheKey === null ? 'skip' : baseData ? 'hit' : 'miss',
    );

    if (!baseData) {
      // 3. Fetch from database
      baseData = await this.fetchListDataFromDatabase(filters);

      // 4. Cache only if the request shape is cacheable. Note this happens
      //    BEFORE isFavorite is applied, keeping the cached payload
      //    user-agnostic.
      if (cacheKey) {
        await this.cache.setList(cacheKey, baseData, ListAdsUc.CACHE_TTL);
      }
    }

    // 5. Add user-specific isFavorite data
    if (userId) {
      const userFavorites = await this.getUserFavorites(userId);
      baseData.data = this.addIsFavoriteToAds(baseData.data, userFavorites);
    } else {
      baseData.data = this.addIsFavoriteToAds(baseData.data, []);
    }

    return {
      data: baseData.data,
      total: baseData.total,
      page: baseData.page,
      limit: baseData.limit,
      totalPages: baseData.totalPages,
      hasNext: baseData.hasNext,
      hasPrev: baseData.hasPrev,
      nextCursor: baseData.nextCursor,
      prevCursor: baseData.prevCursor,
    };
  }

  /**
   * Quantise a coordinate pair into a cache bucket.
   *
   * P1-2: two decimal places is roughly a 1.1 km cell, so neighbours in the
   * same town collapse onto one cache entry instead of each triggering its own
   * cold $geoNear scan. Coarser buckets raise the hit rate but make the "near
   * me" ordering less precise — 2 dp is the balance point for a city feed.
   */
  private static readonly GEO_BUCKET_DP = 2;

  private geoBucket(latitude: number, longitude: number): string {
    const dp = ListAdsUc.GEO_BUCKET_DP;
    return `${latitude.toFixed(dp)}:${longitude.toFixed(dp)}`;
  }

  /**
   * Build the Redis key for a list request, or null when the request shape is
   * not worth caching.
   *
   * P1-2: the geo path used to return null unconditionally, which meant the
   * hottest queries in the product (home feed, every category page, the
   * similar-ads strip — all of which send coordinates) had a 0 % hit rate.
   * Coordinates are now quantised into a bucket and folded into the key.
   *
   * The shape is an allow-list, not a scenario list: any filter that is not
   * explicitly part of the key makes the request uncacheable. That is
   * deliberate — the previous scenario checks ignored `manufacturerIds`,
   * `modelIds`, `propertyTypes`, the year/bedroom/area ranges and the boolean
   * property filters, so e.g. `{ propertyTypes: ['villa'] }` matched
   * "Scenario 1: all ads" and could be served a cache entry built for a
   * completely different filter set.
   *
   * Invariant: the key must stay user-agnostic. `isFavorite` is applied after
   * the cache read in exec(), so `userId` must never appear here.
   */
  private generateListCacheKey(filters: ListAdsV2Dto): string | null {
    const {
      category,
      location,
      latitude,
      longitude,
      maxDistance,
      listingType,
      page,
      limit,
      sortBy,
      sortOrder,
      cursor,
      includeTotal,
      // High-cardinality / single-use filters — any of these disables caching.
      search,
      minPrice,
      maxPrice,
      commercialVehicleTypes,
      fuelTypeIds,
      transmissionTypeIds,
      manufacturerIds,
      modelIds,
      propertyTypes,
      minYear,
      maxYear,
      minBedrooms,
      maxBedrooms,
      minArea,
      maxArea,
      isFurnished,
      hasParking,
    } = filters;

    const isSet = (v: unknown) => v !== undefined && v !== null && v !== '';

    const hasUncacheableFilter =
      isSet(search) ||
      isSet(minPrice) ||
      isSet(maxPrice) ||
      isSet(minYear) ||
      isSet(maxYear) ||
      isSet(minBedrooms) ||
      isSet(maxBedrooms) ||
      isSet(minArea) ||
      isSet(maxArea) ||
      isSet(isFurnished) ||
      isSet(hasParking) ||
      !!commercialVehicleTypes?.length ||
      !!fuelTypeIds?.length ||
      !!transmissionTypeIds?.length ||
      !!manufacturerIds?.length ||
      !!modelIds?.length ||
      !!propertyTypes?.length;

    if (hasUncacheableFilter) {
      return null;
    }

    // Geo component. `maxDistance` is part of the key because it changes the
    // result set; when the client omits it, fetchWithDistanceFallback walks a
    // fixed radius ladder, which is deterministic for a given filter set, so
    // 'auto' identifies that shape unambiguously.
    const hasGeo = typeof latitude === 'number' && typeof longitude === 'number';
    if ((latitude !== undefined) !== (longitude !== undefined)) {
      // Half a coordinate pair is a malformed request shape — don't cache it.
      return null;
    }
    const geoPart = hasGeo
      ? `${this.geoBucket(latitude as number, longitude as number)}@${maxDistance ?? 'auto'}`
      : 'none';

    const paginationPart = cursor
      ? `cursor=${cursor}&limit=${limit || 20}`
      : `page=${page || 1}&limit=${limit || 20}`;

    const parts = [
      `category=${category ?? 'any'}`,
      `location=${location ? location.trim().toLowerCase() : 'any'}`,
      `geo=${geoPart}`,
      `listingType=${listingType ?? 'any'}`,
      paginationPart,
      `sortBy=${sortBy || 'createdAt'}`,
      `sortOrder=${sortOrder || 'DESC'}`,
      // The cached payload carries total/totalPages, so requests that ask for
      // them cannot share an entry with requests that don't.
      `includeTotal=${includeTotal === false ? 0 : 1}`,
    ];

    return `ads:v2:list:${parts.join('&')}`;
  }

  /**
   * Fetch list data from database with automatic distance fallback
   */
  private async fetchListDataFromDatabase(
    filters: ListAdsV2Dto,
  ): Promise<CachedListData> {
    // If location coordinates are provided, try with automatic distance fallback
    if (filters.latitude !== undefined && filters.longitude !== undefined) {
      // When the client specifies an explicit radius, honour it (single radius,
      // nearest first) so it can widen the radius itself across pages. Otherwise
      // fall back to the automatic distance expansion.
      if (filters.maxDistance) {
        return await this.fetchWithOriginalLogic(filters, filters.maxDistance);
      }
      return await this.fetchWithDistanceFallback(filters);
    }

    // Otherwise, use the original logic
    return await this.fetchWithOriginalLogic(filters);
  }

  /**
   * Fetch with automatic distance fallback when no results found
   */
  private async fetchWithDistanceFallback(
    filters: ListAdsV2Dto,
  ): Promise<CachedListData> {
    // P3-5: was [50, 100, 200, 500, 1000]. Each rung re-ran the COMPLETE
    // aggregation, so one request in a sparse region could cost six of them.
    // Two rungs are enough: $geoNear already returns nearest-first, so a 200 km
    // radius yields the same first page as a 50 km one whenever there is
    // anything within 50 km — the narrower rungs bought nothing but scans.
    const distanceThresholds = [200, 1000]; // km
    let lastResult: CachedListData | null = null;

    for (const distance of distanceThresholds) {
      try {
        const result = await this.fetchWithSpecificDistance(filters, distance);

        // Only return if actual data was returned — total > 0 alone means the page
        // is beyond the last page for this radius, so we must try the next radius.
        if (result.data.length > 0) {
          return result;
        }

        // Store the last result (even if empty) for fallback
        lastResult = result;
      } catch (error) {
        console.warn(`Failed to fetch with distance ${distance}km:`, error);
        // Continue to next distance threshold
      }
    }

    // All geo radii exhausted with no data for this page.
    // Fall back to non-geo search and reset to page 1 so something is always returned.
    const { latitude, longitude, ...filtersWithoutLocation } = filters;
    return await this.fetchWithOriginalLogic({ ...filtersWithoutLocation, page: 1 });
  }

  /**
   * Fetch with a specific distance threshold
   */
  private async fetchWithSpecificDistance(
    filters: ListAdsV2Dto,
    distanceKm: number,
  ): Promise<CachedListData> {
    const modifiedFilters = { ...filters };
    // We'll pass the distance to the location hierarchy service
    return await this.fetchWithOriginalLogic(modifiedFilters, distanceKm);
  }

  /**
   * Fetch list data from database (original logic with optional distance override)
   */
  private async fetchWithOriginalLogic(
    filters: ListAdsV2Dto,
    customDistanceKm?: number,
  ): Promise<CachedListData> {
    const {
      category,
      search,
      location,
      latitude,
      longitude,
      minPrice,
      maxPrice,
      commercialVehicleTypes,
      fuelTypeIds,
      transmissionTypeIds,
      manufacturerIds,
      modelIds,
      minYear,
      maxYear,
      propertyTypes,
      listingType,
      minBedrooms,
      maxBedrooms,
      minArea,
      maxArea,
      isFurnished,
      hasParking,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      cursor,
      includeTotal = true,
    } = filters;

    // Was a sort explicitly requested, or are we falling back to the default?
    // On the geo path the default is "nearest first" (the natural $geoNear
    // order), so we must not push a $sort that would destroy it.
    const sortExplicitlyRequested = filters.sortBy !== undefined;

    const useCursorPagination = Boolean(cursor && Types.ObjectId.isValid(cursor));

    // Build simplified aggregation pipeline
    const pipeline: any[] = [];
    let didCommercialVehicleLookup = false;
    const baseMatch = {
      isDeleted: { $ne: true },
      isActive: true,
      isApproved: true,
      soldOut: { $ne: true },
    };

    // First stage: base match or $geoNear (when coords). When no geo + search, use $text in first $match (required by MongoDB).
    const searchTrimmed = search?.trim();
    const hasSearch = Boolean(searchTrimmed);
    const hasGeo = latitude !== undefined && longitude !== undefined;

    if (hasGeo) {
      // geoNear must be first; search will use regex later
    } else if (hasSearch) {
      pipeline.push({
        $match: {
          $text: { $search: searchTrimmed },
          ...baseMatch,
        },
      });
    } else {
      pipeline.push({ $match: baseMatch });
    }

    // Extract distance filtering into geoNear if coordinates are provided
    if (latitude !== undefined && longitude !== undefined) {
      const radiusKm = customDistanceKm || 50;
      
      // Use $geoNear as the very first stage for efficient geospatial querying
      // This will use the 2dsphere index on geoLocation
      const geoNearStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000, // convert km to meters
          spherical: true,
          // Push initial match conditions into geoNear for better index usage
          query: {
            isDeleted: { $ne: true },
            isActive: true,
            isApproved: true,
            soldOut: { $ne: true }
          },
          // We divide by 1000 to output distance in km to match the existing logic
          distanceMultiplier: 0.001
        }
      };
      
      // Replace the initial match stage with geoNear since it includes the match query
      pipeline[0] = geoNearStage;

      // Get location hierarchy pipeline stages without distance calculations
      const locationPipeline =
        this.locationHierarchyService.getLocationAggregationPipeline(
          latitude,
          longitude,
          customDistanceKm, // Pass custom distance for fallback mechanism
          true // skipDistanceCalc flag
        );

      // Add location filtering stages to pipeline
      pipeline.push(...locationPipeline);

      // P3-2: the `locationScore` $addFields stage used to be pushed here. It
      // built a large nested $cond/$round/$multiply expression and ran BEFORE
      // $skip/$limit, i.e. over every document inside the radius — and nothing
      // consumed it: the $sort that used to read it was deliberately removed
      // (see the comment on the sort stage below), and $geoNear already emits
      // documents nearest-first. Pure dead CPU on the hottest path.
    }

    // Category filter
    if (category) {
      pipeline.push({
        $match: { category },
      });
    }

    // Location filter
    if (location) {
      pipeline.push({
        $match: {
          location: { $regex: location, $options: 'i' },
        },
      });
    }

    // Price filters (before lookups)
    if (minPrice || maxPrice) {
      const priceMatch: any = {};
      if (minPrice) priceMatch.$gte = minPrice;
      if (maxPrice) priceMatch.$lte = maxPrice;
      pipeline.push({
        $match: { price: priceMatch },
      });
    }

    // Search with geo: use regex (cannot use $text when $geoNear is first)
    if (hasSearch && hasGeo) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: searchTrimmed, $options: 'i' } },
            { description: { $regex: searchTrimmed, $options: 'i' } },
          ],
        },
      });
    }

    // Simplified count pipeline: filter stages only (no lookups, no sort). Use when no property/vehicle filters.
    const buildSimplifiedCountPipeline = (): any[] => {
      const stages: any[] = [];
      stages.push(pipeline[0]); // first stage: base match, $text+base, or geoNear
      if (hasGeo) {
        stages.push(
          ...this.locationHierarchyService.getLocationAggregationPipeline(
            latitude as number,
            longitude as number,
            customDistanceKm,
            true,
          ),
        );
      }
      if (category) stages.push({ $match: { category } });
      if (location) {
        stages.push({
          $match: { location: { $regex: location, $options: 'i' } },
        });
      }
      if (minPrice || maxPrice) {
        const priceMatch: any = {};
        if (minPrice) priceMatch.$gte = minPrice;
        if (maxPrice) priceMatch.$lte = maxPrice;
        stages.push({ $match: { price: priceMatch } });
      }
      if (hasSearch && hasGeo) {
        stages.push({
          $match: {
            $or: [
              { title: { $regex: searchTrimmed, $options: 'i' } },
              { description: { $regex: searchTrimmed, $options: 'i' } },
            ],
          },
        });
      }
      stages.push({ $count: 'total' });
      return stages;
    };

    const hasPropertyFilters = Boolean(
      propertyTypes ||
      listingType ||
      minBedrooms !== undefined ||
      maxBedrooms !== undefined ||
      minArea !== undefined ||
      maxArea !== undefined ||
      isFurnished !== undefined ||
      hasParking !== undefined
    );

    const hasVehicleFilters = Boolean(
      (commercialVehicleTypes?.length && commercialVehicleTypes.length > 0) ||
        ((category === 'private_vehicle' ||
          category === 'commercial_vehicle' ||
          category === 'two_wheeler') &&
          (fuelTypeIds?.length ||
            transmissionTypeIds?.length ||
            manufacturerIds?.length ||
            modelIds?.length ||
            minYear !== undefined ||
            maxYear !== undefined))
    );

    if (hasPropertyFilters) {
      pipeline.push({
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      });

      // Ensure we are filtering only property ads when property filters are present
      pipeline.push({ $match: { category: 'property' } });

      const propMatch: any = {};

      if (propertyTypes && propertyTypes.length > 0) {
        propMatch['propertyDetails.propertyType'] = { $in: propertyTypes };
      }
      if (listingType) {
        propMatch['propertyDetails.listingType'] = listingType;
      }
      if (minBedrooms !== undefined || maxBedrooms !== undefined) {
        propMatch['propertyDetails.bedrooms'] = {};
        if (minBedrooms !== undefined)
          propMatch['propertyDetails.bedrooms'].$gte = minBedrooms;
        if (maxBedrooms !== undefined)
          propMatch['propertyDetails.bedrooms'].$lte = maxBedrooms;
      }
      if (minArea !== undefined || maxArea !== undefined) {
        propMatch['propertyDetails.areaSqft'] = {};
        if (minArea !== undefined)
          propMatch['propertyDetails.areaSqft'].$gte = minArea;
        if (maxArea !== undefined)
          propMatch['propertyDetails.areaSqft'].$lte = maxArea;
      }
      if (isFurnished !== undefined) {
        propMatch['propertyDetails.isFurnished'] = isFurnished;
      }
      if (hasParking !== undefined) {
        propMatch['propertyDetails.hasParking'] = hasParking;
      }

      if (Object.keys(propMatch).length > 0) {
        // propertyDetails may be an array; match on any element
        pipeline.push({ $match: propMatch });
      }
    }

    if (hasVehicleFilters) {
      if (category === 'two_wheeler' || category === 'private_vehicle') {
        pipeline.push({
          $lookup: {
            from: 'vehicleads',
            localField: '_id',
            foreignField: 'ad',
            as: 'vehicleDetails',
          },
        });
      } else if (category === 'commercial_vehicle') {
        pipeline.push({
          $lookup: {
            from: 'commercialvehicleads',
            localField: '_id',
            foreignField: 'ad',
            as: 'commercialVehicleDetails',
          },
        });
        didCommercialVehicleLookup = true;
      }

      const vehicleMatch: any = {};
      const elemMatchConditions: any = {};

      if (fuelTypeIds?.length) {
        elemMatchConditions.fuelTypeId = {
          $in: fuelTypeIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (transmissionTypeIds?.length) {
        elemMatchConditions.transmissionTypeId = {
          $in: transmissionTypeIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (manufacturerIds?.length) {
        elemMatchConditions.manufacturerId = {
          $in: manufacturerIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (modelIds?.length) {
        elemMatchConditions.modelId = {
          $in: modelIds.map((id) => new Types.ObjectId(id)),
        };
      }

      if (minYear !== undefined || maxYear !== undefined) {
        elemMatchConditions.year = {};
        if (minYear !== undefined) elemMatchConditions.year.$gte = minYear;
        if (maxYear !== undefined) elemMatchConditions.year.$lte = maxYear;
      }

      if (Object.keys(elemMatchConditions).length > 0) {
        // Apply filters to the appropriate vehicle details collection based on category
        if (category === 'two_wheeler') {
          vehicleMatch.vehicleDetails = {
            $elemMatch: elemMatchConditions,
          };
        } else if (category === 'private_vehicle') {
          vehicleMatch.vehicleDetails = {
            $elemMatch: elemMatchConditions,
          };
        } else if (category === 'commercial_vehicle') {
          vehicleMatch.commercialVehicleDetails = {
            $elemMatch: elemMatchConditions,
          };
        }
      }

      pipeline.push({
        $match: vehicleMatch,
      });
    }

    // Commercial vehicle types filter: works even if category is not provided.
    // It returns ads that have commercial vehicle details with type in the provided list.
    if (commercialVehicleTypes?.length) {
      // Ensure commercial vehicle details are available for matching
      if (!didCommercialVehicleLookup) {
        pipeline.push({
          $lookup: {
            from: 'commercialvehicleads',
            localField: '_id',
            foreignField: 'ad',
            as: 'commercialVehicleDetails',
          },
        });
        didCommercialVehicleLookup = true;
      }

      pipeline.push({
        $match: {
          commercialVehicleDetails: {
            $elemMatch: {
              commercialVehicleType: { $in: commercialVehicleTypes },
            },
          },
        },
      });
    }

    // Sort with location priority (index-friendly: isDeleted, isActive, isApproved, soldOut, createdAt)
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;

    if (latitude !== undefined && longitude !== undefined) {
      // $geoNear (pipeline stage 0) already emits documents nearest-first, and
      // $match preserves that order. Sorting on `locationScore` here re-sorted
      // the entire candidate set in memory on a computed $addFields value — a
      // blocking sort that can never use an index, runs before $project (so it
      // sorts whole documents, description and images included), and has no
      // allowDiskUse, so it throws past 100MB. It also made the secondary
      // [sortBy] key a no-op, because locationScore is per-km and effectively
      // unique — which is why "Price: low to high" never worked under geo.
      //
      // Default (no explicit sort) => keep $geoNear's distance order, no $sort.
      // Explicit sort => honour it on its own, so price/year sorting works.
      if (sortExplicitlyRequested) {
        pipeline.push({
          $sort: { [sortBy]: sortDirection },
        });
      }
    } else {
      pipeline.push({
        $sort: { [sortBy]: sortDirection },
      });
    }

    // --- PAGINATION: cursor (no skip) or offset ---
    if (useCursorPagination) {
      const cursorId = new Types.ObjectId(cursor as string);
      pipeline.push({
        $match: {
          _id: sortOrder === 'DESC' ? { $lt: cursorId } : { $gt: cursorId },
        },
      });
      pipeline.push({ $limit: limit + 1 }); // fetch one extra to know hasNext
    } else {
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
    }

    // --- DELAYED LOOKUPS POST-PAGINATION ---

    // User lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'postedBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              countryCode: 1,
              phoneNumber: 1,
              profilePic: 1,
              type: 1,
              isVerified: 1,
              createdAt: 1,
              isDeleted: 1,
            },
          },
        ],
      },
    });
    pipeline.push({
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    });

    // If property lookups weren't done before pagination, do them now
    if (!hasPropertyFilters) {
      pipeline.push({
        $lookup: {
          from: 'propertyads',
          localField: '_id',
          foreignField: 'ad',
          as: 'propertyDetails',
        },
      });
    }

    // Always fetch all vehicle details since response format expects them
    // unless they were already fetched for filtering
    if (!hasVehicleFilters || (category !== 'private_vehicle' && category !== 'two_wheeler')) {
      pipeline.push({
        $lookup: {
          from: 'vehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'vehicleDetails',
        },
      });
    }

    if (!hasVehicleFilters || category !== 'commercial_vehicle') {
      if (!didCommercialVehicleLookup) {
        pipeline.push({
          $lookup: {
            from: 'commercialvehicleads',
            localField: '_id',
            foreignField: 'ad',
            as: 'commercialVehicleDetails',
          },
        });
        didCommercialVehicleLookup = true;
      }
    }

    // No favorites lookup in base data - will be added per user

    // Add fields for better response structure
    pipeline.push({
      $addFields: {
        id: '$_id',
        postedAt: '$createdAt',
        user: {
          id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          countryCode: '$user.countryCode',
          phoneNumber: '$user.phoneNumber',
          profilePic: '$user.profilePic',
        },
        isFavorite: false, // Will be set per user
        propertyDetails: { $arrayElemAt: ['$propertyDetails', 0] },
        vehicleDetails: { $arrayElemAt: ['$vehicleDetails', 0] },
        commercialVehicleDetails: {
          $arrayElemAt: ['$commercialVehicleDetails', 0],
        },
      },
    });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        price: 1,
        images: 1,
        location: 1,
        latitude: 1,
        longitude: 1,
        distance: 1, // Include distance field
        category: 1,
        isActive: 1,
        soldOut: 1,
        isApproved: 1, // Include isApproved field
        approvedBy: 1, // Include approvedBy field
        postedBy: 1,
        createdAt: 1,
        updatedAt: 1,
        viewCount: 1,
        id: 1,
        postedAt: 1,
        user: 1,
        isFavorite: 1,
        propertyDetails: 1,
        vehicleDetails: 1,
        commercialVehicleDetails: 1,
        // P3-2: locationScore removed — it was computed but never sorted on.
      },
    });

    // Execute: run data aggregation; optionally run simplified count (no count when property/vehicle filters or cursor)
    // `includeTotal: false` lets infinite-scroll clients skip the second
    // aggregation entirely. It is NOT free on the geo path: the count pipeline
    // re-uses pipeline[0], so it repeats the whole $geoNear scan.
    const runCount =
      includeTotal &&
      !hasPropertyFilters &&
      !hasVehicleFilters &&
      !useCursorPagination;

    const skip = useCursorPagination ? 0 : (page - 1) * limit;
    const isDeepOffsetPagination = !useCursorPagination && skip > 10000;
    if (isDeepOffsetPagination) {
      return {
        data: [],
        total: undefined,
        page,
        limit,
        totalPages: undefined,
        hasNext: false,
        hasPrev: true,
        nextCursor: null,
        prevCursor: cursor ?? null,
        cachedAt: Date.now(),
      };
    }

    const [rawData, countResult] = await Promise.all([
      this.adRepo.aggregate(pipeline),
      runCount
        ? this.adRepo.aggregate(buildSimplifiedCountPipeline())
        : Promise.resolve([{ total: 0 }]),
    ]);

    // Cursor path: we requested limit+1; take first `limit` and set nextCursor if we got more
    let data = rawData;
    let hasNext: boolean;
    let nextCursor: string | null = null;
    let prevCursorOut: string | null = null;

    if (useCursorPagination) {
      hasNext = rawData.length > limit;
      data = rawData.slice(0, limit);
      if (hasNext && data.length > 0) {
        nextCursor = data[data.length - 1]._id?.toString() ?? null;
      }
      prevCursorOut = cursor ?? null;
    } else {
      const total = countResult[0]?.total ?? 0;
      const totalPages = Math.ceil(total / limit);
      // Without a count there is no totalPages to compare against, so fall back
      // to the same heuristic the filtered path uses: a full page implies more.
      hasNext = !runCount
        ? rawData.length === limit
        : (hasPropertyFilters || hasVehicleFilters)
          ? rawData.length === limit
          : page < totalPages;
      if (!(hasPropertyFilters || hasVehicleFilters)) {
        nextCursor = null;
        prevCursorOut = null;
      }
    }

    const total = runCount ? (countResult[0]?.total ?? 0) : undefined;
    const totalPages =
      total !== undefined && limit > 0 ? Math.ceil(total / limit) : undefined;

    // Batch fetch all inventory items to avoid N+1 queries
    const inventoryMaps = await this.batchFetchInventoryItems(data);

    const mappedData = data.map((ad) =>
      this.mapToDetailedResponseDtoWithInventory(
        ad,
        inventoryMaps.manufacturers,
        inventoryMaps.models,
        inventoryMaps.variants,
        inventoryMaps.fuelTypes,
        inventoryMaps.transmissionTypes,
      ),
    );

    return {
      data: mappedData,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev: useCursorPagination ? Boolean(prevCursorOut) : page > 1,
      nextCursor: nextCursor ?? undefined,
      prevCursor: prevCursorOut ?? undefined,
      cachedAt: Date.now(),
    };
  }

  /**
   * Batch fetch all inventory items for all ads to avoid N+1 queries
   */
  private async batchFetchInventoryItems(data: any[]): Promise<{
    manufacturers: Record<string, any>;
    models: Record<string, any>;
    variants: Record<string, any>;
    fuelTypes: Record<string, any>;
    transmissionTypes: Record<string, any>;
  }> {
    const manufacturerIds = new Set<string>();
    const modelIds = new Set<string>();
    const variantIds = new Set<string>();
    const fuelTypeIds = new Set<string>();
    const transmissionTypeIds = new Set<string>();

    // Collect all unique IDs from all ads
    for (const ad of data) {
      if (ad.vehicleDetails) {
        if (ad.vehicleDetails.manufacturerId)
          manufacturerIds.add(ad.vehicleDetails.manufacturerId.toString());
        if (ad.vehicleDetails.modelId)
          modelIds.add(ad.vehicleDetails.modelId.toString());
        if (ad.vehicleDetails.variantId)
          variantIds.add(ad.vehicleDetails.variantId.toString());
        if (ad.vehicleDetails.fuelTypeId)
          fuelTypeIds.add(ad.vehicleDetails.fuelTypeId.toString());
        if (ad.vehicleDetails.transmissionTypeId)
          transmissionTypeIds.add(
            ad.vehicleDetails.transmissionTypeId.toString(),
          );
      }
      if (ad.commercialVehicleDetails) {
        if (ad.commercialVehicleDetails.manufacturerId)
          manufacturerIds.add(
            ad.commercialVehicleDetails.manufacturerId.toString(),
          );
        if (ad.commercialVehicleDetails.modelId)
          modelIds.add(ad.commercialVehicleDetails.modelId.toString());
        if (ad.commercialVehicleDetails.variantId)
          variantIds.add(ad.commercialVehicleDetails.variantId.toString());
        if (ad.commercialVehicleDetails.fuelTypeId)
          fuelTypeIds.add(ad.commercialVehicleDetails.fuelTypeId.toString());
        if (ad.commercialVehicleDetails.transmissionTypeId)
          transmissionTypeIds.add(
            ad.commercialVehicleDetails.transmissionTypeId.toString(),
          );
      }
    }

    // Batch fetch all inventory items in parallel
    const [
      manufacturerResults,
      modelResults,
      variantResults,
      fuelTypeResults,
      transmissionTypeResults,
    ] = await Promise.all([
      manufacturerIds.size > 0
        ? this.inventory.getManufacturersByIds(Array.from(manufacturerIds))
        : Promise.resolve([]),
      modelIds.size > 0
        ? this.inventory.getModelsByIds(Array.from(modelIds))
        : Promise.resolve([]),
      variantIds.size > 0
        ? this.inventory.getVariantsByIds(Array.from(variantIds))
        : Promise.resolve([]),
      fuelTypeIds.size > 0
        ? this.inventory.getFuelTypesByIds(Array.from(fuelTypeIds))
        : Promise.resolve([]),
      transmissionTypeIds.size > 0
        ? this.inventory.getTransmissionTypesByIds(
            Array.from(transmissionTypeIds),
          )
        : Promise.resolve([]),
    ]);

    // Convert to maps keyed by ID string
    const manufacturers: Record<string, any> = {};
    manufacturerResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) manufacturers[id] = this.normalizeObjectIds(item);
    });

    const models: Record<string, any> = {};
    modelResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) models[id] = this.normalizeObjectIds(item);
    });

    const variants: Record<string, any> = {};
    variantResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) variants[id] = this.normalizeObjectIds(item);
    });

    const fuelTypes: Record<string, any> = {};
    fuelTypeResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) fuelTypes[id] = this.normalizeObjectIds(item);
    });

    const transmissionTypes: Record<string, any> = {};
    transmissionTypeResults.forEach((item: any) => {
      const id = item._id?.toString() || item.id?.toString();
      if (id) transmissionTypes[id] = this.normalizeObjectIds(item);
    });

    return {
      manufacturers,
      models,
      variants,
      fuelTypes,
      transmissionTypes,
    };
  }

  /**
   * Extract ObjectId string from buffer object or other formats
   */
  private extractObjectIdString(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      // If it's already a string, validate it's a valid ObjectId format
      if (Types.ObjectId.isValid(value)) {
        return value;
      }
      return value; // Return as-is even if not valid ObjectId format
    }

    // Handle buffer objects (from .lean())
    if (value && typeof value === 'object' && 'buffer' in value) {
      try {
        const buffer = (value as any).buffer;

        // Case 1: Direct Buffer instance
        if (Buffer.isBuffer(buffer)) {
          return new Types.ObjectId(buffer).toString();
        }

        // Case 2: Nested buffer object like { buffer: { 0: 104, 1: 181, ... } }
        if (
          typeof buffer === 'object' &&
          buffer !== null &&
          !Array.isArray(buffer)
        ) {
          // Extract numeric values from the buffer object
          const bufferArray: number[] = [];
          for (let i = 0; i < 12; i++) {
            if (buffer[i] !== undefined) {
              const num = Number(buffer[i]);
              if (!isNaN(num) && num >= 0 && num <= 255) {
                bufferArray.push(num);
              }
            }
          }

          // If we have 12 bytes, create ObjectId
          if (bufferArray.length === 12) {
            return new Types.ObjectId(Buffer.from(bufferArray)).toString();
          }

          // Try alternative: get all numeric values in order
          const allValues = Object.keys(buffer)
            .map((k) => Number(k))
            .filter((k) => !isNaN(k))
            .sort((a, b) => a - b)
            .map((k) => Number(buffer[k]))
            .filter((v) => !isNaN(v) && v >= 0 && v <= 255);

          if (allValues.length === 12) {
            return new Types.ObjectId(Buffer.from(allValues)).toString();
          }
        }
      } catch (error) {
        // Fall through to other methods
      }
    }

    // Try to validate and convert if it's a valid ObjectId format
    if (Types.ObjectId.isValid(value)) {
      try {
        return new Types.ObjectId(value).toString();
      } catch {
        // Fall through
      }
    }

    // Last resort: try toString if available
    if (typeof (value as any).toString === 'function') {
      const str = (value as any).toString();
      if (str !== '[object Object]' && Types.ObjectId.isValid(str)) {
        return str;
      }
    }

    // Final fallback
    return null;
  }

  /**
   * Normalize ObjectIds to strings recursively
   */
  private normalizeObjectIds(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeObjectIds(item));
    }
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;

    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle _id, ad, and all *Id fields (all are ObjectId fields)
      if (
        key === '_id' ||
        key === 'ad' ||
        key.endsWith('Id') ||
        key.endsWith('_id')
      ) {
        if (value === null || value === undefined) {
          normalized[key] = value;
        } else if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          // Check if it's a buffer object (from .lean())
          if ('buffer' in value) {
            try {
              const buffer = (value as any).buffer;
              if (Buffer.isBuffer(buffer)) {
                const objectId = new Types.ObjectId(buffer);
                normalized[key] = objectId.toString();
              } else if (typeof buffer === 'object' && buffer !== null) {
                // Handle nested buffer object like { buffer: { 0: 105, 1: 28, ... } }
                const bufferArray = Object.values(
                  buffer as Record<number, number>,
                )
                  .map((v) => Number(v))
                  .filter((v) => !isNaN(v));
                if (bufferArray.length === 12) {
                  // ObjectId is 12 bytes
                  const objectId = new Types.ObjectId(Buffer.from(bufferArray));
                  normalized[key] = objectId.toString();
                } else {
                  // Try to convert anyway or fallback to string
                  try {
                    const objectId = new Types.ObjectId(
                      Buffer.from(bufferArray),
                    );
                    normalized[key] = objectId.toString();
                  } catch {
                    normalized[key] = String(value);
                  }
                }
              } else {
                normalized[key] = String(value);
              }
            } catch {
              normalized[key] = String(value);
            }
          } else {
            // It's an object but not a buffer - might be an ObjectId instance or plain object
            // Try to convert it
            try {
              if (Types.ObjectId.isValid(value as any)) {
                const objectId = new Types.ObjectId(value as any);
                normalized[key] = objectId.toString();
              } else {
                normalized[key] = String(value);
              }
            } catch {
              normalized[key] = String(value);
            }
          }
        } else if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
          // Already a valid ObjectId string
          normalized[key] = value;
        } else if (typeof value === 'string') {
          // Regular string
          normalized[key] = value;
        } else if (
          (typeof value === 'string' || typeof value === 'number') &&
          Types.ObjectId.isValid(value)
        ) {
          try {
            const objectId = new Types.ObjectId(value);
            normalized[key] = objectId.toString();
          } catch {
            normalized[key] = String(value);
          }
        } else if (typeof (value as any).toString === 'function') {
          const str = (value as any).toString();
          normalized[key] = str === '[object Object]' ? String(value) : str;
        } else {
          normalized[key] = String(value);
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        normalized[key] = this.normalizeObjectIds(value);
      } else if (Array.isArray(value)) {
        normalized[key] = value.map((item) => this.normalizeObjectIds(item));
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  /**
   * Map ad to response DTO using pre-fetched inventory data
   */
  private mapToDetailedResponseDtoWithInventory(
    ad: any,
    manufacturers: Record<string, any>,
    models: Record<string, any>,
    variants: Record<string, any>,
    fuelTypes: Record<string, any>,
    transmissionTypes: Record<string, any>,
  ): DetailedAdResponseDto {
    // Process vehicle details with inventory information
    const vehicleDetails = ad.vehicleDetails;
    let processedVehicleDetails = vehicleDetails;

    if (vehicleDetails) {
      // First normalize all ObjectIds in vehicleDetails (including manufacturerId, modelId, etc.)
      const normalizedVehicleDetails = this.normalizeObjectIds(vehicleDetails);

      // Extract normalized IDs for lookup - ensure they are strings
      // Use extractObjectIdString to handle buffer objects directly
      const manufacturerIdStr = vehicleDetails.manufacturerId
        ? this.extractObjectIdString(vehicleDetails.manufacturerId)
        : null;
      const modelIdStr = vehicleDetails.modelId
        ? this.extractObjectIdString(vehicleDetails.modelId)
        : null;
      const variantIdStr = vehicleDetails.variantId
        ? this.extractObjectIdString(vehicleDetails.variantId)
        : null;
      const fuelTypeIdStr = vehicleDetails.fuelTypeId
        ? this.extractObjectIdString(vehicleDetails.fuelTypeId)
        : null;
      const transmissionTypeIdStr = vehicleDetails.transmissionTypeId
        ? this.extractObjectIdString(vehicleDetails.transmissionTypeId)
        : null;

      const manufacturer = manufacturerIdStr
        ? manufacturers[manufacturerIdStr] || {
            _id: manufacturerIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const model = modelIdStr
        ? models[modelIdStr] || {
            _id: modelIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const variant = variantIdStr
        ? variants[variantIdStr] || {
            _id: variantIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const fuelType = fuelTypeIdStr
        ? fuelTypes[fuelTypeIdStr] || {
            _id: fuelTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const transmissionType = transmissionTypeIdStr
        ? transmissionTypes[transmissionTypeIdStr] || {
            _id: transmissionTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;

      processedVehicleDetails = {
        ...normalizedVehicleDetails,
        manufacturerId: manufacturerIdStr || null,
        modelId: modelIdStr || null,
        variantId: variantIdStr || null,
        fuelTypeId: fuelTypeIdStr || null,
        transmissionTypeId: transmissionTypeIdStr || null,
        manufacturer: manufacturer || null,
        model: model || null,
        variant: variant || null,
        fuelType: fuelType || null,
        transmissionType: transmissionType || null,
      };
    }

    // Process commercial vehicle details with inventory information
    const commercialVehicleDetails = ad.commercialVehicleDetails;
    let processedCommercialVehicleDetails = commercialVehicleDetails;

    if (commercialVehicleDetails) {
      // First normalize all ObjectIds in commercialVehicleDetails
      const normalizedCommercialVehicleDetails = this.normalizeObjectIds(
        commercialVehicleDetails,
      );

      // Extract normalized IDs for lookup - ensure they are strings
      // Use extractObjectIdString to handle buffer objects directly
      const manufacturerIdStr = commercialVehicleDetails.manufacturerId
        ? this.extractObjectIdString(commercialVehicleDetails.manufacturerId)
        : null;
      const modelIdStr = commercialVehicleDetails.modelId
        ? this.extractObjectIdString(commercialVehicleDetails.modelId)
        : null;
      const variantIdStr = commercialVehicleDetails.variantId
        ? this.extractObjectIdString(commercialVehicleDetails.variantId)
        : null;
      const fuelTypeIdStr = commercialVehicleDetails.fuelTypeId
        ? this.extractObjectIdString(commercialVehicleDetails.fuelTypeId)
        : null;
      const transmissionTypeIdStr = commercialVehicleDetails.transmissionTypeId
        ? this.extractObjectIdString(
            commercialVehicleDetails.transmissionTypeId,
          )
        : null;

      const manufacturer = manufacturerIdStr
        ? manufacturers[manufacturerIdStr] || {
            _id: manufacturerIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const model = modelIdStr
        ? models[modelIdStr] || {
            _id: modelIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const variant = variantIdStr
        ? variants[variantIdStr] || {
            _id: variantIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const fuelType = fuelTypeIdStr
        ? fuelTypes[fuelTypeIdStr] || {
            _id: fuelTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;
      const transmissionType = transmissionTypeIdStr
        ? transmissionTypes[transmissionTypeIdStr] || {
            _id: transmissionTypeIdStr,
            name: 'Not Found',
            displayName: 'Not Found',
          }
        : null;

      processedCommercialVehicleDetails = {
        ...normalizedCommercialVehicleDetails,
        manufacturerId: manufacturerIdStr || null,
        modelId: modelIdStr || null,
        variantId: variantIdStr || null,
        fuelTypeId: fuelTypeIdStr || null,
        transmissionTypeId: transmissionTypeIdStr || null,
        manufacturer: manufacturer || null,
        model: model || null,
        variant: variant || null,
        fuelType: fuelType || null,
        transmissionType: transmissionType || null,
      };
    }

    // Normalize propertyDetails - ensure all fields are present and match expected format
    let propertyDetails = ad.propertyDetails;
    if (propertyDetails) {
      propertyDetails = this.normalizeObjectIds(propertyDetails);
      // Build propertyDetails with all fields from the database
      // Include optional fields only if they exist (bedrooms, bathrooms, floor may not exist for plot types)
      const normalizedPropertyDetails: any = {
        _id: propertyDetails._id || null,
        ad: propertyDetails.ad || null,
        propertyType: propertyDetails.propertyType || null,
        listingType: propertyDetails.listingType || null,
        areaSqft: propertyDetails.areaSqft ?? null,
        isFurnished: propertyDetails.isFurnished ?? false,
        hasParking: propertyDetails.hasParking ?? false,
        hasGarden: propertyDetails.hasGarden ?? false,
        amenities: Array.isArray(propertyDetails.amenities)
          ? propertyDetails.amenities
          : [],
        createdAt: propertyDetails.createdAt || null,
        updatedAt: propertyDetails.updatedAt || null,
        __v: propertyDetails.__v ?? 0,
      };

      // Include optional fields only if they exist in the data
      if (
        propertyDetails.bedrooms !== undefined &&
        propertyDetails.bedrooms !== null
      ) {
        normalizedPropertyDetails.bedrooms = propertyDetails.bedrooms;
      }
      if (
        propertyDetails.bathrooms !== undefined &&
        propertyDetails.bathrooms !== null
      ) {
        normalizedPropertyDetails.bathrooms = propertyDetails.bathrooms;
      }
      if (
        propertyDetails.floor !== undefined &&
        propertyDetails.floor !== null
      ) {
        normalizedPropertyDetails.floor = propertyDetails.floor;
      }

      propertyDetails = normalizedPropertyDetails;
    }

    // For property ads, vehicleDetails and commercialVehicleDetails should be undefined
    const finalVehicleDetails =
      ad.category === 'property' ? undefined : processedVehicleDetails;
    const finalCommercialVehicleDetails =
      ad.category === 'property'
        ? undefined
        : processedCommercialVehicleDetails;

    return {
      id: ad._id?.toString() || String(ad._id),
      title: ad.title,
      description: ad.description,
      price: ad.price,
      images: ad.images || [],
      location: ad.location,
      latitude:
        ad.latitude !== null && ad.latitude !== undefined
          ? Number(ad.latitude)
          : (null as any),
      longitude:
        ad.longitude !== null && ad.longitude !== undefined
          ? Number(ad.longitude)
          : (null as any),
      distance:
        ad.distance !== null && ad.distance !== undefined
          ? Number(ad.distance)
          : (null as any),
      link: ad.link || '',
      category: ad.category,
      isActive: ad.isActive,
      soldOut: ad.soldOut || false,
      isApproved: ad.isApproved || false,
      status: ad.status || (ad.isApproved ? AdStatus.APPROVED : AdStatus.PENDING),
      approvedBy: ad.approvedBy ? ad.approvedBy.toString() : null,
      postedAt: ad.createdAt,
      updatedAt: ad.updatedAt,
      postedBy: ad.postedBy?.toString() || String(ad.postedBy),
      user: ad.user
        ? {
            id: ad.user._id?.toString() || String(ad.user._id),
            name: ad.user.name,
            email: ad.user.email,
            countryCode: ad.user.countryCode,
            phoneNumber: ad.user.phoneNumber,
            profilePic: ad.user.profilePic || 'default-profile-pic-url',
          }
        : undefined,
      propertyDetails: propertyDetails || undefined,
      vehicleDetails: finalVehicleDetails,
      commercialVehicleDetails: finalCommercialVehicleDetails,
      isFavorite: ad.isFavorite || false,
    };
  }

  /**
   * P1-2: track list cache hit / miss / skip and log the rate periodically.
   * 'skip' means the request shape is not cacheable at all (a key was never
   * generated), which is worth separating from a genuine miss.
   */
  private recordCacheOutcome(outcome: 'hit' | 'miss' | 'skip'): void {
    if (outcome === 'hit') this.cacheHits++;
    else if (outcome === 'miss') this.cacheMisses++;
    else this.cacheSkipped++;

    const total = this.cacheHits + this.cacheMisses + this.cacheSkipped;
    if (total % ListAdsUc.REPORT_EVERY !== 0) return;

    const cacheable = this.cacheHits + this.cacheMisses;
    const hitRate = cacheable
      ? ((this.cacheHits / cacheable) * 100).toFixed(1)
      : '0.0';
    this.logger.log(
      `ads:v2:list cache — requests=${total} hits=${this.cacheHits} ` +
        `misses=${this.cacheMisses} uncacheable=${this.cacheSkipped} ` +
        `hitRate=${hitRate}% (of cacheable shapes)`,
    );
  }

  /**
   * Get user's favorite ad IDs (with caching)
   */
  private async getUserFavorites(userId: string): Promise<string[]> {
    const cacheKey = `ads:v2:userFavorites:${userId}`;
    let favorites = await this.cache.get<string[]>(cacheKey);

    if (!favorites) {
      // Fetch from database
      const favoriteDocs = await this.favoriteModel
        .find({
          userId: new Types.ObjectId(userId),
        })
        .select('itemId')
        .lean();

      favorites = favoriteDocs.map((doc) => doc.itemId.toString());

      // Cache for 5 minutes - use RedisService directly
      await this.redisService.cacheSet(
        cacheKey,
        favorites,
        ListAdsUc.CACHE_TTL,
      );
    }

    return favorites;
  }

  /**
   * Add isFavorite field to ads based on user's favorites
   */
  private addIsFavoriteToAds(
    ads: DetailedAdResponseDto[],
    userFavorites: string[],
  ): DetailedAdResponseDto[] {
    // P2-4: Array.includes made this O(n·m) — one linear scan of the
    // favourites list per row. A Set makes the lookup O(1).
    if (!userFavorites.length) {
      return ads.map((ad) => ({ ...ad, isFavorite: false }));
    }
    const favoriteIds = new Set(userFavorites);
    return ads.map((ad) => ({
      ...ad,
      isFavorite: favoriteIds.has(ad.id),
    }));
  }
}
