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
}

export interface LocationFilter {
  district?: string;
  state?: string;
  country?: string;
  priority: number;
}

@Injectable()
export class LocationHierarchyService {
  private readonly logger = new Logger(LocationHierarchyService.name);

  // Define location boundaries for Kerala, India, and Pathanamthitta
  private readonly locationBoundaries: LocationBoundary[] = [
    {
      name: 'Pathanamthitta',
      type: 'district',
      bounds: {
        north: 9.5,
        south: 9.0,
        east: 77.2,
        west: 76.7,
      },
      priority: 1, // Highest priority
    },
    {
      name: 'Kerala',
      type: 'state',
      bounds: {
        north: 12.8,
        south: 8.2,
        east: 77.3,
        west: 74.9,
      },
      priority: 2, // Medium priority
    },
    {
      name: 'India',
      type: 'country',
      bounds: {
        north: 37.1,
        south: 6.4,
        east: 97.4,
        west: 68.2,
      },
      priority: 3, // Lowest priority
    },
  ];

  /**
   * Determine location hierarchy and filter criteria based on coordinates
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns LocationFilter with hierarchical boundaries
   */
  getLocationFilter(latitude: number, longitude: number): LocationFilter {
    const location = this.determineLocation(latitude, longitude);

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
   * @returns Location information with priority
   */
  private determineLocation(
    latitude: number,
    longitude: number,
  ): {
    district?: string;
    state?: string;
    country?: string;
    priority: number;
  } {
    const matches: LocationBoundary[] = [];

    // Check which boundaries the coordinates fall within
    for (const boundary of this.locationBoundaries) {
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
          result.state = 'Kerala'; // Pathanamthitta is in Kerala
          result.country = 'India';
          break;
        case 'state':
          result.state = highestPriority.name;
          result.country = 'India';
          break;
        case 'country':
          result.country = highestPriority.name;
          break;
      }
    } else {
      // If no matches, default to India
      result.country = 'India';
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
   * @returns Array of MongoDB aggregation stages
   */
  getLocationAggregationPipeline(latitude: number, longitude: number): any[] {
    const locationFilter = this.getLocationFilter(latitude, longitude);
    const pipeline: any[] = [];

    // Add location-based match stages based on priority
    if (locationFilter.district) {
      // Highest priority: Filter by district (Pathanamthitta)
      pipeline.push({
        $match: {
          $or: [
            // Exact district match
            { location: { $regex: locationFilter.district, $options: 'i' } },
            // Or coordinates within district bounds
            {
              latitude: {
                $gte: this.locationBoundaries[0].bounds.south,
                $lte: this.locationBoundaries[0].bounds.north,
              },
              longitude: {
                $gte: this.locationBoundaries[0].bounds.west,
                $lte: this.locationBoundaries[0].bounds.east,
              },
            },
          ],
        },
      });
    } else if (locationFilter.state) {
      // Medium priority: Filter by state (Kerala)
      pipeline.push({
        $match: {
          $or: [
            // State name in location
            { location: { $regex: locationFilter.state, $options: 'i' } },
            // Or coordinates within state bounds
            {
              latitude: {
                $gte: this.locationBoundaries[1].bounds.south,
                $lte: this.locationBoundaries[1].bounds.north,
              },
              longitude: {
                $gte: this.locationBoundaries[1].bounds.west,
                $lte: this.locationBoundaries[1].bounds.east,
              },
            },
          ],
        },
      });
    } else if (locationFilter.country) {
      // Lowest priority: Filter by country (India)
      pipeline.push({
        $match: {
          $or: [
            // Country name in location
            { location: { $regex: locationFilter.country, $options: 'i' } },
            // Or coordinates within country bounds
            {
              latitude: {
                $gte: this.locationBoundaries[2].bounds.south,
                $lte: this.locationBoundaries[2].bounds.north,
              },
              longitude: {
                $gte: this.locationBoundaries[2].bounds.west,
                $lte: this.locationBoundaries[2].bounds.east,
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
   * @returns MongoDB aggregation stage for location scoring
   */
  getLocationScoringStage(latitude: number, longitude: number): any {
    const locationFilter = this.getLocationFilter(latitude, longitude);

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
                          $gte: [
                            '$latitude',
                            this.locationBoundaries[0].bounds.south,
                          ],
                        },
                        {
                          $lte: [
                            '$latitude',
                            this.locationBoundaries[0].bounds.north,
                          ],
                        },
                        {
                          $gte: [
                            '$longitude',
                            this.locationBoundaries[0].bounds.west,
                          ],
                        },
                        {
                          $lte: [
                            '$longitude',
                            this.locationBoundaries[0].bounds.east,
                          ],
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
                          $gte: [
                            '$latitude',
                            this.locationBoundaries[1].bounds.south,
                          ],
                        },
                        {
                          $lte: [
                            '$latitude',
                            this.locationBoundaries[1].bounds.north,
                          ],
                        },
                        {
                          $gte: [
                            '$longitude',
                            this.locationBoundaries[1].bounds.west,
                          ],
                        },
                        {
                          $lte: [
                            '$longitude',
                            this.locationBoundaries[1].bounds.east,
                          ],
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
                          $gte: [
                            '$latitude',
                            this.locationBoundaries[2].bounds.south,
                          ],
                        },
                        {
                          $lte: [
                            '$latitude',
                            this.locationBoundaries[2].bounds.north,
                          ],
                        },
                        {
                          $gte: [
                            '$longitude',
                            this.locationBoundaries[2].bounds.west,
                          ],
                        },
                        {
                          $lte: [
                            '$longitude',
                            this.locationBoundaries[2].bounds.east,
                          ],
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
}
