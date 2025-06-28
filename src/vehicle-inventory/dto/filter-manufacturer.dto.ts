import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterManufacturerDto {
  @ApiPropertyOptional({
    description: 'Search manufacturers by name, display name, or description',
    example: 'honda',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by origin country',
    example: 'Japan',
  })
  @IsOptional()
  @IsString()
  originCountry?: string;

  @ApiPropertyOptional({
    description: 'Filter by founded year (minimum)',
    example: 1900,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  minFoundedYear?: number;

  @ApiPropertyOptional({
    description: 'Filter by founded year (maximum)',
    example: 2000,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  maxFoundedYear?: number;

  @ApiPropertyOptional({
    description: 'Filter by headquarters location',
    example: 'Tokyo',
  })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: [
      'name',
      'displayName',
      'originCountry',
      'foundedYear',
      'headquarters',
      'createdAt',
      'updatedAt',
    ],
    example: 'name',
  })
  @IsOptional()
  @IsIn([
    'name',
    'displayName',
    'originCountry',
    'foundedYear',
    'headquarters',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by manufacturer type/category',
    enum: [
      'passenger_car',
      'two_wheeler',
      'commercial_vehicle',
      'luxury',
      'suv',
    ],
    example: 'passenger_car',
  })
  @IsOptional()
  @IsIn(['passenger_car', 'two_wheeler', 'commercial_vehicle', 'luxury', 'suv'])
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by region',
    enum: [
      'Asia',
      'Europe',
      'North America',
      'South America',
      'Africa',
      'Oceania',
    ],
    example: 'Asia',
  })
  @IsOptional()
  @IsIn([
    'Asia',
    'Europe',
    'North America',
    'South America',
    'Africa',
    'Oceania',
  ])
  region?: string;
}
