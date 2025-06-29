import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdCategory } from '../../schemas/ad.schema';
import { PropertyTypeEnum } from '../../schemas/property-ad.schema';
import { VehicleTypeEnum } from '../../schemas/vehicle-ad.schema';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../../schemas/commercial-vehicle-ad.schema';

export class AdResponseDto {
  @ApiProperty({ description: 'Advertisement ID' })
  id: string;

  @ApiProperty({ description: 'Advertisement description' })
  description: string;

  @ApiProperty({ description: 'Advertisement price' })
  price: number;

  @ApiPropertyOptional({
    description: 'Advertisement images URLs',
    type: [String],
  })
  images?: string[];

  @ApiProperty({ description: 'Advertisement location' })
  location: string;

  @ApiProperty({ description: 'Advertisement category', enum: AdCategory })
  category: AdCategory;

  @ApiProperty({ description: 'Is advertisement active' })
  isActive: boolean;

  @ApiProperty({ description: 'Posted date' })
  postedAt: Date;

  @ApiProperty({ description: 'Last updated date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Posted by user ID' })
  postedBy: string;

  @ApiPropertyOptional({ description: 'User information' })
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

// Property-specific details
export class PropertyDetailsDto {
  @ApiProperty({ description: 'Property type', enum: PropertyTypeEnum })
  propertyType: PropertyTypeEnum;

  @ApiProperty({ description: 'Number of bedrooms' })
  bedrooms: number;

  @ApiProperty({ description: 'Number of bathrooms' })
  bathrooms: number;

  @ApiProperty({ description: 'Area in square feet' })
  areaSqft: number;

  @ApiPropertyOptional({ description: 'Floor number' })
  floor?: number;

  @ApiPropertyOptional({ description: 'Is furnished' })
  isFurnished?: boolean;

  @ApiPropertyOptional({ description: 'Has parking' })
  hasParking?: boolean;

  @ApiPropertyOptional({ description: 'Has garden' })
  hasGarden?: boolean;

  @ApiPropertyOptional({ description: 'Amenities', type: [String] })
  amenities?: string[];
}

// Vehicle inventory details
export class VehicleInventoryDetailsDto {
  @ApiPropertyOptional({ description: 'Manufacturer information' })
  manufacturer?: {
    id: string;
    name: string;
    country?: string;
  };

  @ApiPropertyOptional({ description: 'Model information' })
  model?: {
    id: string;
    name: string;
    manufacturerId: string;
  };

  @ApiPropertyOptional({ description: 'Variant information' })
  variant?: {
    id: string;
    name: string;
    modelId: string;
    price?: number;
  };

  @ApiPropertyOptional({ description: 'Transmission type information' })
  transmissionType?: {
    id: string;
    name: string;
    description?: string;
  };

  @ApiPropertyOptional({ description: 'Fuel type information' })
  fuelType?: {
    id: string;
    name: string;
    description?: string;
  };
}

// Vehicle-specific details
export class VehicleDetailsDto {
  @ApiProperty({ description: 'Vehicle type', enum: VehicleTypeEnum })
  vehicleType: VehicleTypeEnum;

  @ApiProperty({ description: 'Manufacturer ID' })
  manufacturerId: string;

  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiPropertyOptional({ description: 'Variant ID' })
  variantId?: string;

  @ApiProperty({ description: 'Manufacturing year' })
  year: number;

  @ApiProperty({ description: 'Mileage' })
  mileage: number;

  @ApiProperty({ description: 'Transmission type ID' })
  transmissionTypeId: string;

  @ApiProperty({ description: 'Fuel type ID' })
  fuelTypeId: string;

  @ApiProperty({ description: 'Vehicle color' })
  color: string;

  @ApiPropertyOptional({ description: 'Is first owner' })
  isFirstOwner?: boolean;

  @ApiPropertyOptional({ description: 'Has insurance' })
  hasInsurance?: boolean;

  @ApiPropertyOptional({ description: 'Has RC book' })
  hasRcBook?: boolean;

  @ApiPropertyOptional({ description: 'Additional features', type: [String] })
  additionalFeatures?: string[];

  // Vehicle inventory details
  @ApiPropertyOptional({ description: 'Vehicle inventory details' })
  inventory?: VehicleInventoryDetailsDto;
}

// Commercial vehicle-specific details
export class CommercialVehicleDetailsDto {
  @ApiProperty({ description: 'Vehicle type', enum: VehicleTypeEnum })
  vehicleType: VehicleTypeEnum;

  @ApiProperty({
    description: 'Commercial vehicle type',
    enum: CommercialVehicleTypeEnum,
  })
  commercialVehicleType: CommercialVehicleTypeEnum;

  @ApiProperty({ description: 'Body type', enum: BodyTypeEnum })
  bodyType: BodyTypeEnum;

  @ApiProperty({ description: 'Manufacturer ID' })
  manufacturerId: string;

  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiPropertyOptional({ description: 'Variant ID' })
  variantId?: string;

  @ApiProperty({ description: 'Manufacturing year' })
  year: number;

  @ApiProperty({ description: 'Mileage' })
  mileage: number;

  @ApiProperty({ description: 'Payload capacity' })
  payloadCapacity: number;

  @ApiProperty({ description: 'Payload unit' })
  payloadUnit: string;

  @ApiProperty({ description: 'Number of axles' })
  axleCount: number;

  @ApiProperty({ description: 'Transmission type ID' })
  transmissionTypeId: string;

  @ApiProperty({ description: 'Fuel type ID' })
  fuelTypeId: string;

  @ApiProperty({ description: 'Vehicle color' })
  color: string;

  @ApiPropertyOptional({ description: 'Has insurance' })
  hasInsurance?: boolean;

  @ApiPropertyOptional({ description: 'Has fitness certificate' })
  hasFitness?: boolean;

  @ApiPropertyOptional({ description: 'Has permit' })
  hasPermit?: boolean;

  @ApiPropertyOptional({ description: 'Additional features', type: [String] })
  additionalFeatures?: string[];

  @ApiPropertyOptional({ description: 'Seating capacity' })
  seatingCapacity?: number;

  // Vehicle inventory details
  @ApiPropertyOptional({ description: 'Vehicle inventory details' })
  inventory?: VehicleInventoryDetailsDto;
}

// Comprehensive detailed response DTO
export class DetailedAdResponseDto extends AdResponseDto {
  @ApiPropertyOptional({ description: 'Property-specific details' })
  propertyDetails?: PropertyDetailsDto;

  @ApiPropertyOptional({ description: 'Vehicle-specific details' })
  vehicleDetails?: VehicleDetailsDto;

  @ApiPropertyOptional({ description: 'Commercial vehicle-specific details' })
  commercialVehicleDetails?: CommercialVehicleDetailsDto;
}

export class PaginatedAdResponseDto {
  @ApiProperty({ description: 'List of advertisements', type: [AdResponseDto] })
  data: AdResponseDto[];

  @ApiProperty({ description: 'Total number of advertisements' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;
}
