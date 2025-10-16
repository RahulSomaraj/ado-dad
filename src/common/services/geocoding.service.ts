import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocodingResult {
  location: string;
  city?: string;
  state?: string;
  country?: string;
  formattedAddress?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly googleMapsApiKey: string;

  constructor(private configService: ConfigService) {
    this.googleMapsApiKey =
      this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
  }

  /**
   * Convert latitude and longitude to a human-readable location string
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Promise<GeocodingResult> - Location information
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodingResult> {
    try {
      if (!this.googleMapsApiKey) {
        this.logger.warn(
          'Google Maps API key not configured, using fallback location',
        );
        return this.getFallbackLocation(latitude, longitude);
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.googleMapsApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components || [];

        // Extract location components
        let city = '';
        let state = '';
        let country = '';

        for (const component of addressComponents) {
          const types = component.types;
          if (
            types.includes('locality') ||
            types.includes('administrative_area_level_2')
          ) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          }
        }

        // Create a readable location string
        const locationParts = [city, state, country].filter(Boolean);
        const location = locationParts.join(', ');

        return {
          location,
          city,
          state,
          country,
          formattedAddress: result.formatted_address,
        };
      } else {
        this.logger.warn(`Geocoding failed: ${data.status}`, {
          latitude,
          longitude,
        });
        return this.getFallbackLocation(latitude, longitude);
      }
    } catch (error) {
      this.logger.error('Error in reverse geocoding', error);
      return this.getFallbackLocation(latitude, longitude);
    }
  }

  /**
   * Fallback method when geocoding service is unavailable
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns GeocodingResult - Basic location info
   */
  private getFallbackLocation(
    latitude: number,
    longitude: number,
  ): GeocodingResult {
    // Simple fallback - just return coordinates
    return {
      location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
    };
  }

  /**
   * Batch reverse geocoding for multiple coordinates
   * @param coordinates - Array of {latitude, longitude} objects
   * @returns Promise<GeocodingResult[]> - Array of location information
   */
  async batchReverseGeocode(
    coordinates: Array<{ latitude: number; longitude: number }>,
  ): Promise<GeocodingResult[]> {
    const results: GeocodingResult[] = [];

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize);
      const batchPromises = batch.map((coord) =>
        this.reverseGeocode(coord.latitude, coord.longitude),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add small delay between batches to respect rate limits
      if (i + batchSize < coordinates.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}
