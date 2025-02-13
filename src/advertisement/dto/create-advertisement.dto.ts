import { IsString, IsNotEmpty, IsNumber, Min, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Enums for structured data
enum FuelType {
  Petrol = 'Petrol',
  Diesel = 'Diesel',
  Electric = 'Electric',
  Hybrid = 'Hybrid',
}

enum TransmissionType {
  Manual = 'Manual',
  Automatic = 'Automatic',
}

export class CreateAdvertisementDto {
  @ApiProperty({
    description: 'Type of advertisement, either "Vehicle" or "Property"',
    enum: ['Vehicle', 'Property'],
    example: 'Vehicle',
  })
  @IsEnum(['Vehicle', 'Property'])
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Title of the advertisement', example: 'Affordable Family Car for Sale' })
  @IsString()
  @IsNotEmpty()
  adTitle: string;

  @ApiProperty({ description: 'Description of the advertisement', example: 'Well-maintained family car, single owner, excellent mileage.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Price of the advertisement', example: 15000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Array of image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  imageUrls: string[];

  @ApiProperty({ description: 'Full name of the advertiser', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Phone number of the advertiser', example: '1234567890' })
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

  // ------------------------ Vehicle-Specific Fields ------------------------
  
  @ApiProperty({ description: 'Brand name of the vehicle', example: 'Toyota' })
  @IsString()
  @IsOptional()
  brandName?: string;

  @ApiProperty({ description: 'Model name of the vehicle', example: 'Corolla' })
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiProperty({ description: 'Year of manufacturing', example: '2020' })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiProperty({ description: 'Kilometers driven', example: 25000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  kmDriven?: number;

  @ApiProperty({ description: 'Fuel type of the vehicle', enum: FuelType, example: 'Petrol' })
  @IsEnum(FuelType)
  @IsOptional()
  fuelType?: FuelType;

  @ApiProperty({ description: 'Transmission type', enum: TransmissionType, example: 'Automatic' })
  @IsEnum(TransmissionType)
  @IsOptional()
  transmission?: TransmissionType;

  // ------------------------ Property-Specific Fields ------------------------

  @ApiProperty({ description: 'Type of the property', enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'], example: 'house' })
  @IsEnum(['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'])
  @IsOptional()
  propertyType?: string;

  @ApiProperty({ description: 'Number of BHK (for residential properties)', example: 3 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  bhk?: number;

  @ApiProperty({ description: 'Number of bathrooms', example: 2 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  bathrooms?: number;

  @ApiProperty({ description: 'Furnishing status', enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'], example: 'Furnished' })
  @IsEnum(['Furnished', 'Semi-Furnished', 'Unfurnished'])
  @IsOptional()
  furnished?: string;

  @ApiProperty({ description: 'Project status', enum: ['Under Construction', 'Ready to Move', 'Resale'], example: 'Ready to Move' })
  @IsEnum(['Under Construction', 'Ready to Move', 'Resale'])
  @IsOptional()
  projectStatus?: string;

  @ApiProperty({ description: 'Total number of floors', example: 5 })
  @IsNumber()
  @IsOptional()
  totalFloors?: number;

  @ApiProperty({ description: 'Floor number', example: 2 })
  @IsNumber()
  @IsOptional()
  floorNo?: number;

  @ApiProperty({ description: 'Number of car parking spaces', example: 2 })
  @IsNumber()
  @IsOptional()
  carParking?: number;

  @ApiProperty({ description: 'Facing direction of the property', enum: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'], example: 'North' })
  @IsEnum(['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'])
  @IsOptional()
  facing?: string;

  @ApiProperty({ description: 'Who is listing the property', enum: ['Owner', 'Dealer', 'Builder'], example: 'Owner' })
  @IsEnum(['Owner', 'Dealer', 'Builder'])
  @IsOptional()
  listedBy?: string;
}
