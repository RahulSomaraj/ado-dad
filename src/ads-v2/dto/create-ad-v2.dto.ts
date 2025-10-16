import {
  IsEnum,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsMongoId,
  ValidateNested,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdCategoryV2 {
  PROPERTY = 'property',
  PRIVATE_VEHICLE = 'private_vehicle',
  COMMERCIAL_VEHICLE = 'commercial_vehicle',
  TWO_WHEELER = 'two_wheeler',
}

export class CommonData {
  @ApiProperty({
    description: 'Advertisement description',
    example: 'Beautiful 2BHK Apartment in Prime Location',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'Advertisement price',
    example: 8500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description:
      'Advertisement location (auto-generated from coordinates if not provided)',
    example: 'Bandra West, Mumbai, Maharashtra',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 19.076,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.8777,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({
    description: 'Advertisement images URLs',
    type: [String],
    maxItems: 20,
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    description: 'Advertisement link',
    example: 'https://example.com/more-details',
  })
  @IsString()
  @IsOptional()
  link?: string;
}

export class PropertyData {
  @ApiProperty({
    description: 'Property type',
    enum: ['apartment', 'house', 'villa', 'plot', 'commercial'],
    example: 'apartment',
  })
  @IsEnum(['apartment', 'house', 'villa', 'plot', 'commercial'] as any)
  propertyType!: string;

  @ApiProperty({ description: 'Number of bedrooms', example: 2, minimum: 0 })
  @IsNumber()
  @Min(0)
  bedrooms!: number;

  @ApiProperty({ description: 'Number of bathrooms', example: 2, minimum: 0 })
  @IsNumber()
  @Min(0)
  bathrooms!: number;

  @ApiProperty({
    description: 'Area in square feet',
    example: 1200,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  areaSqft!: number;

  @ApiPropertyOptional({ description: 'Floor number', example: 8 })
  @IsNumber()
  @IsOptional()
  floor?: number;

  @ApiPropertyOptional({ description: 'Is furnished', example: true })
  @IsBoolean()
  @IsOptional()
  isFurnished?: boolean;

  @ApiPropertyOptional({ description: 'Has parking', example: true })
  @IsBoolean()
  @IsOptional()
  hasParking?: boolean;

  @ApiPropertyOptional({ description: 'Has garden', example: false })
  @IsBoolean()
  @IsOptional()
  hasGarden?: boolean;

  @ApiPropertyOptional({
    description: 'Amenities',
    type: [String],
    example: ['Gym', 'Swimming Pool', 'Security'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];
}

export class VehicleData {
  @ApiProperty({
    description: 'Vehicle type',
    enum: ['two_wheeler', 'four_wheeler'],
    example: 'four_wheeler',
  })
  @IsEnum(['two_wheeler', 'four_wheeler'] as any)
  vehicleType!: string;

  @ApiProperty({
    description: 'Manufacturer ID',
    example: '66f2b1ce8f50cfd2a6a3a111',
  })
  @IsMongoId()
  manufacturerId!: string;

  @ApiProperty({ description: 'Model ID', example: '66f2b1ce8f50cfd2a6a3a222' })
  @IsMongoId()
  modelId!: string;

  @ApiPropertyOptional({
    description: 'Variant ID',
    example: '66f2b1ce8f50cfd2a6a3a333',
  })
  @IsMongoId()
  @IsOptional()
  variantId?: string;

  @ApiProperty({
    description: 'Manufacturing year',
    example: 2020,
    minimum: 1900,
    maximum: 2025,
  })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @ApiProperty({ description: 'Mileage', example: 25000, minimum: 0 })
  @IsNumber()
  @Min(0)
  mileage!: number;

  @ApiProperty({
    description: 'Transmission type ID',
    example: '66f2b1ce8f50cfd2a6a3a444',
  })
  @IsMongoId()
  transmissionTypeId!: string;

  @ApiProperty({
    description: 'Fuel type ID',
    example: '66f2b1ce8f50cfd2a6a3a555',
  })
  @IsMongoId()
  fuelTypeId!: string;

  @ApiProperty({ description: 'Vehicle color', example: 'White' })
  @IsString()
  color!: string;

  @ApiPropertyOptional({ description: 'Is first owner', example: true })
  @IsBoolean()
  @IsOptional()
  isFirstOwner?: boolean;

  @ApiPropertyOptional({ description: 'Has insurance', example: true })
  @IsBoolean()
  @IsOptional()
  hasInsurance?: boolean;

  @ApiPropertyOptional({ description: 'Has RC book', example: true })
  @IsBoolean()
  @IsOptional()
  hasRcBook?: boolean;

  @ApiPropertyOptional({
    description: 'Additional features',
    type: [String],
    example: ['Sunroof', 'Leather Seats', 'Navigation System'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalFeatures?: string[];
}

export class CommercialVehicleData extends VehicleData {
  @ApiPropertyOptional({
    description: 'Commercial vehicle type',
    enum: ['truck', 'bus', 'van', 'tractor', 'trailer'],
    example: 'truck',
  })
  @IsEnum(['truck', 'bus', 'van', 'tractor', 'trailer'] as any)
  @IsOptional()
  commercialVehicleType?: string;

  @ApiPropertyOptional({
    description: 'Body type',
    enum: ['flatbed', 'refrigerated', 'tanker', 'container', 'dump'],
    example: 'flatbed',
  })
  @IsEnum(['flatbed', 'refrigerated', 'tanker', 'container', 'dump'] as any)
  @IsOptional()
  bodyType?: string;

  @ApiPropertyOptional({
    description: 'Payload capacity',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  payloadCapacity?: number;

  @ApiPropertyOptional({ description: 'Payload unit', example: 'kg' })
  @IsString()
  @IsOptional()
  payloadUnit?: string;

  @ApiPropertyOptional({
    description: 'Number of axles',
    example: 2,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  axleCount?: number;

  @ApiPropertyOptional({
    description: 'Has fitness certificate',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  hasFitness?: boolean;

  @ApiPropertyOptional({ description: 'Has permit', example: true })
  @IsBoolean()
  @IsOptional()
  hasPermit?: boolean;

  @ApiPropertyOptional({
    description: 'Seating capacity',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  seatingCapacity?: number;
}

export class CreateAdV2Dto {
  @ApiProperty({
    description: 'Advertisement category',
    enum: AdCategoryV2,
    example: AdCategoryV2.PROPERTY,
  })
  @IsEnum(AdCategoryV2)
  category!: AdCategoryV2;

  @ApiProperty({
    description: 'Common advertisement data',
    type: CommonData,
  })
  @ValidateNested()
  @Type(() => CommonData)
  data!: CommonData;

  @ApiPropertyOptional({
    description: 'Property-specific data (required for property category)',
    type: PropertyData,
  })
  @ValidateNested()
  @Type(() => PropertyData)
  @IsOptional()
  property?: PropertyData;

  @ApiPropertyOptional({
    description:
      'Vehicle-specific data (required for private_vehicle and two_wheeler categories)',
    type: VehicleData,
  })
  @ValidateNested()
  @Type(() => VehicleData)
  @IsOptional()
  vehicle?: VehicleData;

  @ApiPropertyOptional({
    description:
      'Commercial vehicle-specific data (required for commercial_vehicle category)',
    type: CommercialVehicleData,
  })
  @ValidateNested()
  @Type(() => CommercialVehicleData)
  @IsOptional()
  commercial?: CommercialVehicleData;
}
