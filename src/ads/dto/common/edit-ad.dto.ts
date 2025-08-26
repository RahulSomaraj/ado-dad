import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdCategory } from '../../schemas/ad.schema';
import { PropertyTypeEnum } from '../../schemas/property-ad.schema';
import { VehicleTypeEnum } from '../../schemas/vehicle-ad.schema';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../../schemas/commercial-vehicle-ad.schema';

// Comprehensive DTO for editing ads - all fields are optional for partial updates
export class EditAdDataDto {
  // Base ad properties (common to all types) - all optional for editing
  @ApiPropertyOptional({
    description: 'Advertisement description',
    example: 'This is a detailed description of the advertisement',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Advertisement price',
    minimum: 0,
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Advertisement images',
    type: [String],
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Advertisement location',
    example: 'Mumbai, Maharashtra',
  })
  @IsOptional()
  @IsString()
  location?: string;

  // Property-specific fields (optional for all)
  @ApiPropertyOptional({
    description: 'Property type (for property ads)',
    enum: PropertyTypeEnum,
    example: PropertyTypeEnum.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyTypeEnum)
  propertyType?: PropertyTypeEnum;

  @ApiPropertyOptional({
    description: 'Number of bedrooms (for property ads)',
    minimum: 0,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms (for property ads)',
    minimum: 0,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Area in square feet (for property ads)',
    minimum: 0,
    example: 1200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSqft?: number;

  @ApiPropertyOptional({
    description: 'Floor number (for property ads)',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({
    description: 'Is furnished (for property ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({
    description: 'Has parking (for property ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: 'Has garden (for property ads)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasGarden?: boolean;

  @ApiPropertyOptional({
    description: 'Amenities (for property ads)',
    type: [String],
    example: ['Gym', 'Swimming Pool', 'Garden'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // Vehicle-specific fields (optional for all)
  @ApiPropertyOptional({
    description: 'Vehicle type (for vehicle ads)',
    enum: VehicleTypeEnum,
    example: VehicleTypeEnum.FOUR_WHEELER,
  })
  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  @ApiPropertyOptional({
    description: 'Manufacturer ID (MongoDB ObjectId) - for vehicle ads',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @ApiPropertyOptional({
    description: 'Model ID (MongoDB ObjectId) - for vehicle ads',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({
    description: 'Variant ID (MongoDB ObjectId) - for vehicle ads',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Manufacturing year (for vehicle ads)',
    minimum: 1900,
    example: 2020,
  })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @ApiPropertyOptional({
    description: 'Mileage (for vehicle ads)',
    minimum: 0,
    example: 25000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({
    description: 'Transmission type ID (MongoDB ObjectId) - for vehicle ads',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsString()
  transmissionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Fuel type ID (MongoDB ObjectId) - for vehicle ads',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsString()
  fuelTypeId?: string;

  @ApiPropertyOptional({
    description: 'Vehicle color (for vehicle ads)',
    example: 'White',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Is first owner (for vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFirstOwner?: boolean;

  @ApiPropertyOptional({
    description: 'Has insurance (for vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiPropertyOptional({
    description: 'Has RC book (for vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasRcBook?: boolean;

  @ApiPropertyOptional({
    description: 'Additional features (for vehicle ads)',
    type: [String],
    example: ['Sunroof', 'Leather Seats', 'Navigation System'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFeatures?: string[];

  // Commercial vehicle-specific fields (optional for all)
  @ApiPropertyOptional({
    description: 'Commercial vehicle type (for commercial vehicle ads)',
    enum: CommercialVehicleTypeEnum,
    example: CommercialVehicleTypeEnum.TRUCK,
  })
  @IsOptional()
  @IsEnum(CommercialVehicleTypeEnum)
  commercialVehicleType?: CommercialVehicleTypeEnum;

  @ApiPropertyOptional({
    description: 'Body type (for commercial vehicle ads)',
    enum: BodyTypeEnum,
    example: BodyTypeEnum.FLATBED,
  })
  @IsOptional()
  @IsEnum(BodyTypeEnum)
  bodyType?: BodyTypeEnum;

  @ApiPropertyOptional({
    description: 'Payload capacity (for commercial vehicle ads)',
    minimum: 0,
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  payloadCapacity?: number;

  @ApiPropertyOptional({
    description: 'Payload unit (kg, tons, etc.) - for commercial vehicle ads',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  payloadUnit?: string;

  @ApiPropertyOptional({
    description: 'Number of axles (for commercial vehicle ads)',
    minimum: 1,
    maximum: 10,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  axleCount?: number;

  @ApiPropertyOptional({
    description: 'Has fitness certificate (for commercial vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasFitness?: boolean;

  @ApiPropertyOptional({
    description: 'Has permit (for commercial vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasPermit?: boolean;

  @ApiPropertyOptional({
    description: 'Seating capacity (for commercial vehicle ads)',
    minimum: 1,
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seatingCapacity?: number;
}

// Main DTO for editing any type of ad
export class EditAdDto {
  @ApiPropertyOptional({
    description: 'Advertisement category - can be updated if needed',
    enum: AdCategory,
    example: AdCategory.PROPERTY,
  })
  @IsOptional()
  @IsEnum(AdCategory)
  category?: AdCategory;

  @ApiPropertyOptional({
    description: 'Ad data - include only the fields you want to update',
    type: EditAdDataDto,
    examples: {
      property: {
        summary: 'Property Ad Edit Example',
        description: 'Example for updating a property advertisement',
        value: {
          price: 9000000,
          description: 'Updated description for the property',
          isFurnished: true,
          amenities: [
            'Gym',
            'Swimming Pool',
            'Garden',
            'Security',
            'Lift',
            'Parking',
          ],
        },
      },
      private_vehicle: {
        summary: 'Private Vehicle Ad Edit Example',
        description: 'Example for updating a private vehicle advertisement',
        value: {
          price: 800000,
          mileage: 30000,
          description: 'Updated vehicle description with new details',
          additionalFeatures: [
            'Sunroof',
            'Leather Seats',
            'Navigation System',
            'Bluetooth',
          ],
        },
      },
      commercial_vehicle: {
        summary: 'Commercial Vehicle Ad Edit Example',
        description: 'Example for updating a commercial vehicle advertisement',
        value: {
          price: 1700000,
          payloadCapacity: 6000,
          description: 'Updated commercial vehicle description',
          hasFitness: true,
          hasPermit: true,
        },
      },
    },
  })
  @IsOptional()
  @ValidateIf((o) => o.data && Object.keys(o.data).length > 0)
  @ValidateNested({ each: false })
  @Type(() => EditAdDataDto)
  data?: EditAdDataDto;
}
