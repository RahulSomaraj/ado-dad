import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VehicleFeaturesDto } from './vehicle-features.dto';
import {
  EngineSpecsDto,
  PerformanceSpecsDto,
  DimensionsDto,
} from './create-vehicle-variant.dto';

export class UpdateVehicleVariantDto {
  @ApiPropertyOptional({
    description: 'The unique name of the variant.',
    example: 'swift-lxi-petrol-manual',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The display name of the variant.',
    example: 'Swift LXi Petrol Manual',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'The ID of the vehicle model this variant belongs to.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({
    description: 'The ID of the fuel type.',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({
    description: 'The ID of the transmission type.',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString()
  transmissionType?: string;

  @ApiPropertyOptional({
    description: 'The feature package/trim level.',
    example: 'LXI',
  })
  @IsOptional()
  @IsString()
  featurePackage?: string;

  @ApiPropertyOptional({
    description: 'Engine specifications.',
    type: EngineSpecsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EngineSpecsDto)
  engineSpecs?: EngineSpecsDto;

  @ApiPropertyOptional({
    description: 'Performance specifications.',
    type: PerformanceSpecsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceSpecsDto)
  performanceSpecs?: PerformanceSpecsDto;

  @ApiPropertyOptional({
    description: 'Vehicle dimensions.',
    type: DimensionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiPropertyOptional({
    description: 'Seating capacity.',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  seatingCapacity?: number;

  @ApiPropertyOptional({
    description: 'Price in INR.',
    example: 550000,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    description: 'Ex-showroom price in INR.',
    example: 520000,
  })
  @IsOptional()
  @IsNumber()
  exShowroomPrice?: number;

  @ApiPropertyOptional({
    description: 'On-road price in INR.',
    example: 620000,
  })
  @IsOptional()
  @IsNumber()
  onRoadPrice?: number;

  @ApiPropertyOptional({
    description: 'Available colors.',
    example: ['Pearl Arctic White', 'Solid Fire Red'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({
    description: 'Array of image URLs for the variant.',
    example: ['https://example.com/swift-lxi1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Description of the variant.',
    example: 'Base variant with essential features',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to the variant brochure.',
    example: 'https://example.com/swift-lxi-brochure.pdf',
  })
  @IsOptional()
  @IsString()
  brochureUrl?: string;

  @ApiPropertyOptional({
    description: 'URL to the variant video.',
    example: 'https://example.com/swift-lxi-video.mp4',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    description:
      'Comprehensive vehicle features including safety, comfort, technology, etc.',
    type: VehicleFeaturesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleFeaturesDto)
  features?: VehicleFeaturesDto;

  @ApiPropertyOptional({
    description: 'Whether the variant is active.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the variant is launched.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isLaunched?: boolean;

  @ApiPropertyOptional({
    description: 'Launch date of the variant.',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  launchDate?: string;
}
