import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VehicleFeaturesDto } from './vehicle-features.dto';

export class EngineSpecsDto {
  @ApiProperty({
    description: 'Engine capacity in cc.',
    example: 1200,
  })
  @IsNumber()
  capacity: number;

  @ApiProperty({
    description: 'Maximum power in bhp.',
    example: 88,
  })
  @IsNumber()
  maxPower: number;

  @ApiProperty({
    description: 'Maximum torque in Nm.',
    example: 113,
  })
  @IsNumber()
  maxTorque: number;

  @ApiProperty({
    description: 'Number of cylinders.',
    example: 4,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  cylinders?: number;

  @ApiProperty({
    description: 'Whether the engine is turbocharged.',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  turbocharged?: boolean;
}

export class PerformanceSpecsDto {
  @ApiProperty({
    description: 'Fuel efficiency in km/l or km/kWh for electric.',
    example: 22.38,
  })
  @IsNumber()
  mileage: number;

  @ApiProperty({
    description: '0-100 km/h acceleration time in seconds.',
    example: 12.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  acceleration?: number;

  @ApiProperty({
    description: 'Top speed in km/h.',
    example: 165,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  topSpeed?: number;

  @ApiProperty({
    description: 'Fuel tank capacity in liters or battery capacity in kWh.',
    example: 37,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  fuelCapacity?: number;
}

export class DimensionsDto {
  @ApiProperty({
    description: 'Vehicle length in mm.',
    example: 3840,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiProperty({
    description: 'Vehicle width in mm.',
    example: 1735,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({
    description: 'Vehicle height in mm.',
    example: 1530,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({
    description: 'Wheelbase in mm.',
    example: 2450,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  wheelbase?: number;

  @ApiProperty({
    description: 'Ground clearance in mm.',
    example: 163,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  groundClearance?: number;

  @ApiProperty({
    description: 'Boot space in liters.',
    example: 268,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  bootSpace?: number;
}

export class CreateVehicleVariantDto {
  @ApiProperty({
    description: 'The unique name of the variant.',
    example: 'swift-lxi-petrol-manual',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The display name of the variant.',
    example: 'Swift LXi Petrol Manual',
  })
  @IsString()
  displayName: string;

  @ApiProperty({
    description: 'The ID of the vehicle model this variant belongs to.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  vehicleModel: string;

  @ApiProperty({
    description: 'The ID of the fuel type.',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  fuelType: string;

  @ApiProperty({
    description: 'The ID of the transmission type.',
    example: '507f1f77bcf86cd799439013',
  })
  @IsString()
  transmissionType: string;

  @ApiProperty({
    description: 'The feature package/trim level.',
    example: 'LXI',
  })
  @IsString()
  featurePackage: string;

  @ApiProperty({
    description: 'Engine specifications.',
    type: EngineSpecsDto,
  })
  @ValidateNested()
  @Type(() => EngineSpecsDto)
  engineSpecs: EngineSpecsDto;

  @ApiProperty({
    description: 'Performance specifications.',
    type: PerformanceSpecsDto,
  })
  @ValidateNested()
  @Type(() => PerformanceSpecsDto)
  performanceSpecs: PerformanceSpecsDto;

  @ApiProperty({
    description: 'Vehicle dimensions.',
    type: DimensionsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiProperty({
    description: 'Seating capacity.',
    example: 5,
  })
  @IsNumber()
  seatingCapacity: number;

  @ApiProperty({
    description: 'Price in INR.',
    example: 550000,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Ex-showroom price in INR.',
    example: 520000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  exShowroomPrice?: number;

  @ApiProperty({
    description: 'On-road price in INR.',
    example: 620000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  onRoadPrice?: number;

  @ApiProperty({
    description: 'Available colors.',
    example: ['Pearl Arctic White', 'Solid Fire Red'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiProperty({
    description: 'Array of image URLs for the variant.',
    example: ['https://example.com/swift-lxi1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Description of the variant.',
    example: 'Base variant with essential features',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL to the variant brochure.',
    example: 'https://example.com/swift-lxi-brochure.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  brochureUrl?: string;

  @ApiProperty({
    description: 'URL to the variant video.',
    example: 'https://example.com/swift-lxi-video.mp4',
    required: false,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  // Comprehensive Vehicle Features
  @ApiProperty({
    description:
      'Comprehensive vehicle features including safety, comfort, technology, etc.',
    type: VehicleFeaturesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleFeaturesDto)
  features?: VehicleFeaturesDto;

  @ApiProperty({
    description: 'Whether the variant is active.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Whether the variant is launched.',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isLaunched?: boolean;

  @ApiProperty({
    description: 'Launch date of the variant.',
    example: '2024-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  launchDate?: string;
}
