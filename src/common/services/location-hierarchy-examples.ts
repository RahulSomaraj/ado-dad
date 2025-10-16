import { LocationHierarchyConfig } from './location-hierarchy.service';

/**
 * Example configurations for different countries, states, and districts
 * These can be used to configure the LocationHierarchyService for different regions
 */

// Example 1: India - Kerala - Pathanamthitta (Default)
export const INDIA_KERALA_PATHANAMTHITTA: LocationHierarchyConfig = {
  country: 'India',
  state: 'Kerala',
  district: 'Pathanamthitta',
  bounds: {
    country: { north: 37.1, south: 6.4, east: 97.4, west: 68.2 },
    state: { north: 12.8, south: 8.2, east: 77.3, west: 74.9 },
    district: { north: 9.5, south: 9.0, east: 77.2, west: 76.7 },
  },
};

// Example 2: India - Maharashtra - Mumbai
export const INDIA_MAHARASHTRA_MUMBAI: LocationHierarchyConfig = {
  country: 'India',
  state: 'Maharashtra',
  district: 'Mumbai',
  bounds: {
    country: { north: 37.1, south: 6.4, east: 97.4, west: 68.2 },
    state: { north: 22.0, south: 15.6, east: 80.9, west: 72.6 },
    district: { north: 19.3, south: 18.9, east: 73.0, west: 72.8 },
  },
};

// Example 3: India - Tamil Nadu - Chennai
export const INDIA_TAMIL_NADU_CHENNAI: LocationHierarchyConfig = {
  country: 'India',
  state: 'Tamil Nadu',
  district: 'Chennai',
  bounds: {
    country: { north: 37.1, south: 6.4, east: 97.4, west: 68.2 },
    state: { north: 13.1, south: 8.1, east: 80.3, west: 76.2 },
    district: { north: 13.2, south: 12.8, east: 80.3, west: 80.1 },
  },
};

// Example 4: USA - California - Los Angeles
export const USA_CALIFORNIA_LOS_ANGELES: LocationHierarchyConfig = {
  country: 'United States',
  state: 'California',
  district: 'Los Angeles',
  bounds: {
    country: { north: 49.0, south: 24.5, east: -66.9, west: -125.0 },
    state: { north: 42.0, south: 32.5, east: -114.1, west: -124.4 },
    district: { north: 34.3, south: 33.7, east: -118.0, west: -118.7 },
  },
};

// Example 5: USA - New York - New York City
export const USA_NEW_YORK_NYC: LocationHierarchyConfig = {
  country: 'United States',
  state: 'New York',
  district: 'New York City',
  bounds: {
    country: { north: 49.0, south: 24.5, east: -66.9, west: -125.0 },
    state: { north: 45.0, south: 40.5, east: -71.9, west: -79.8 },
    district: { north: 40.9, south: 40.5, east: -73.7, west: -74.3 },
  },
};

// Example 6: UK - England - London
export const UK_ENGLAND_LONDON: LocationHierarchyConfig = {
  country: 'United Kingdom',
  state: 'England',
  district: 'London',
  bounds: {
    country: { north: 60.9, south: 49.9, east: 1.8, west: -8.2 },
    state: { north: 55.8, south: 49.9, east: 1.8, west: -5.7 },
    district: { north: 51.7, south: 51.3, east: 0.3, west: -0.5 },
  },
};

// Example 7: Australia - New South Wales - Sydney
export const AUSTRALIA_NSW_SYDNEY: LocationHierarchyConfig = {
  country: 'Australia',
  state: 'New South Wales',
  district: 'Sydney',
  bounds: {
    country: { north: -10.7, south: -43.6, east: 153.6, west: 113.3 },
    state: { north: -28.2, south: -37.5, east: 153.6, west: 141.0 },
    district: { north: -33.6, south: -34.0, east: 151.3, west: 150.7 },
  },
};

// Example 8: Canada - Ontario - Toronto
export const CANADA_ONTARIO_TORONTO: LocationHierarchyConfig = {
  country: 'Canada',
  state: 'Ontario',
  district: 'Toronto',
  bounds: {
    country: { north: 83.1, south: 41.7, east: -52.6, west: -141.0 },
    state: { north: 56.9, south: 41.7, east: -74.3, west: -95.2 },
    district: { north: 43.8, south: 43.6, east: -79.1, west: -79.6 },
  },
};

/**
 * Usage Examples:
 *
 * 1. To use with Mumbai, India:
 *    locationHierarchyService.updateDefaultConfig(INDIA_MAHARASHTRA_MUMBAI);
 *
 * 2. To use with Los Angeles, USA:
 *    locationHierarchyService.updateDefaultConfig(USA_CALIFORNIA_LOS_ANGELES);
 *
 * 3. To use with custom configuration in API call:
 *    const pipeline = locationHierarchyService.getLocationAggregationPipeline(
 *      latitude, longitude, INDIA_TAMIL_NADU_CHENNAI
 *    );
 */
