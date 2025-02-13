import { IsString, IsNotEmpty, IsNumber, Min, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdvertisementDto {
  @ApiProperty({ description: 'Title of the advertisement', example: 'Affordable Family Car for Sale' })
  @IsString()
  @IsNotEmpty()
  adTitle: string;

  @ApiProperty({ description: 'Description of the advertisement', example: 'A well-maintained family car, single owner, excellent mileage, and recently serviced.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Price of the advertisement', example: 15000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Array of image URLs',
    example: ['https://example.com/car1.jpg', 'https://example.com/car2.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  imageUrls: string[];

  @ApiProperty({ description: 'Full name of the person', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Phone number of the person', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'State where the advertisement is located', example: 'California' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'City where the advertisement is located', example: 'Los Angeles' })
  @IsString()
  @IsNotEmpty()
  city: string;

  // ------------------------ Property-Specific Fields ------------------------

  @ApiProperty({
    description: 'Type of the property',
    enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
    example: 'house',
  })
  @IsEnum(['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Number of BHK', example: 3, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  bhk?: number;

  @ApiProperty({ description: 'Number of bathrooms', example: 2, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  bathrooms?: number;

  @ApiProperty({
    description: 'Furnishing status',
    enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
    example: 'Furnished',
  })
  @IsEnum(['Furnished', 'Semi-Furnished', 'Unfurnished'])
  @IsOptional()
  furnished?: string;

  @ApiProperty({
    description: 'Project status',
    enum: ['Under Construction', 'Ready to Move', 'Resale'],
    example: 'Ready to Move',
  })
  @IsEnum(['Under Construction', 'Ready to Move', 'Resale'])
  @IsOptional()
  projectStatus?: string;

  @ApiProperty({ description: 'Area of the property in square feet', example: 1200 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  area?: number;

  @ApiProperty({ description: 'Maintenance cost of the property', example: 5000 })
  @IsNumber()
  @IsOptional()
  maintenanceCost?: number;

  @ApiProperty({ description: 'Total number of floors', example: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalFloors?: number;

  @ApiProperty({ description: 'Floor number', example: 2 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  floorNo?: number;

  @ApiProperty({ description: 'Number of car parking spaces', example: 2 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  carParking?: number;

  @ApiProperty({
    description: 'Facing direction of the property',
    enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'],
    example: 'North',
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
  @IsOptional()
  listedBy?: string;
}
