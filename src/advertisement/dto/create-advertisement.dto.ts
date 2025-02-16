import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { VehicleTypes } from 'src/vehicles/enum/vehicle.type';

export enum AdvertisementType {
  Vehicle = 'Vehicle',
  Property = 'Property',
}

export enum FuelType {
  Petrol = 'Petrol',
  Diesel = 'Diesel',
  Electric = 'Electric',
  Hybrid = 'Hybrid',
}

export class CreateAdvertisementDto {
  @ApiProperty({
    enum: AdvertisementType,
    description: 'Type of advertisement. Allowed values: Vehicle, Property',
  })
  @IsEnum(AdvertisementType)
  type: AdvertisementType;

  @ApiProperty({
    enum: VehicleTypes,
    description: 'Type of vehicls. Allowed values: Car',
  })
  @IsEnum(VehicleTypes)
  modelType: VehicleTypes;

  @ApiProperty({ description: 'Title of the advertisement' })
  @IsString()
  @IsNotEmpty()
  adTitle: string;

  @ApiProperty({ description: 'Description of the advertisement' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Price of the advertised item', minimum: 0 })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Image URLs for the advertisement',
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageUrls: string[];

  @ApiProperty({ description: 'Full name of the advertiser' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Phone number of the advertiser' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'State where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'City where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'User ID of the creator',
    example: '609c1d1f4f1a2561d8e6b123',
  })
  @IsMongoId()
  @IsNotEmpty()
  createdBy: string;

  @ApiPropertyOptional({
    description: 'Approval status of the advertisement',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiProperty({
    description: 'User ID of the approver',
    example: '609c1d1f4f1a2561d8e6b456',
  })
  @IsMongoId()
  @IsNotEmpty()
  approvedBy: string;

  @ApiProperty({
    description: 'Category ID for the advertisement',
    example: '609c1d1f4f1a2561d8e6b789',
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Vehicle reference. Required if type is "Vehicle".',
    example: '609c1d1f4f1a2561d8e6babc',
  })
  @ValidateIf((o) => o.type === AdvertisementType.Vehicle)
  @IsNotEmpty({
    message: 'Vehicle reference is required for Vehicle type ads.',
  })
  @IsMongoId()
  vehicle?: string;

  @ApiPropertyOptional({
    description: 'Property reference. Required if type is "Property".',
    example: '609c1d1f4f1a2561d8e6bdef',
  })
  @ValidateIf((o) => o.type === AdvertisementType.Property)
  @IsNotEmpty({
    message: 'Property reference is required for Property type ads.',
  })
  @IsMongoId()
  property?: string;

  @ApiPropertyOptional({
    description:
      'Fuel type for the vehicle advertisement. Allowed values: Petrol, Diesel, Electric, Hybrid.',
    enum: FuelType,
  })
  @ValidateIf((o) => o.type === AdvertisementType.Vehicle)
  @IsNotEmpty({ message: 'Fuel type is required for Vehicle advertisements.' })
  @IsEnum(FuelType)
  fuelType?: FuelType;
}
