import { Injectable, Logger } from '@nestjs/common';

export interface LocationBoundary {
  name: string;
  type: 'district' | 'state' | 'country';
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  priority: number; // Lower number = higher priority
  parentLocation?: {
    state?: string;
    country?: string;
  };
}

export interface LocationFilter {
  district?: string;
  state?: string;
  country?: string;
  priority: number;
}

export interface LocationHierarchyConfig {
  country: string;
  state: string;
  district: string;
  bounds: {
    country: { north: number; south: number; east: number; west: number };
    state: { north: number; south: number; east: number; west: number };
    district: { north: number; south: number; east: number; west: number };
  };
}

@Injectable()
export class LocationHierarchyService {
  private readonly logger = new Logger(LocationHierarchyService.name);

  // Default configuration (can be overridden)
  private defaultConfig: LocationHierarchyConfig = {
    country: 'India',
    state: 'Kerala',
    district: 'Pathanamthitta',
    bounds: {
      country: { north: 37.1, south: 6.4, east: 97.4, west: 68.2 },
      state: { north: 12.8, south: 8.2, east: 77.3, west: 74.9 },
      district: { north: 9.5, south: 9.0, east: 77.2, west: 76.7 },
    },
  };

  /**
   * Generate location boundaries based on configuration
   * @param config - Location hierarchy configuration
   * @returns Array of location boundaries
   */
  private generateLocationBoundaries(
    config: LocationHierarchyConfig,
  ): LocationBoundary[] {
    return [
      {
        name: config.district,
        type: 'district',
        bounds: config.bounds.district,
        priority: 1, // Highest priority
        parentLocation: {
          state: config.state,
          country: config.country,
        },
      },
      {
        name: config.state,
        type: 'state',
        bounds: config.bounds.state,
        priority: 2, // Medium priority
        parentLocation: {
          country: config.country,
        },
      },
      {
        name: config.country,
        type: 'country',
        bounds: config.bounds.country,
        priority: 3, // Lowest priority
      },
    ];
  }

  /**
   * Get location boundaries for given coordinates
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param customConfig - Optional custom configuration
   * @returns Array of location boundaries
   */
  private getLocationBoundaries(
    latitude: number,
    longitude: number,
    customConfig?: LocationHierarchyConfig,
  ): LocationBoundary[] {
    // For now, use default config. In future, this could be dynamic based on coordinates
    const config = customConfig || this.defaultConfig;
    return this.generateLocationBoundaries(config);
  }

  /**
   * Determine location hierarchy and filter criteria based on coordinates
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param customConfig - Optional custom configuration
   * @returns LocationFilter with hierarchical boundaries
   */
  getLocationFilter(
    latitude: number,
    longitude: number,
    customConfig?: LocationHierarchyConfig,
  ): LocationFilter {
    const location = this.determineLocation(latitude, longitude, customConfig);

    return {
      district: location.district,
      state: location.state,
      country: location.country,
      priority: location.priority,
    };
  }

  /**
   * Determine which location boundaries the coordinates fall within
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param customConfig - Optional custom configuration
   * @returns Location information with priority
   */
  private determineLocation(
    latitude: number,
    longitude: number,
    customConfig?: LocationHierarchyConfig,
  ): {
    district?: string;
    state?: string;
    country?: string;
    priority: number;
  } {
    const locationBoundaries = this.getLocationBoundaries(
      latitude,
      longitude,
      customConfig,
    );
    const matches: LocationBoundary[] = [];

    // Check which boundaries the coordinates fall within
    for (const boundary of locationBoundaries) {
      if (this.isWithinBounds(latitude, longitude, boundary.bounds)) {
        matches.push(boundary);
      }
    }

    // Sort by priority (lower number = higher priority)
    matches.sort((a, b) => a.priority - b.priority);

    const result: any = { priority: 999 }; // Default to lowest priority

    // Assign the highest priority match
    if (matches.length > 0) {
      const highestPriority = matches[0];
      result.priority = highestPriority.priority;

      switch (highestPriority.type) {
        case 'district':
          result.district = highestPriority.name;
          result.state = highestPriority.parentLocation?.state;
          result.country = highestPriority.parentLocation?.country;
          break;
        case 'state':
          result.state = highestPriority.name;
          result.country = highestPriority.parentLocation?.country;
          break;
        case 'country':
          result.country = highestPriority.name;
          break;
      }
    } else {
      // If no matches, default to the configured country
      const config = customConfig || this.defaultConfig;
      result.country = config.country;
      result.priority = 3;
    }

    return result;
  }

  /**
   * Check if coordinates are within given bounds
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param bounds - Geographic bounds
   * @returns boolean indicating if coordinates are within bounds
   */
  private isWithinBounds(
    latitude: number,
    longitude: number,
    bounds: { north: number; south: number; east: number; west: number },
  ): boolean {
    return (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    );
  }

