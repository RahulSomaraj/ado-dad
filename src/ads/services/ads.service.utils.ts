import { Types } from 'mongoose';

/**
 * Location hierarchy interface
 */
export interface LocationHierarchy {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
}

/**
 * Build $geoNear stage for geospatial queries (MUST be first stage)
 */
export function buildGeoNearStage(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 50,
): any {
  return {
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [longitude, latitude], // [lon, lat]
      },
      distanceField: 'distance',
      spherical: true,
      maxDistance: maxDistanceKm * 1000, // Convert km to meters
      query: {
        isDeleted: { $ne: true },
        isApproved: true,
        geoLocation: { $exists: true, $ne: null },
      },
    },
  };
}

/**
 * Build location hierarchy match conditions
 */
export function buildLocationHierarchyMatch(
  hierarchy: LocationHierarchy,
): any[] {
  const conditions: any[] = [];

  if (hierarchy.city) {
    conditions.push({ city: { $regex: hierarchy.city, $options: 'i' } });
  }
  if (hierarchy.district) {
    conditions.push({
      district: { $regex: hierarchy.district, $options: 'i' },
    });
  }
  if (hierarchy.state) {
    conditions.push({ state: { $regex: hierarchy.state, $options: 'i' } });
  }
  if (hierarchy.country) {
    conditions.push({
      country: { $regex: hierarchy.country, $options: 'i' },
    });
  }

  return conditions;
}

/**
 * Build location score based on hierarchy match
 * Note: $distance from $geoNear is in meters, convert to km for scoring
 */
