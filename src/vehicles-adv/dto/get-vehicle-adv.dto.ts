import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

/**
 * Filters for AdditionalInfo fields within each vehicle model.
 */
export class FindAdditionalAdvInfoDto {
  @ApiPropertyOptional({ example: 'Red', description: 'Vehicle color' })
  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * Filters for properties inside a vehicle model.
 */
export class FindVehicleModelDto {
  @ApiPropertyOptional({
    example: 'Model X',
    description: 'Vehicle model variant name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'X1',
    description: 'Vehicle model code/name',
  })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({
    example: 'Latest model details',
    description: 'Additional details about the vehicle model',
  })
  @IsOptional()
  @IsString()
  modelDetails?: string;

  @ApiPropertyOptional({
    example: 'Petrol',
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    description: 'Fuel type',
  })
  @IsOptional()
  @IsEnum(['Petrol', 'Diesel', 'Electric', 'Hybrid'])
  fuelType?: string;

  @ApiPropertyOptional({
    example: 'Automatic',
    enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
    description: 'Transmission type',
  })
  @IsOptional()
  @IsEnum(['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'])
  transmissionType?: string;

  @ApiPropertyOptional({
    type: FindAdditionalAdvInfoDto,
    description: 'Filter for additional info',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FindAdditionalAdvInfoDto)
  additionalInfo?: FindAdditionalAdvInfoDto;
}

/**
 * Main DTO for searching vehicles.
 */
export class FindVehicleAdvDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '60f6a4c1234567890abcdef1',
    description: 'Vendor ID for AdditionalInfo',
  })
  @IsOptional()
  @IsMongoId()
  vendor?: string;

  @ApiPropertyOptional({ example: 'Toyota', description: 'Vehicle brand name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Camry', description: 'Vehicle model name' })
  @IsOptional()
  @IsString()
  modelName?: string;

  // Filtering by details fields (which are stored in the "details" sub-document)
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  modelYear?: number;

  // Nested filter for vehicle models
  @ApiPropertyOptional({
    type: FindVehicleModelDto,
    description: 'Filter based on vehicle model properties',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FindVehicleModelDto)
  vehicleModel?: FindVehicleModelDto;
}
