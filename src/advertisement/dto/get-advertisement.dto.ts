import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleTypes } from 'src/vehicles/enum/vehicle.type';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class VehicleFilterDto {
  @ApiPropertyOptional({ description: 'Vehicle name', example: 'Toyota' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Vehicle model name', example: 'Camry' })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({
    description: 'Fuel type',
    example: 'Petrol',
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
  })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({
    description: 'Transmission type',
    example: 'Automatic',
    enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
  })
  @IsOptional()
  @IsString()
  transmissionType?: string;

  @ApiPropertyOptional({
    description: 'Mileage (e.g., 15km/l)',
    example: '15km/l',
  })
  @IsOptional()
  @IsString()
  mileage?: string;
}

export class FindAdvertisementsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Advertisement type (Vehicle or Property)',
    example: 'Vehicle',
  })
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

  @ApiPropertyOptional({
    description: 'Vendor name filter',
    example: 'Toyota Motors',
  })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Nested vehicle filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleFilterDto)
  vehicle?: VehicleFilterDto;
}
