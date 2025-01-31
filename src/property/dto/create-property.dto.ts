import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Title of the property',
    example: 'Beautiful House for Sale',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the property',
    example: 'A 3-bedroom house in a prime location.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Price of the property',
    example: 500000,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Location of the property',
    example: 'New York, NY',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Area of the property in square feet',
    example: 1200,
  })
  @IsNumber()
  @Min(0)
  area: number;

  @ApiProperty({
    description: 'List of image URLs of the property',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({
    description: 'Type of the property',
    enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
    example: 'house',
  })
  @IsEnum(['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'])
  type: string;

  @ApiProperty({
    description: 'Category of the property',
    enum: ['forSale', 'forRent', 'landsAndPlots'],
    example: 'forSale',
  })
  @IsEnum(['forSale', 'forRent', 'landsAndPlots'])
  category: string;

  @ApiProperty({
    description: 'Number of BHK (for house, apartment, PG)',
    example: 3,
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
    example: 'Furnished',
    required: false,
  })
  @IsEnum(['Furnished', 'Semi-Furnished', 'Unfurnished'])
  @IsOptional()
  furnished?: string;

  @ApiProperty({
    description: 'Project status (if applicable)',
    enum: ['Under Construction', 'Ready to Move', 'Resale'],
    example: 'Ready to Move',
    required: false,
  })
  @IsEnum(['Under Construction', 'Ready to Move', 'Resale'])
  @IsOptional()
  projectStatus?: string;

  @ApiProperty({
    description: 'Maintenance cost of the property',
    example: 5000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maintenanceCost?: number;

  @ApiProperty({
    description: 'Total number of floors (if applicable)',
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  totalFloors?: number;

  @ApiProperty({
    description: 'Floor number (if applicable)',
    example: 2,
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
    example: 'North',
    required: false,
  })
  @IsEnum(['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'])
  @IsOptional()
  facing?: string;

  @ApiProperty({
    description: 'Who is listing the property',
    enum: ['Owner', 'Dealer', 'Builder'],
    example: 'Owner',
  })
  @IsEnum(['Owner', 'Dealer', 'Builder'])
  listedBy: string;
}
