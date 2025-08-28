import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

export class UpdateVehicleModelDto {
  @ApiPropertyOptional({
    description: 'The unique name of the vehicle model.',
    example: 'swift',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The display name of the vehicle model.',
    example: 'Swift',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'The ID of the manufacturer this model belongs to.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({
    description: 'The type of vehicle.',
    enum: VehicleTypes,
    example: VehicleTypes.HATCHBACK,
  })
  @IsOptional()
  @IsEnum(VehicleTypes)
  vehicleType?: VehicleTypes;

  @ApiPropertyOptional({
    description: 'Description of the vehicle model.',
    example: 'Popular hatchback with excellent fuel efficiency',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Year when the model was launched.',
    example: 2005,
  })
  @IsOptional()
  @IsNumber()
  launchYear?: number;

  @ApiPropertyOptional({
    description: 'Vehicle segment (A, B, C, D, E).',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({
    description: 'Body type of the vehicle.',
    example: 'Hatchback',
  })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({
    description: 'Array of image URLs for the model.',
    example: [
      'https://example.com/swift1.jpg',
      'https://example.com/swift2.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'URL to the model brochure.',
    example: 'https://example.com/swift-brochure.pdf',
  })
  @IsOptional()
  @IsString()
  brochureUrl?: string;

  // Commercial vehicle metadata fields
  @ApiPropertyOptional({
    description: 'Whether this is a commercial vehicle model.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCommercialVehicle?: boolean;

  @ApiPropertyOptional({
    description: 'Commercial vehicle type (if applicable).',
    example: 'truck',
    enum: ['truck', 'bus', 'van', 'tractor', 'trailer', 'forklift'],
  })
  @IsOptional()
  @IsString()
  commercialVehicleType?: string;

  @ApiPropertyOptional({
    description: 'Commercial body type (if applicable).',
    example: 'flatbed',
    enum: [
      'flatbed',
      'container',
      'refrigerated',
      'tanker',
      'dump',
      'pickup',
      'box',
      'passenger',
    ],
  })
  @IsOptional()
  @IsString()
  commercialBodyType?: string;

  @ApiPropertyOptional({
    description: 'Default payload capacity for commercial vehicles.',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  defaultPayloadCapacity?: number;

  @ApiPropertyOptional({
    description: 'Default payload unit for commercial vehicles.',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  defaultPayloadUnit?: string;

  @ApiPropertyOptional({
    description: 'Default number of axles for commercial vehicles.',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  defaultAxleCount?: number;

  @ApiPropertyOptional({
    description: 'Default seating capacity for commercial vehicles.',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  defaultSeatingCapacity?: number;

  @ApiPropertyOptional({
    description: 'Whether the model is active.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Array of available fuel types for this model.',
    example: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fuelTypes?: string[];

  @ApiPropertyOptional({
    description: 'Array of available transmission types for this model.',
    example: ['Manual', 'Automatic', 'CVT', 'DCT'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transmissionTypes?: string[];
}
