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
    description:
      'Search manufacturers by name, display name, description, or vehicle category',
    example: 'honda',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;

    const str = String(value).toLowerCase();
    if (str === 'true' || str === '1') return true;
    if (str === 'false' || str === '0') return false;

    return undefined;
  })
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
    description:
      'Filter by vehicle category (vehicleCategory field). Filters manufacturers that match the specified category.',
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
}
