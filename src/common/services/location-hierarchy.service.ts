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
   * Get MongoDB aggregation pipeline stages for location-based filtering
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param customConfig - Optional custom configuration
   * @returns Array of MongoDB aggregation stages
   */
  getLocationAggregationPipeline(
    latitude: number,
    longitude: number,
    customConfig?: LocationHierarchyConfig,
  ): any[] {
    const locationFilter = this.getLocationFilter(
      latitude,
      longitude,
      customConfig,
    );
    const locationBoundaries = this.getLocationBoundaries(
      latitude,
      longitude,
      customConfig,
    );
    const pipeline: any[] = [];

    // Add location-based match stages based on priority
    if (locationFilter.district) {
      // Highest priority: Filter by district
      const districtBoundary = locationBoundaries.find(
        (b) => b.type === 'district',
      );
      pipeline.push({
        $match: {
          $or: [
            // Exact district match
            { location: { $regex: locationFilter.district, $options: 'i' } },
            // Or coordinates within district bounds
            {
              latitude: {
                $gte: districtBoundary?.bounds.south,
                $lte: districtBoundary?.bounds.north,
              },
              longitude: {
                $gte: districtBoundary?.bounds.west,
                $lte: districtBoundary?.bounds.east,
              },
            },
          ],
        },
      });
    } else if (locationFilter.state) {
      // Medium priority: Filter by state
      const stateBoundary = locationBoundaries.find((b) => b.type === 'state');
      pipeline.push({
        $match: {
          $or: [
            // State name in location
            { location: { $regex: locationFilter.state, $options: 'i' } },
            // Or coordinates within state bounds
            {
              latitude: {
                $gte: stateBoundary?.bounds.south,
                $lte: stateBoundary?.bounds.north,
              },
              longitude: {
                $gte: stateBoundary?.bounds.west,
                $lte: stateBoundary?.bounds.east,
              },
            },
          ],
        },
      });
    } else if (locationFilter.country) {
      // Lowest priority: Filter by country
      const countryBoundary = locationBoundaries.find(
        (b) => b.type === 'country',
      );
      pipeline.push({
        $match: {
          $or: [
            // Country name in location
            { location: { $regex: locationFilter.country, $options: 'i' } },
            // Or coordinates within country bounds
            {
              latitude: {
                $gte: countryBoundary?.bounds.south,
                $lte: countryBoundary?.bounds.north,
              },
              longitude: {
                $gte: countryBoundary?.bounds.west,
                $lte: countryBoundary?.bounds.east,
              },
            },
          ],
        },
      });
    }

    return pipeline;
  }

  /**
   * Add location priority scoring to aggregation pipeline
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param customConfig - Optional custom configuration
   * @returns MongoDB aggregation stage for location scoring
   */
  getLocationScoringStage(
    latitude: number,
    longitude: number,
    customConfig?: LocationHierarchyConfig,
  ): any {
    const locationBoundaries = this.getLocationBoundaries(
      latitude,
      longitude,
      customConfig,
    );
    const districtBoundary = locationBoundaries.find(
      (b) => b.type === 'district',
    );
    const stateBoundary = locationBoundaries.find((b) => b.type === 'state');
    const countryBoundary = locationBoundaries.find(
      (b) => b.type === 'country',
    );

    return {
      $addFields: {
        locationScore: {
          $switch: {
            branches: [
              // District match gets highest score
              {
                when: {
                  $and: [
                    { $ne: ['$latitude', null] },
                    { $ne: ['$longitude', null] },
                    {
                      $and: [
                        {
                          $gte: ['$latitude', districtBoundary?.bounds.south],
                        },
                        {
                          $lte: ['$latitude', districtBoundary?.bounds.north],
                        },
                        {
                          $gte: ['$longitude', districtBoundary?.bounds.west],
                        },
                        {
                          $lte: ['$longitude', districtBoundary?.bounds.east],
                        },
                      ],
                    },
                  ],
                },
                then: 100, // Highest score for district match
              },
              // State match gets medium score
              {
                when: {
                  $and: [
                    { $ne: ['$latitude', null] },
                    { $ne: ['$longitude', null] },
                    {
                      $and: [
                        {
                          $gte: ['$latitude', stateBoundary?.bounds.south],
                        },
                        {
                          $lte: ['$latitude', stateBoundary?.bounds.north],
                        },
                        {
                          $gte: ['$longitude', stateBoundary?.bounds.west],
                        },
                        {
                          $lte: ['$longitude', stateBoundary?.bounds.east],
                        },
                      ],
                    },
                  ],
                },
                then: 50, // Medium score for state match
              },
              // Country match gets low score
              {
                when: {
                  $and: [
                    { $ne: ['$latitude', null] },
                    { $ne: ['$longitude', null] },
                    {
                      $and: [
                        {
                          $gte: ['$latitude', countryBoundary?.bounds.south],
                        },
                        {
                          $lte: ['$latitude', countryBoundary?.bounds.north],
                        },
                        {
                          $gte: ['$longitude', countryBoundary?.bounds.west],
                        },
                        {
                          $lte: ['$longitude', countryBoundary?.bounds.east],
                        },
                      ],
                    },
                  ],
                },
                then: 10, // Low score for country match
              },
            ],
            default: 0, // No location match
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
