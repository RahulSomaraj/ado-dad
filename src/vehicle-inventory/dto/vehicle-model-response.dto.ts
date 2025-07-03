import { ApiProperty } from '@nestjs/swagger';

export class ManufacturerInfoDto {
  @ApiProperty({ description: 'Manufacturer ID' })
  _id: string;

  @ApiProperty({ description: 'Manufacturer name' })
  name: string;

  @ApiProperty({ description: 'Manufacturer display name' })
  displayName: string;

  @ApiProperty({ description: 'Manufacturer logo URL', required: false })
  logo?: string;

  @ApiProperty({ description: 'Manufacturer origin country' })
  originCountry: string;

  @ApiProperty({ description: 'Manufacturer founded year' })
  foundedYear: number;

  @ApiProperty({ description: 'Manufacturer headquarters' })
  headquarters: string;
}

export class VehicleModelDto {
  @ApiProperty({ description: 'Vehicle model ID' })
  _id: string;

  @ApiProperty({ description: 'Vehicle model name' })
  name: string;

  @ApiProperty({ description: 'Vehicle model display name' })
  displayName: string;

  @ApiProperty({ description: 'Vehicle model description', required: false })
  description?: string;

  @ApiProperty({ description: 'Vehicle model launch year', required: false })
  launchYear?: number;

  @ApiProperty({ description: 'Vehicle model segment', required: false })
  segment?: string;

  @ApiProperty({ description: 'Vehicle model body type', required: false })
  bodyType?: string;

  @ApiProperty({ description: 'Vehicle model images', required: false })
  images?: string[];

  @ApiProperty({ description: 'Vehicle model brochure URL', required: false })
  brochureUrl?: string;

  @ApiProperty({ description: 'Vehicle model active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Vehicle type' })
  vehicleType: string;

  @ApiProperty({ description: 'Manufacturer information' })
  manufacturer: ManufacturerInfoDto;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Number of variants available for this model' })
  variantCount?: number;

  @ApiProperty({ description: 'Price range for this model', required: false })
  priceRange?: {
    min: number;
    max: number;
  };

  @ApiProperty({ description: 'Available fuel types for this model', required: false })
  availableFuelTypes?: string[];

  @ApiProperty({ description: 'Available transmission types for this model', required: false })
  availableTransmissionTypes?: string[];
}

export class PaginatedVehicleModelResponseDto {
  @ApiProperty({ description: 'Array of vehicle models' })
  data: VehicleModelDto[];

  @ApiProperty({ description: 'Total number of vehicle models' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
} 