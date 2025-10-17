import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  Min,
  Max,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AdCategoryV2 } from './create-ad-v2.dto';

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
      'Enhanced search term across ad content and vehicle inventory details. Searches in: title, description, manufacturer names, model names, variant names, fuel types, and transmission types',
    example: 'honda civic automatic',
  })
  @IsOptional()
  @IsString()
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
    description: 'Page number for pagination',
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
    description: 'Sort field',
    enum: ['createdAt', 'updatedAt', 'price', 'title'],
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

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
