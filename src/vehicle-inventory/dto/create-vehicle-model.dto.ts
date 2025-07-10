import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

export class CreateVehicleModelDto {
  @ApiProperty({
    description: 'The unique name of the vehicle model.',
    example: 'swift',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The display name of the vehicle model.',
    example: 'Swift',
  })
  @IsString()
  displayName: string;

  @ApiProperty({
    description: 'The ID of the manufacturer this model belongs to.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  manufacturer: string;

  @ApiProperty({
    description: 'The type of vehicle.',
    enum: VehicleTypes,
    example: VehicleTypes.HATCHBACK,
  })
  @IsEnum(VehicleTypes)
  vehicleType: VehicleTypes;

  @ApiProperty({
    description: 'Description of the vehicle model.',
    example: 'Popular hatchback with excellent fuel efficiency',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Year when the model was launched.',
    example: 2005,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  launchYear?: number;

  @ApiProperty({
    description: 'Vehicle segment (A, B, C, D, E).',
    example: 'B',
    required: false,
  })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiProperty({
    description: 'Body type of the vehicle.',
    example: 'Hatchback',
    required: false,
  })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiProperty({
    description: 'Array of image URLs for the model.',
    example: [
      'https://example.com/swift1.jpg',
      'https://example.com/swift2.jpg',
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'URL to the model brochure.',
    example: 'https://example.com/swift-brochure.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  brochureUrl?: string;

  // Commercial vehicle metadata fields
  @ApiProperty({
    description: 'Whether this is a commercial vehicle model.',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isCommercialVehicle?: boolean;

  @ApiProperty({
    description: 'Commercial vehicle type (if applicable).',
    example: 'truck',
    required: false,
    enum: ['truck', 'bus', 'van', 'tractor', 'trailer', 'forklift'],
  })
  @IsOptional()
  @IsString()
  commercialVehicleType?: string;

  @ApiProperty({
    description: 'Commercial body type (if applicable).',
    example: 'flatbed',
    required: false,
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

  @ApiProperty({
    description: 'Default payload capacity for commercial vehicles.',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  defaultPayloadCapacity?: number;

  @ApiProperty({
    description: 'Default payload unit for commercial vehicles.',
    example: 'kg',
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultPayloadUnit?: string;

  @ApiProperty({
    description: 'Default number of axles for commercial vehicles.',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  defaultAxleCount?: number;

  @ApiProperty({
    description: 'Default seating capacity for commercial vehicles.',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  defaultSeatingCapacity?: number;

  @ApiProperty({
    description: 'Whether the model is active.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
