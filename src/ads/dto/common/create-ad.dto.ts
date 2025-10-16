import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdCategory } from '../../schemas/ad.schema';
import { PropertyTypeEnum } from '../../schemas/property-ad.schema';
import { VehicleTypeEnum } from '../../schemas/vehicle-ad.schema';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../../schemas/commercial-vehicle-ad.schema';

// Comprehensive DTO that includes all possible fields for all ad types
export class CreateAdDataDto {
  // Base ad properties (common to all types)
  @ApiProperty({
    description: 'Advertisement description',
    example: 'This is a detailed description of the advertisement',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Advertisement price',
    minimum: 0,
    example: 500000,
  })
  @IsNumber()
  @Min(0)
  price: number;

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
    description:
      'Advertisement location (auto-generated from coordinates if not provided)',
    example: 'Mumbai, Maharashtra',
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
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.8777,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Advertisement link',
    example: 'https://example.com/more-details',
  })
  @IsOptional()
  @IsString()
  link?: string;

  // Property-specific fields (optional for all)
  @ApiPropertyOptional({
    description: 'Property type (required for property ads)',
    enum: PropertyTypeEnum,
    example: PropertyTypeEnum.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyTypeEnum)
  propertyType?: PropertyTypeEnum;

  @ApiPropertyOptional({
    description: 'Number of bedrooms (required for property ads)',
    minimum: 0,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms (required for property ads)',
    minimum: 0,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Area in square feet (required for property ads)',
    minimum: 0,
    example: 1200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSqft?: number;

  @ApiPropertyOptional({
    description: 'Floor number (optional for property ads)',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({
    description: 'Is furnished (optional for property ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({
    description: 'Has parking (optional for property ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: 'Has garden (optional for property ads)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasGarden?: boolean;

  @ApiPropertyOptional({
    description: 'Amenities (optional for property ads)',
    type: [String],
    example: ['Gym', 'Swimming Pool', 'Garden'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  // Vehicle-specific fields (optional for all)
  @ApiPropertyOptional({
    description: 'Vehicle type (required for vehicle ads)',
    enum: VehicleTypeEnum,
    example: VehicleTypeEnum.FOUR_WHEELER,
  })
  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  @ApiPropertyOptional({
    description:
      'Manufacturer ID (MongoDB ObjectId) - required for vehicle ads',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @ApiPropertyOptional({
    description: 'Model ID (MongoDB ObjectId) - required for vehicle ads',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({
    description: 'Variant ID (MongoDB ObjectId) - optional for vehicle ads',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Manufacturing year (required for vehicle ads)',
    minimum: 1900,
    example: 2020,
  })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @ApiPropertyOptional({
    description: 'Mileage (required for vehicle ads)',
    minimum: 0,
    example: 25000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({
    description:
      'Transmission type ID (MongoDB ObjectId) - required for vehicle ads',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsString()
  transmissionTypeId?: string;

  @ApiPropertyOptional({
    description: 'Fuel type ID (MongoDB ObjectId) - required for vehicle ads',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsString()
  fuelTypeId?: string;

  @ApiPropertyOptional({
    description: 'Vehicle color (required for vehicle ads)',
    example: 'White',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Is first owner (optional for vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFirstOwner?: boolean;

  @ApiPropertyOptional({
    description: 'Has insurance (optional for vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiPropertyOptional({
    description: 'Has RC book (optional for vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasRcBook?: boolean;

  @ApiPropertyOptional({
    description: 'Additional features (optional for vehicle ads)',
    type: [String],
    example: ['Sunroof', 'Leather Seats', 'Navigation System'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFeatures?: string[];

  // Commercial vehicle-specific fields (optional for all)
  @ApiPropertyOptional({
    description:
      'Commercial vehicle type (required for commercial vehicle ads)',
    enum: CommercialVehicleTypeEnum,
    example: CommercialVehicleTypeEnum.TRUCK,
  })
  @IsOptional()
  @IsEnum(CommercialVehicleTypeEnum)
  commercialVehicleType?: CommercialVehicleTypeEnum;

  @ApiPropertyOptional({
    description: 'Body type (required for commercial vehicle ads)',
    enum: BodyTypeEnum,
    example: BodyTypeEnum.FLATBED,
  })
  @IsOptional()
  @IsEnum(BodyTypeEnum)
  bodyType?: BodyTypeEnum;

  @ApiPropertyOptional({
    description: 'Payload capacity (required for commercial vehicle ads)',
    minimum: 0,
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  payloadCapacity?: number;

  @ApiPropertyOptional({
    description:
      'Payload unit (kg, tons, etc.) - required for commercial vehicle ads',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  payloadUnit?: string;

  @ApiPropertyOptional({
    description: 'Number of axles (required for commercial vehicle ads)',
    minimum: 1,
    maximum: 10,
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  axleCount?: number;

  @ApiPropertyOptional({
    description:
      'Has fitness certificate (optional for commercial vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasFitness?: boolean;

  @ApiPropertyOptional({
    description: 'Has permit (optional for commercial vehicle ads)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasPermit?: boolean;

  @ApiPropertyOptional({
    description: 'Seating capacity (optional for commercial vehicle ads)',
    minimum: 1,
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seatingCapacity?: number;
}

// Main DTO for creating any type of ad
export class CreateAdDto {
  @ApiProperty({
    description:
      'Advertisement category - determines which fields are required',
    enum: AdCategory,
    example: AdCategory.PROPERTY,
  })
  @IsEnum(AdCategory)
  category: AdCategory;

  @ApiProperty({
    description: 'Ad data - include fields relevant to the selected category',
    type: CreateAdDataDto,
    examples: {
      property: {
        summary: 'Property Ad Example',
        description: 'Complete example for creating a property advertisement',
        value: {
          description:
            'Spacious and well-maintained 2BHK apartment located in the heart of the city. This property offers modern amenities, excellent connectivity, and a peaceful neighborhood.',
          price: 8500000,
          location: 'Bandra West, Mumbai, Maharashtra',
          link: 'https://example.com/property-details/bandra-apartment',
          images: [
            'https://example.com/property/living-room.jpg',
            'https://example.com/property/bedroom.jpg',
          ],
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
          floor: 8,
          isFurnished: true,
          hasParking: true,
          hasGarden: false,
          amenities: ['Gym', 'Swimming Pool', 'Garden', 'Security', 'Lift'],
        },
      },
      private_vehicle: {
        summary: 'Private Vehicle Ad Example',
        description:
          'Complete example for creating a private vehicle advertisement',
        value: {
          description:
            'Well-maintained Honda City in excellent condition. Single owner, full service history, no accidents. Perfect for daily commute.',
          price: 850000,
          location: 'Dwarka, Delhi, NCR',
          link: 'https://example.com/vehicle-details/honda-city-2020',
          images: [
            'https://example.com/vehicle/exterior.jpg',
            'https://example.com/vehicle/interior.jpg',
          ],
          vehicleType: 'four_wheeler',
          manufacturerId: '507f1f77bcf86cd799439011',
          modelId: '507f1f77bcf86cd799439012',
          variantId: '507f1f77bcf86cd799439013',
          year: 2020,
          mileage: 25000,
          transmissionTypeId: '507f1f77bcf86cd799439014',
          fuelTypeId: '507f1f77bcf86cd799439015',
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [
            'Sunroof',
            'Leather Seats',
            'Navigation System',
            'Reverse Camera',
          ],
        },
      },
      commercial_vehicle: {
        summary: 'Commercial Vehicle Ad Example',
        description:
          'Complete example for creating a commercial vehicle advertisement',
        value: {
          description:
            'Heavy duty Tata 407 truck in excellent condition. Perfect for logistics and transportation business. Well-maintained with all necessary permits.',
          price: 1800000,
          location: 'Pune, Maharashtra',
          link: 'https://example.com/commercial-vehicle-details/tata-407-truck',
          images: [
            'https://example.com/truck/exterior.jpg',
            'https://example.com/truck/cargo-area.jpg',
          ],
          vehicleType: 'four_wheeler',
          CommercialVehicleType: 'truck',
          bodyType: 'flatbed',
          manufacturerId: '507f1f77bcf86cd799439011',
          modelId: '507f1f77bcf86cd799439012',
          variantId: '507f1f77bcf86cd799439013',
          year: 2019,
          mileage: 75000,
          transmissionTypeId: '507f1f77bcf86cd799439014',
          fuelTypeId: '507f1f77bcf86cd799439015',
          color: 'Blue',
          payloadCapacity: 5000,
          payloadUnit: 'kg',
          axleCount: 2,
          hasInsurance: true,
          hasFitness: true,
          hasPermit: true,
          additionalFeatures: [
            'GPS Tracking',
            'Climate Control',
            'Safety Features',
          ],
          seatingCapacity: 3,
        },
      },
      two_wheeler: {
        summary: 'Two Wheeler Ad Example',
        description:
          'Complete example for creating a two-wheeler advertisement',
        value: {
          description:
            'Honda Activa 6G in pristine condition. Single owner, low mileage, excellent fuel efficiency. Perfect for daily commute.',
          price: 65000,
          location: 'Koramangala, Bangalore, Karnataka',
          link: 'https://example.com/two-wheeler-details/honda-activa-6g',
          images: [
            'https://example.com/scooter/exterior.jpg',
            'https://example.com/scooter/dashboard.jpg',
          ],
          vehicleType: 'two_wheeler',
          manufacturerId: '507f1f77bcf86cd799439011',
          modelId: '507f1f77bcf86cd799439012',
          variantId: '507f1f77bcf86cd799439013',
          year: 2021,
          mileage: 12000,
          transmissionTypeId: '507f1f77bcf86cd799439014',
          fuelTypeId: '507f1f77bcf86cd799439015',
          color: 'Red',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [
            'Digital Console',
            'LED Headlight',
            'Mobile Charging Port',
          ],
        },
      },
    },
  })
  @ValidateNested()
  @Type(() => CreateAdDataDto)
  data: CreateAdDataDto;
}
