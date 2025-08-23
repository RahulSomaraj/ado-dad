import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { AdCategory } from '../../schemas/ad.schema';
import { PropertyTypeEnum } from '../../schemas/property-ad.schema';
import { VehicleTypeEnum } from '../../schemas/vehicle-ad.schema';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../../schemas/commercial-vehicle-ad.schema';

export class FilterAdDto {
  // ===== BASIC FILTERS (Common to all ad types) =====
  @ApiPropertyOptional({
    description: 'Advertisement category to filter by',
    enum: AdCategory,
    example: AdCategory.PROPERTY,
  })
  @IsOptional()
  @IsEnum(AdCategory)
  category?: AdCategory;

  @ApiPropertyOptional({
    description: 'Search term for title and description (text search)',
    example: 'apartment honda',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Location filter (partial match)',
    example: 'Mumbai',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    minimum: 0,
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    minimum: 0,
    example: 1000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by user who posted the advertisement',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  postedBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by advertisement status (active/inactive)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  // ===== PAGINATION AND SORTING =====
  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['price', 'postedAt', 'createdAt', 'updatedAt'],
    example: 'postedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'postedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // ===== PROPERTY-SPECIFIC FILTERS =====
  @ApiPropertyOptional({
    description: 'Property type filter',
    enum: PropertyTypeEnum,
    example: PropertyTypeEnum.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyTypeEnum)
  propertyType?: PropertyTypeEnum;

  @ApiPropertyOptional({
    description: 'Minimum number of bedrooms',
    minimum: 0,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of bedrooms',
    minimum: 0,
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bathrooms',
    minimum: 0,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBathrooms?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of bathrooms',
    minimum: 0,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBathrooms?: number;

  @ApiPropertyOptional({
    description: 'Minimum area in square feet',
    minimum: 0,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minArea?: number;

  @ApiPropertyOptional({
    description: 'Maximum area in square feet',
    minimum: 0,
    example: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxArea?: number;

  @ApiPropertyOptional({
    description: 'Filter by furnished status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by parking availability',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by garden availability',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasGarden?: boolean;

  // ===== VEHICLE-SPECIFIC FILTERS (Private Vehicles & Two Wheelers) =====
  @ApiPropertyOptional({
    description: 'Vehicle type filter',
    enum: VehicleTypeEnum,
    example: VehicleTypeEnum.FOUR_WHEELER,
  })
  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  @ApiPropertyOptional({
    description: 'Manufacturer IDs filter (MongoDB ObjectIds)',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439034'],
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value !== undefined ? [value] : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  manufacturerId?: string[];

  @ApiPropertyOptional({
    description: 'Model IDs filter (MongoDB ObjectIds)',
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439045'],
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value !== undefined ? [value] : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  modelId?: string[];

  @ApiPropertyOptional({
    description: 'Variant IDs filter (MongoDB ObjectIds)',
    example: ['507f1f77bcf86cd799439013'],
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value !== undefined ? [value] : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  variantId?: string[];

  @ApiPropertyOptional({
    description: 'Minimum manufacturing year',
    minimum: 1900,
    example: 2018,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  minYear?: number;

  @ApiPropertyOptional({
    description: 'Maximum manufacturing year',
    minimum: 1900,
    example: 2023,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  maxYear?: number;

  @ApiPropertyOptional({
    description: 'Maximum mileage',
    minimum: 0,
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxMileage?: number;

  @ApiPropertyOptional({
    description: 'Transmission type ID filter (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsString()
  transmissionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Fuel type ID filter (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsString()
  fuelTypeId?: string;

  @ApiPropertyOptional({
    description: 'Vehicle color filter (partial match)',
    example: 'White',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Filter by first owner status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isFirstOwner?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by insurance status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by RC book availability',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasRcBook?: boolean;

  // ===== COMMERCIAL VEHICLE-SPECIFIC FILTERS =====
  @ApiPropertyOptional({
    description: 'Commercial vehicle type filter',
    enum: CommercialVehicleTypeEnum,
    example: CommercialVehicleTypeEnum.TRUCK,
  })
  @IsOptional()
  @IsEnum(CommercialVehicleTypeEnum)
  commercialVehicleType?: CommercialVehicleTypeEnum;

  @ApiPropertyOptional({
    description: 'Body type filter',
    enum: BodyTypeEnum,
    example: BodyTypeEnum.FLATBED,
  })
  @IsOptional()
  @IsEnum(BodyTypeEnum)
  bodyType?: BodyTypeEnum;

  @ApiPropertyOptional({
    description: 'Minimum payload capacity',
    minimum: 0,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPayloadCapacity?: number;

  @ApiPropertyOptional({
    description: 'Maximum payload capacity',
    minimum: 0,
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPayloadCapacity?: number;

  @ApiPropertyOptional({
    description: 'Number of axles filter',
    minimum: 1,
    maximum: 10,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  axleCount?: number;

  @ApiPropertyOptional({
    description: 'Filter by fitness certificate status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasFitness?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by permit status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasPermit?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum seating capacity',
    minimum: 1,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minSeatingCapacity?: number;

  @ApiPropertyOptional({
    description: 'Maximum seating capacity',
    minimum: 1,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxSeatingCapacity?: number;
}

export class FilterVehicleModelsDto {
  @ApiPropertyOptional({
    description: 'Filter by manufacturer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  manufacturerId?: string;
}

export class FilterVehicleVariantsDto {
  @ApiPropertyOptional({
    description: 'Filter by model ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({
    description: 'Filter by fuel type ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString()
  fuelTypeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transmission type ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsString()
  transmissionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by maximum price',
    minimum: 0,
    example: 1000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
