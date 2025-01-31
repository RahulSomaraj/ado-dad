import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePropertyDto {
  @ApiProperty({
    description: 'Title of the property',
    example: 'Updated Beautiful House for Sale',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Description of the property',
    example: 'An updated 3-bedroom house in a prime location.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Price of the property',
    example: 550000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Location of the property',
    example: 'Los Angeles, CA',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Area of the property in square feet',
    example: 1300,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  area?: number;

  @ApiProperty({
    description: 'List of image URLs of the property',
    example: ['https://example.com/updated-image1.jpg'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({
    description: 'Type of the property',
    enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
    example: 'apartment',
    required: false,
  })
  @IsEnum(['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Category of the property',
    enum: ['forSale', 'forRent', 'landsAndPlots'],
    example: 'forRent',
    required: false,
  })
  @IsEnum(['forSale', 'forRent', 'landsAndPlots'])
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Number of BHK (for house, apartment, PG)',
    example: 2,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  bhk?: number;

  @ApiProperty({
    description: 'Number of bathrooms',
    example: 2,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  bathrooms?: number;

  @ApiProperty({
    description: 'Furnishing status',
    enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
    example: 'Semi-Furnished',
    required: false,
  })
  @IsEnum(['Furnished', 'Semi-Furnished', 'Unfurnished'])
  @IsOptional()
  furnished?: string;

  @ApiProperty({
    description: 'Project status (if applicable)',
    enum: ['Under Construction', 'Ready to Move', 'Resale'],
    example: 'Under Construction',
    required: false,
  })
  @IsEnum(['Under Construction', 'Ready to Move', 'Resale'])
  @IsOptional()
  projectStatus?: string;

  @ApiProperty({
    description: 'Maintenance cost of the property',
    example: 6000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maintenanceCost?: number;

  @ApiProperty({
    description: 'Total number of floors (if applicable)',
    example: 6,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  totalFloors?: number;

  @ApiProperty({
    description: 'Floor number (if applicable)',
    example: 3,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  floorNo?: number;

  @ApiProperty({
    description: 'Number of car parking spaces',
    example: 2,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  carParking?: number;

  @ApiProperty({
    description: 'Facing direction of the property',
    enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'],
    example: 'South',
    required: false,
  })
  @IsEnum(['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'])
  @IsOptional()
  facing?: string;

  @ApiProperty({
    description: 'Who is listing the property',
    enum: ['Owner', 'Dealer', 'Builder'],
    example: 'Dealer',
    required: false,
  })
  @IsEnum(['Owner', 'Dealer', 'Builder'])
  @IsOptional()
  listedBy?: string;
}
