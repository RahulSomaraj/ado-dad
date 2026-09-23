import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsIn,
  IsBoolean,
  Min,
  Max,
  IsArray,
  IsMongoId,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AdCategoryV2 } from './create-ad-v2.dto';
import { AdListingType } from '../../ads/schemas/property-ad.schema';

export class ListAdsV2Dto {
  @ApiPropertyOptional({
    description: 'Advertisement category to filter by',
    enum: AdCategoryV2,
    example: AdCategoryV2.PROPERTY,
  })
  @IsOptional()
  @IsEnum(AdCategoryV2)
  category?: AdCategoryV2;

  @ApiPropertyOptional({
    description:
      'Free-text search. Understood the way people type it: brand, model, variant, fuel, ' +
      'transmission, year, budget, BHK and place names become structured filters or ranking ' +
      'boosts (typos are corrected against the catalogue), and the words are always also ' +
      'matched against the ad text. The response `query` block shows the interpretation ' +
      '(chips, corrections, conflicts). Max 120 characters. Requires SEARCH_V3_RETRIEVAL on ' +
      'the server; otherwise the legacy title/description match runs.',
    example: 'hyundai creta 2020 petrol in kollam',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Location filter (text-based)',
    example: 'Mumbai',
  })
  @IsOptional()
  @IsString()
  location?: string;

  // Geographic location filters
  @ApiPropertyOptional({
    description:
      'Latitude for geographic filtering (searches within 10km radius)',
    example: 19.076,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description:
      'Longitude for geographic filtering (searches within 10km radius)',
    example: 72.8777,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description:
      'Explicit search radius in km for geo queries. When provided, overrides the automatic distance fallback and returns ads within this radius (nearest first). The client widens this across pages to load progressively farther ads.',
    minimum: 1,
    maximum: 5000,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5000)
  maxDistance?: number;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    minimum: 0,
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    minimum: 0,
    example: 1000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination (ignored when cursor is provided)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description:
      'Cursor for cursor-based pagination (recommended for large datasets). When provided, returns nextCursor for the next page instead of using page/skip.',
    example: '65b123fa1a2b3c4d5e6f7890',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Sort field. Feed: createdAt (default), updatedAt, price, title. ' +
      'Search (with `search`): the default is scored relevance (nearby, recent, best match); ' +
      'send `newest` for newest-first, `price`, `year` or `distance` for explicit orders. ' +
      '`relevance` is accepted as an explicit alias of the default. Cursor pagination is not ' +
      'available on scored searches; use page/limit (max page 50).',
    enum: ['createdAt', 'updatedAt', 'price', 'title', 'relevance', 'newest', 'year', 'distance'],
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'price', 'title', 'relevance', 'newest', 'year', 'distance'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description:
      'Whether to run the extra count aggregation that populates `total` and `totalPages`. Set false for infinite-scroll clients, which only need `hasNext` — this removes a second full aggregation (including a repeat of $geoNear when coordinates are supplied) from every request.',
    default: true,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  includeTotal?: boolean = true;

  @ApiPropertyOptional({
    description:
      'Commercial vehicle types filter (multi-select). Works for any category: returns only ads that have commercial vehicle details with type in this list (e.g. truck, van, bus).',
    type: [String],
    example: ['truck', 'van', 'bus'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commercialVehicleTypes?: string[];

  // Two-wheeler specific filters
  @ApiPropertyOptional({
    description:
      'Fuel type IDs for vehicle filtering (works for private_vehicle, commercial_vehicle, two_wheeler categories)',
    type: [String],
    example: ['68b53a26933e8b3908eb5448', '68b53a26933e8b3908eb5449'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  fuelTypeIds?: string[];

  @ApiPropertyOptional({
    description:
      'Transmission type IDs for vehicle filtering (works for private_vehicle, commercial_vehicle, two_wheeler categories)',
    type: [String],
    example: ['68b53a421f3fb49e93b9ef59', '68b53a421f3fb49e93b9ef60'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  transmissionTypeIds?: string[];

  // Vehicle specific filters (works for private_vehicle, commercial_vehicle, two_wheeler)
  @ApiPropertyOptional({
    description:
      'Manufacturer IDs for vehicle filtering (array of manufacturer IDs)',
    type: [String],
    example: ['68b53a26933e8b3908eb5448', '68b53a26933e8b3908eb5449'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  manufacturerIds?: string[];

  @ApiPropertyOptional({
    description: 'Model IDs for vehicle filtering (array of model IDs)',
    type: [String],
    example: ['68b53a26933e8b3908eb5449', '68b53a26933e8b3908eb5450'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  modelIds?: string[];

  @ApiPropertyOptional({
    description: 'Minimum year for vehicle filtering',
    example: 2020,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  minYear?: number;

  @ApiPropertyOptional({
    description: 'Maximum year for vehicle filtering',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  maxYear?: number;

  // Property-specific filters
  @ApiPropertyOptional({
    description: 'Property types to include',
    type: [String],
    example: ['apartment', 'house', 'villa'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyTypes?: string[];

  @ApiPropertyOptional({
    description: 'Listing type filter for property ads',
    enum: AdListingType,
    example: AdListingType.RENT,
  })
  @IsOptional()
  @IsEnum(AdListingType)
  listingType?: AdListingType;

  @ApiPropertyOptional({ description: 'Minimum bedrooms', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({ description: 'Maximum bedrooms', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional({ description: 'Minimum area (sqft)', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minArea?: number;

  @ApiPropertyOptional({ description: 'Maximum area (sqft)', example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxArea?: number;

  @ApiPropertyOptional({ description: 'Is furnished', example: true })
  @IsOptional()
  @Type(() => Boolean)
  isFurnished?: boolean;

  @ApiPropertyOptional({ description: 'Has parking', example: true })
  @IsOptional()
  @Type(() => Boolean)
  hasParking?: boolean;
}
