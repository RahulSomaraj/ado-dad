import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, IsMongoId, IsObject, IsDateString } from 'class-validator';
import { VALID_FUEL_TYPES, VALID_TRANSMISSION_TYPES, VALID_FEATURE_PACKAGES } from '../../common/constants/vehicle.constants';

export class UpdateVehicleVariantDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Toyota Camry VX Petrol Automatic', description: 'Name of the vehicle variant' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Toyota Camry VX', description: 'Display name for the variant' })
  displayName?: string;

  @IsOptional()
  @IsEnum(VALID_FUEL_TYPES)
  @ApiPropertyOptional({ 
    example: 'petrol', 
    description: `Fuel type - must be one of: ${VALID_FUEL_TYPES.join(', ')}` 
  })
  fuelType?: string;

  @IsOptional()
  @IsEnum(VALID_TRANSMISSION_TYPES)
  @ApiPropertyOptional({ 
    example: 'automatic_6', 
    description: `Transmission type - must be one of: ${VALID_TRANSMISSION_TYPES.join(', ')}` 
  })
  transmissionType?: string;

  @IsOptional()
  @IsEnum(VALID_FEATURE_PACKAGES)
  @ApiPropertyOptional({ 
    example: 'VX', 
    description: `Feature package - must be one of: ${VALID_FEATURE_PACKAGES.join(', ')}` 
  })
  featurePackage?: string;

  @IsOptional()
  @IsMongoId()
  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011', description: 'Model ID (MongoDB ObjectId)' })
  modelId?: string;

  // Engine specifications
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1998, description: 'Engine capacity in cc' })
  engine_capacity?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '150 bhp', description: 'Maximum power' })
  engine_maxPower?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '200 Nm', description: 'Maximum torque' })
  engine_maxTorque?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 4, description: 'Number of cylinders' })
  engine_cylinders?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Whether engine has turbo (boolean: true/false)' })
  engine_turbo?: boolean;

  // Performance specifications
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '18 km/l', description: 'Mileage' })
  perf_mileage?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '8.5 seconds', description: '0-100 km/h acceleration time' })
  perf_acceleration?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '180 km/h', description: 'Top speed' })
  perf_topSpeed?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 50, description: 'Fuel tank capacity in liters' })
  perf_fuelCapacity?: number;

  // Dimensions
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 4885, description: 'Length in mm' })
  dim_length?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1840, description: 'Width in mm' })
  dim_width?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1455, description: 'Height in mm' })
  dim_height?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2825, description: 'Wheelbase in mm' })
  dim_wheelbase?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 165, description: 'Ground clearance in mm' })
  dim_groundClearance?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 470, description: 'Boot space in liters' })
  dim_bootSpace?: number;

  // Other fields
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 5, description: 'Seating capacity' })
  seatingCapacity?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2500000, description: 'Price in INR' })
  price?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2200000, description: 'Ex-showroom price in INR' })
  exShowroomPrice?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2800000, description: 'On-road price in INR' })
  onRoadPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ example: ['Red', 'Blue', 'White'], description: 'Available colors' })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'], description: 'Array of image URLs' })
  images?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Premium variant with advanced features', description: 'Description of the variant' })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/brochure.pdf', description: 'URL to the variant brochure' })
  brochureUrl?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/video.mp4', description: 'URL to the variant video' })
  videoUrl?: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ example: { 'ABS': true, 'Airbags': 6 }, description: 'Features as JSON object (must be valid JSON)' })
  featuresJson?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Whether the variant is active (boolean: true/false)' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false, description: 'Whether the variant is launched (boolean: true/false)' })
  isLaunched?: boolean;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2024-01-15', description: 'Launch date (ISO date string)' })
  launchDate?: string;
}

