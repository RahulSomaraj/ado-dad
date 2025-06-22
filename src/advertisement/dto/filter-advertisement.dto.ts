import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { AdvertisementType } from './create-advertisement.dto';

export enum FuelType {
  Petrol = 'Petrol',
  Diesel = 'Diesel',
  Electric = 'Electric',
  Hybrid = 'Hybrid',
  CNG = 'CNG',
}

export enum TransmissionType {
  Manual = 'Manual',
  Automatic = 'Automatic',
  SemiAutomatic = 'Semi-Automatic',
  CVT = 'CVT',
  DualClutch = 'Dual-Clutch',
}

export enum PropertyType {
  House = 'house',
  Apartment = 'apartment',
  ShopAndOffice = 'shopAndOffice',
  PgAndGuestHouse = 'pgAndGuestHouse',
  Land = 'land',
}

export enum PropertyCategory {
  ForSale = 'forSale',
  ForRent = 'forRent',
  LandsAndPlots = 'landsAndPlots',
}

export enum FurnishedType {
  Furnished = 'Furnished',
  SemiFurnished = 'Semi-Furnished',
  Unfurnished = 'Unfurnished',
}

export enum ProjectStatus {
  UnderConstruction = 'Under Construction',
  ReadyToMove = 'Ready to Move',
  Resale = 'Resale',
}

export class FilterAdvertisementDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Advertisement type filter',
    enum: AdvertisementType,
  })
  @IsOptional()
  @IsEnum(AdvertisementType)
  type?: AdvertisementType;

  @ApiPropertyOptional({
    description: 'Category ID filter',
    example: '609c1d1f4f1a2561d8e6b789',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Subcategory filter',
    example: 'Sedan',
  })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 5000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({
    description: 'Location/State filter',
    example: 'Maharashtra',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'City filter',
    example: 'Mumbai',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'District filter',
    example: 'Mumbai Suburban',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    description: 'Search term for title and description',
    example: '3BHK apartment',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Approval status filter',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  // Vehicle-specific filters
  @ApiPropertyOptional({
    description: 'Fuel type filter for vehicles',
    enum: FuelType,
  })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({
    description: 'Transmission type filter for vehicles',
    enum: TransmissionType,
  })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @ApiPropertyOptional({
    description: 'Vehicle brand name filter',
    example: 'Toyota',
  })
  @IsOptional()
  @IsString()
  vehicleBrand?: string;

  @ApiPropertyOptional({
    description: 'Vehicle model name filter',
    example: 'Camry',
  })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({
    description: 'Minimum model year filter for vehicles',
    example: 2020,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  modelYearMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum model year filter for vehicles',
    example: 2023,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  modelYearMax?: number;

  @ApiPropertyOptional({
    description: 'Vehicle color filter',
    example: 'Red',
  })
  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @ApiPropertyOptional({
    description: 'Minimum mileage filter for vehicles',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileageMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum mileage filter for vehicles',
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileageMax?: number;

  // Property-specific filters
  @ApiPropertyOptional({
    description: 'Property type filter',
    enum: PropertyType,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    description: 'Property category filter',
    enum: PropertyCategory,
  })
  @IsOptional()
  @IsEnum(PropertyCategory)
  propertyCategory?: PropertyCategory;

  @ApiPropertyOptional({
    description: 'Minimum number of bedrooms',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bedroomsMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of bedrooms',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bedroomsMax?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bathrooms',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bathroomsMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of bathrooms',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bathroomsMax?: number;

  @ApiPropertyOptional({
    description: 'Furnished type filter',
    enum: FurnishedType,
  })
  @IsOptional()
  @IsEnum(FurnishedType)
  furnished?: FurnishedType;

  @ApiPropertyOptional({
    description: 'Project status filter',
    enum: ProjectStatus,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  projectStatus?: ProjectStatus;

  @ApiPropertyOptional({
    description: 'Minimum carpet area in sq ft',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carpetAreaMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum carpet area in sq ft',
    example: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carpetAreaMax?: number;

  @ApiPropertyOptional({
    description: 'Minimum build area in sq ft',
    example: 1200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buildAreaMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum build area in sq ft',
    example: 2500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buildAreaMax?: number;

  @ApiPropertyOptional({
    description: 'Minimum floor number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  floorNoMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum floor number',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  floorNoMax?: number;

  @ApiPropertyOptional({
    description: 'Minimum car parking spaces',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carParkingMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum car parking spaces',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carParkingMax?: number;

  @ApiPropertyOptional({
    description: 'Property facing direction',
    example: 'North',
  })
  @IsOptional()
  @IsString()
  facing?: string;

  @ApiPropertyOptional({
    description: 'Listed by filter (Owner, Dealer, Builder)',
    example: 'Owner',
  })
  @IsOptional()
  @IsIn(['Owner', 'Dealer', 'Builder'])
  listedBy?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'price',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
