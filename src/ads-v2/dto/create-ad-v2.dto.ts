import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdListingType } from '../../ads/schemas/property-ad.schema';

export enum AdCategoryV2 {
  PROPERTY = 'property',
  PRIVATE_VEHICLE = 'private_vehicle',
  COMMERCIAL_VEHICLE = 'commercial_vehicle',
  TWO_WHEELER = 'two_wheeler',
}

/*
 * Decorators here are deliberately type-only (plus @IsOptional so whitelist
 * keeps the key). Ranges, enums and required-ness live in
 * domain/ad.v2.validators.ts → validateCreateAdV2, which reports every field
 * error in one 422 instead of the pipe stopping at the first decorator that
 * fails. See SELL_API_CONTRACT §4.
 */

export class CommonData {
  @ApiPropertyOptional({
    description: 'Title (10–70 chars). Generated from the details when omitted.',
    example: '2019 Maruti Suzuki Swift VXi',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Description (20–4000 chars)', example: 'Single owner, full service history, new tyres.' })
  @IsOptional()
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Price in ₹ (1 – 1,000,000,000)', example: 450000 })
  @IsOptional()
  @IsNumber()
  price!: number;

  @ApiPropertyOptional({
    description: 'Location label. Required unless latitude + longitude are sent (then reverse-geocoded).',
    example: 'Kakkanad, Kochi',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Latitude (-90..90). 0 is valid.', example: 10.01 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude (-180..180). 0 is valid.', example: 76.34 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Uploaded media ids from POST /v2/media/intents (+ /complete), in display order; index 0 is the cover. Preferred over images.',
    type: [String],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];

  @ApiPropertyOptional({ description: 'Uploaded ad_video media id', example: '66f2b1ce8f50cfd2a6a3a999' })
  @IsOptional()
  @IsString()
  videoMediaId?: string;

  @ApiPropertyOptional({
    description: 'Legacy: image URLs. Ignored when mediaIds is sent. Must be URLs on the AdoDad bucket.',
    type: [String],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Legacy video/link URL. Filled from videoMediaId when that is sent.' })
  @IsOptional()
  @IsString()
  link?: string;
}

export class PropertyData {
  @ApiProperty({
    description: 'Property type',
    enum: ['apartment', 'house', 'villa', 'plot', 'commercial', 'office', 'shop', 'warehouse'],
    example: 'apartment',
  })
  @IsOptional()
  @IsString()
  propertyType!: string;

  @ApiPropertyOptional({ description: 'Required for apartment|house|villa; must be omitted for other types', example: 2 })
  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @ApiPropertyOptional({ description: 'Required for apartment|house|villa; must be omitted for other types', example: 2 })
  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @ApiProperty({ description: 'Built-up area in sq ft (> 0)', example: 1200 })
  @IsOptional()
  @IsNumber()
  areaSqft!: number;

  @ApiPropertyOptional({ description: 'Land / plot area in sq ft (> 0)', example: 2400 })
  @IsOptional()
  @IsNumber()
  landAreaSqft?: number;

  @ApiPropertyOptional({ description: 'Listing type', enum: AdListingType, example: AdListingType.SELL })
  @IsOptional()
  @IsString()
  listingType?: AdListingType;

  @ApiPropertyOptional({ description: 'Floor number (0..200)', example: 8 })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({ description: 'Is furnished (derived from furnishing when omitted)', example: true })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({ enum: ['unfurnished', 'semi', 'full'], example: 'semi' })
  @IsOptional()
  @IsString()
  furnishing?: 'unfurnished' | 'semi' | 'full';

  @ApiPropertyOptional({ description: 'Has parking', example: true })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({ description: 'Has garden', example: false })
  @IsOptional()
  @IsBoolean()
  hasGarden?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Lift', 'Security'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class VehicleData {
  @ApiPropertyOptional({
    description: 'Vehicle type (defaults from the category when omitted)',
    enum: ['two_wheeler', 'four_wheeler'],
    example: 'four_wheeler',
  })
  @IsOptional()
  @IsString()
  vehicleType!: string;

  @ApiProperty({ description: 'Manufacturer ID', example: '66f2b1ce8f50cfd2a6a3a111' })
  @IsOptional()
  @IsString()
  manufacturerId!: string;

  @ApiProperty({ description: 'Model ID', example: '66f2b1ce8f50cfd2a6a3a222' })
  @IsOptional()
  @IsString()
  modelId!: string;

  @ApiPropertyOptional({ description: 'Variant ID', example: '66f2b1ce8f50cfd2a6a3a333' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Manufacturing year (yearMin..yearMax from /v2/sell/config)', example: 2020 })
  @IsOptional()
  @IsNumber()
  year!: number;

  @ApiProperty({ description: 'Kilometres driven (0..999999). 0 is valid.', example: 25000 })
  @IsOptional()
  @IsNumber()
  mileage!: number;

  @ApiPropertyOptional({
    description: 'Transmission type ID (optional for two_wheeler, required otherwise)',
    example: '66f2b1ce8f50cfd2a6a3a444',
  })
  @IsOptional()
  @IsString()
  transmissionTypeId?: string;

  @ApiProperty({ description: 'Fuel type ID', example: '66f2b1ce8f50cfd2a6a3a555' })
  @IsOptional()
  @IsString()
  fuelTypeId!: string;

  @ApiProperty({ description: 'Vehicle colour', example: 'White' })
  @IsOptional()
  @IsString()
  color!: string;

  @ApiPropertyOptional({ description: 'Number of owners (1..10). Sets isFirstOwner = ownerCount === 1.', example: 1 })
  @IsOptional()
  @IsNumber()
  ownerCount?: number;

  @ApiPropertyOptional({ description: 'Is first owner', example: true })
  @IsOptional()
  @IsBoolean()
  isFirstOwner?: boolean;

  @ApiPropertyOptional({ description: 'Has insurance', example: true })
  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiPropertyOptional({ description: 'Has RC book', example: true })
  @IsOptional()
  @IsBoolean()
  hasRcBook?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Sunroof', 'Reverse camera'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFeatures?: string[];
}

export class CommercialVehicleData extends VehicleData {
  @ApiProperty({
    description: 'Active `name` from GET /v2/sell/config commercialVehicleTypes (e.g. truck, auto_rickshaws, taxi_cab)',
    example: 'truck',
  })
  @IsOptional()
  @IsString()
  commercialVehicleType?: string;

  @ApiPropertyOptional({
    description: 'Body type',
    enum: ['flatbed', 'container', 'refrigerated', 'tanker', 'dump', 'pickup', 'box', 'passenger'],
    example: 'flatbed',
  })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({ description: 'Payload capacity', example: 5000 })
  @IsOptional()
  @IsNumber()
  payloadCapacity?: number;

  @ApiPropertyOptional({ enum: ['kg', 'tonne'], example: 'kg' })
  @IsOptional()
  @IsString()
  payloadUnit?: string;

  @ApiPropertyOptional({ description: 'Number of axles (1..10)', example: 2 })
  @IsOptional()
  @IsNumber()
  axleCount?: number;

  @ApiPropertyOptional({ description: 'Has fitness certificate', example: true })
  @IsOptional()
  @IsBoolean()
  hasFitness?: boolean;

  @ApiPropertyOptional({ description: 'Has permit', example: true })
  @IsOptional()
  @IsBoolean()
  hasPermit?: boolean;

  @ApiPropertyOptional({ description: 'Seating capacity (1..100)', example: 3 })
  @IsOptional()
  @IsNumber()
  seatingCapacity?: number;
}

export class CreateAdV2Dto {
  @ApiProperty({ description: 'Advertisement category', enum: AdCategoryV2, example: AdCategoryV2.PROPERTY })
  @IsOptional()
  @IsString()
  category!: AdCategoryV2;

  @ApiProperty({ description: 'Common advertisement data', type: CommonData })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommonData)
  data!: CommonData;

  @ApiPropertyOptional({ description: 'Property-specific data (required for property)', type: PropertyData })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyData)
  property?: PropertyData;

  @ApiPropertyOptional({
    description: 'Vehicle-specific data (required for private_vehicle and two_wheeler)',
    type: VehicleData,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleData)
  vehicle?: VehicleData;

  @ApiPropertyOptional({
    description: 'Commercial vehicle-specific data (required for commercial_vehicle)',
    type: CommercialVehicleData,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommercialVehicleData)
  commercial?: CommercialVehicleData;
}
