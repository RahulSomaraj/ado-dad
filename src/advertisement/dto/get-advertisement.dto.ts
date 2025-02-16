import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleTypes } from 'src/vehicles/enum/vehicle.type';

export class FindAdvertisementsDto {
  @ApiPropertyOptional({ description: 'Advertisement type', example: 'sale' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Advertisement category',
    example: 'electronics',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Property type', example: 'apartment' })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ description: 'Brand name', example: 'Samsung' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Minimum price', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sorting order', default: 'desc' })
  @IsOptional()
  @IsString()
  order: string = 'desc';

  @ApiPropertyOptional({
    description: 'Vehicle type filter',
    enum: VehicleTypes,
    example: VehicleTypes.SUV,
  })
  @IsOptional()
  @IsEnum(VehicleTypes)
  vehicleType?: VehicleTypes;
}