  /**
   * Get MongoDB aggregation pipeline stages for intelligent location filtering
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param radiusKm - Search radius in kilometers (default: 50km)
   * @returns Array of MongoDB aggregation stages
   */
  getLocationAggregationPipeline(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
  ): any[] {
    const pipeline: any[] = [];

    // First, determine which state the coordinates fall within
    const locationBoundaries = this.getLocationBoundaries(latitude, longitude);
    const stateBoundary = locationBoundaries.find((b) => b.type === 'state');

    // Add distance calculation for all ads
    pipeline.push({
      $addFields: {
        distance: {
          $let: {
            vars: {
              latDiff: { $abs: { $subtract: ['$latitude', latitude] } },
              lonDiff: { $abs: { $subtract: ['$longitude', longitude] } },
            },
            in: {
              $multiply: [
                111.32, // Approximate km per degree at equator
                { $add: ['$$latDiff', '$$lonDiff'] }, // Manhattan distance
              ],
            },
          },
        },
      },
    });

    // Apply intelligent filtering based on state boundaries
    if (stateBoundary) {
      // If coordinates fall within a known state, return all ads in that state
      // But if custom distance is provided (for fallback), use distance-based filtering instead
      if (radiusKm !== 50) {
        // Custom distance provided - use distance-based filtering even within state
        pipeline.push({
          $match: {
            $and: [
              { latitude: { $exists: true, $ne: null } },
              { longitude: { $exists: true, $ne: null } },
              { distance: { $lte: radiusKm } },
            ],
          },
        });
      } else {
        // Default behavior - return all ads in the state
        pipeline.push({
          $match: {
            $or: [
              // Ads with coordinates within state bounds
              {
                $and: [
                  { latitude: { $exists: true, $ne: null } },
                  { longitude: { $exists: true, $ne: null } },
                  {
                    $and: [
                      {
                        $gte: ['$latitude', stateBoundary.bounds.south],
                      },
                      {
                        $lte: ['$latitude', stateBoundary.bounds.north],
                      },
                      {
                        $gte: ['$longitude', stateBoundary.bounds.west],
                      },
                      {
                        $lte: ['$longitude', stateBoundary.bounds.east],
                      },
                    ],
                  },
                ],
              },
              // Ads with state name in location text
              {
                location: { $regex: stateBoundary.name, $options: 'i' },
              },
            ],
          },
        });
      }
    } else {
      // If coordinates don't fall within a known state, use radius-based filtering
      pipeline.push({
        $match: {
          $and: [
            { latitude: { $exists: true, $ne: null } },
            { longitude: { $exists: true, $ne: null } },
            { distance: { $lte: radiusKm } },
          ],
        },
      });
    }

    return pipeline;
  }

  /**
   * Add intelligent location scoring to aggregation pipeline
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns MongoDB aggregation stage for location scoring
   */
  getLocationScoringStage(latitude: number, longitude: number): any {
    const locationBoundaries = this.getLocationBoundaries(latitude, longitude);
    const stateBoundary = locationBoundaries.find((b) => b.type === 'state');

    return {
      $addFields: {
        locationScore: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$latitude', null] },
                { $ne: ['$longitude', null] },
                { $ne: ['$distance', null] },
              ],
            },
            then: {
              $cond: {
                if: stateBoundary
                  ? {
                      // Check if ad is within the same state
                      $and: [
                        {
                          $gte: ['$latitude', stateBoundary.bounds.south],
                        },
                        {
                          $lte: ['$latitude', stateBoundary.bounds.north],
                        },
                        {
                          $gte: ['$longitude', stateBoundary.bounds.west],
                        },
                        {
                          $lte: ['$longitude', stateBoundary.bounds.east],
                        },
                      ],
                    }
                  : false,
                then: {
                  // Higher score for ads in the same state, prioritized by distance
                  $round: [
                    {
                      $add: [
                        1000, // Base score for same state
                        {
                          $subtract: [
                            100, // Distance bonus
                            {
                              $multiply: ['$distance', 1], // Subtract 1 point per km
                            },
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },
                else: {
                  // Lower score for ads outside the state, still distance-based
                  $round: [
                    {
                      $subtract: [
                        100, // Base score for different state
                        {
                          $multiply: ['$distance', 2], // Subtract 2 points per km
                        },
                      ],
                    },
                    2,
                  ],
                },
              },
            },
            else: 0, // No location data
          },
        },
      },
    };
  }

  /**
   * Update the default location configuration
   * @param config - New location hierarchy configuration
   */
  updateDefaultConfig(config: LocationHierarchyConfig): void {
    this.defaultConfig = config;
    this.logger.log(
      `Updated default location config: ${config.district}, ${config.state}, ${config.country}`,
    );
  }

  /**
   * Get the current default configuration
   * @returns Current default configuration
   */
  getDefaultConfig(): LocationHierarchyConfig {
    return { ...this.defaultConfig };
  }
}
