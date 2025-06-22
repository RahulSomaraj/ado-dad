import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ArrayNotEmpty,
  ValidateNested,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { CreatePropertyDto } from 'src/property/dto/create-property.dto';
import { CreateVehicleAdvDto } from 'src/vehicles-adv/dto/create-vehicle-adv.dto';
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from 'src/vehicles/enum/vehicle.type';

export enum AdvertisementType {
  Vehicle = 'Vehicle',
  Property = 'Property',
}

export class CreateAdvertisementDto {
  @ApiProperty({
    enum: AdvertisementType,
    description: 'Type of advertisement',
    example: AdvertisementType.Vehicle,
  })
  @IsEnum(AdvertisementType)
  type: AdvertisementType;

  @ApiProperty({
    description: 'Title of the advertisement',
    example: 'Beautiful 3BHK Apartment for Sale',
  })
  @IsString()
  @IsNotEmpty()
  adTitle: string;

  @ApiProperty({
    description: 'Detailed description of the advertisement',
    example: 'Spacious apartment with modern amenities...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Contact name for the advertisement',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+91-9876543210',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Price in rupees',
    example: 2500000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price must be at least 0' })
  price: number;

  @ApiProperty({
    description: 'Array of image URLs',
    type: [String],
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageUrls: string[];

  @ApiProperty({
    description: 'State where the advertisement is located',
    example: 'Maharashtra',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'City where the advertisement is located',
    example: 'Mumbai',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'District where the advertisement is located',
    example: 'Mumbai Suburban',
  })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional({
    description: 'Approval status of the advertisement',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiProperty({
    description: 'Category ID for the advertisement',
    example: '609c1d1f4f1a2561d8e6b789',
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Vehicle details. Required if type is Vehicle',
    type: CreateVehicleAdvDto,
  })
  @ValidateIf((o) => o.type === AdvertisementType.Vehicle)
  @IsNotEmpty({ message: 'Vehicle details are required for Vehicle type ads' })
  @ValidateNested()
  @Type(() => CreateVehicleAdvDto)
  vehicle?: CreateVehicleAdvDto;

  @ApiPropertyOptional({
    description: 'Property details. Required if type is Property',
    type: CreatePropertyDto,
  })
  @ValidateIf((o) => o.type === AdvertisementType.Property)
  @IsNotEmpty({
    message: 'Property details are required for Property type ads',
  })
  @ValidateNested()
  @Type(() => CreatePropertyDto)
  property?: CreatePropertyDto;
}