export function buildLocationScoreStage(
  hierarchy: LocationHierarchy,
): any {
  return {
    $addFields: {
      locationScore: {
        $cond: {
          if: { $ne: ['$distance', null] },
          then: {
            $let: {
              vars: {
                // Convert distance from meters to km for scoring
                distanceKm: { $divide: ['$distance', 1000] },
              },
              in: {
                $cond: {
                  if: hierarchy.city
                    ? {
                        $eq: [
                          { $toLower: { $ifNull: ['$city', ''] } },
                          hierarchy.city.toLowerCase(),
                        ],
                      }
                    : false,
                  then: {
                    $round: [
                      {
                        $add: [
                          3000,
                          {
                            $subtract: [
                              200,
                              { $multiply: ['$$distanceKm', 0.5] },
                            ],
                          },
                        ],
                      },
                      2,
                    ],
                  },
                  else: {
                    $cond: {
                      if: hierarchy.district
                        ? {
                            $eq: [
                              { $toLower: { $ifNull: ['$district', ''] } },
                              hierarchy.district.toLowerCase(),
                            ],
                          }
                        : false,
                      then: {
                        $round: [
                          {
                            $add: [
                              2500,
                              {
                                $subtract: [
                                  150,
                                  { $multiply: ['$$distanceKm', 0.6] },
                                ],
                              },
                            ],
                          },
                          2,
                        ],
                      },
                      else: {
                        $cond: {
                          if: hierarchy.state
                            ? {
                                $eq: [
                                  { $toLower: { $ifNull: ['$state', ''] } },
                                  hierarchy.state.toLowerCase(),
                                ],
                              }
                            : false,
                          then: {
                            $round: [
                              {
                                $add: [
                                  1000,
                                  {
                                    $subtract: [
                                      100,
                                      { $multiply: ['$$distanceKm', 1] },
                                    ],
                                  },
                                ],
                              },
                              2,
                            ],
                          },
                          else: {
                            $cond: {
                              if: hierarchy.country
                                ? {
                                    $eq: [
                                      { $toLower: { $ifNull: ['$country', ''] } },
                                      hierarchy.country.toLowerCase(),
                                    ],
                                  }
                                : false,
                              then: {
                                $round: [
                                  {
                                    $add: [
                                      500,
                                      {
                                        $subtract: [
                                          50,
                                          { $multiply: ['$$distanceKm', 1.5] },
                                        ],
                                      },
                                    ],
                                  },
                                  2,
                                ],
                              },
                              else: {
                                $round: [
                                  {
                                    $subtract: [
                                      100,
                                      { $multiply: ['$$distanceKm', 2] },
                                    ],
                                  },
                                  2,
                                ],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          else: 0,
        },
      },
    },
  };
}

/**
 * Build user lookup stage
 */
export function buildUserLookupStage(): any[] {
  return [
    {
      $lookup: {
        from: 'users',
        localField: 'postedBy',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ];
}

/**
 * Build manufacturer lookup stages
 */
export function buildManufacturerLookupStages(): any[] {
  return [
    {
      $lookup: {
        from: 'manufacturers',
        localField: 'vehicleDetails.manufacturerId',
        foreignField: '_id',
        as: 'manufacturerInfo',
      },
    },
    {
      $lookup: {
        from: 'manufacturers',
        localField: 'commercialVehicleDetails.manufacturerId',
        foreignField: '_id',
        as: 'commercialManufacturerInfo',
      },
    },
  ];
}

/**
 * Build property ad lookup stages
 */
export function buildPropertyAdLookupStages(): any[] {
  return [
    {
      $lookup: {
        from: 'propertyads',
        localField: '_id',
        foreignField: 'ad',
        as: '_propA',
      },
    },
    {
      $lookup: {
        from: 'propertyads',
        localField: '_id',
        foreignField: 'adId',
        as: '_propB',
      },
    },
    {
      $addFields: { propertyDetails: { $setUnion: ['$_propA', '$_propB'] } },
    },
    { $project: { _propA: 0, _propB: 0 } },
  ];
}

/**
 * Build vehicle ad lookup stages
 */
export function buildVehicleAdLookupStages(): any[] {
  return [
    {
      $lookup: {
        from: 'vehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: '_vehA',
      },
    },
    {
      $lookup: {
        from: 'vehicleads',
        localField: '_id',
        foreignField: 'adId',
        as: '_vehB',
      },
    },
    {
      $addFields: { vehicleDetails: { $setUnion: ['$_vehA', '$_vehB'] } },
    },
    { $project: { _vehA: 0, _vehB: 0 } },
  ];
}

/**
 * Build commercial vehicle ad lookup stages
 */
export function buildCommercialVehicleAdLookupStages(): any[] {
  return [
    {
      $lookup: {
        from: 'commercialvehicleads',
        localField: '_id',
        foreignField: 'ad',
        as: '_cvehA',
      },
    },
    {
      $lookup: {
        from: 'commercialvehicleads',
        localField: '_id',
        foreignField: 'adId',
        as: '_cvehB',
      },
    },
    {
      $addFields: {
        commercialVehicleDetails: { $setUnion: ['$_cvehA', '$_cvehB'] },
      },
    },
    { $project: { _cvehA: 0, _cvehB: 0 } },
  ];
}

/**
 * Build vehicle filter matcher
 */
export function buildVehicleFilterMatcher(filters: any): any {
  const vehMatch: any = {};

  if (filters.vehicleType) vehMatch.vehicleType = filters.vehicleType;
  if (filters.manufacturerId) {
    const ids = Array.isArray(filters.manufacturerId)
      ? filters.manufacturerId
      : [filters.manufacturerId];
    const objIds = ids
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (objIds.length) vehMatch.manufacturerId = { $in: objIds };
  }
  if (filters.modelId) {
    const ids = Array.isArray(filters.modelId)
      ? filters.modelId
      : [filters.modelId];
    const objIds = ids
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (objIds.length) vehMatch.modelId = { $in: objIds };
  }
  if (filters.variantId) {
    const ids = Array.isArray(filters.variantId)
      ? filters.variantId
      : [filters.variantId];
    const objIds = ids
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (objIds.length) vehMatch.variantId = { $in: objIds };
  }
  if (filters.transmissionTypeId) {
    const ids = Array.isArray(filters.transmissionTypeId)
      ? filters.transmissionTypeId
      : [filters.transmissionTypeId];
    const objIds = ids
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (objIds.length) vehMatch.transmissionTypeId = { $in: objIds };
  }
  if (filters.fuelTypeId) {
    const ids = Array.isArray(filters.fuelTypeId)
      ? filters.fuelTypeId
      : [filters.fuelTypeId];
    const objIds = ids
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (objIds.length) vehMatch.fuelTypeId = { $in: objIds };
  }
  if (filters.color)
    vehMatch.color = { $regex: filters.color, $options: 'i' };
  if (filters.maxMileage != null)
    vehMatch.mileage = { $lte: filters.maxMileage };
  if (filters.isFirstOwner != null)
    vehMatch.isFirstOwner = filters.isFirstOwner;
  if (filters.hasInsurance != null)
    vehMatch.hasInsurance = filters.hasInsurance;
  if (filters.hasRcBook != null) vehMatch.hasRcBook = filters.hasRcBook;
  if (filters.minYear != null || filters.maxYear != null) {
    vehMatch.year = {};
    if (filters.minYear != null) vehMatch.year.$gte = Number(filters.minYear);
    if (filters.maxYear != null) vehMatch.year.$lte = Number(filters.maxYear);
  }

  return Object.keys(vehMatch).length > 0
    ? { vehicleDetails: { $elemMatch: vehMatch } }
    : null;
}

/**
 * Normalize filters for cache key generation
 */
export function normalizeFilters(filters: any): any {
  if (filters == null) return filters;
  if (Array.isArray(filters)) return filters.map(normalizeFilters);
  if (typeof filters === 'object') {
    const entries = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, normalizeFilters(v)]);
    return Object.fromEntries(entries);
  }
  return filters;
}

/**
 * Convert distance from meters to kilometers
 */
export function convertDistanceToKm(distanceInMeters: number): number {
  return distanceInMeters / 1000;
}

/**
 * Extract location hierarchy from geocoding result and location hierarchy service
 */
export async function extractLocationHierarchy(
  latitude: number,
  longitude: number,
  geocodingResult: any,
  locationHierarchyService: any,
): Promise<{
  city?: string;
  district?: string;
  state?: string;
  country?: string;
}> {
  const hierarchy: {
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  } = {};

  // Get from geocoding result
  if (geocodingResult) {
    hierarchy.city = geocodingResult.city;
    hierarchy.state = geocodingResult.state;
    hierarchy.country = geocodingResult.country;
  }

  // Get district from location hierarchy service
  try {
    const locationFilter = locationHierarchyService.getLocationFilter(
      latitude,
      longitude,
    );
    if (locationFilter.district) {
      hierarchy.district = locationFilter.district;
    }
    // Override state/country if not from geocoding
    if (!hierarchy.state && locationFilter.state) {
      hierarchy.state = locationFilter.state;
    }
    if (!hierarchy.country && locationFilter.country) {
      hierarchy.country = locationFilter.country;
    }
  } catch (error) {
    // Silently fail if location hierarchy service fails
  }

  return hierarchy;
}

