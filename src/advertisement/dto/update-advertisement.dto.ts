import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import { AdvertisementType } from './create-advertisement.dto';
import { FuelType, VehicleTypes } from 'src/vehicles/enum/vehicle.type';

export class UpdateAdvertisementDto {
  @ApiPropertyOptional({
    enum: AdvertisementType,
    description: 'Type of advertisement. Allowed values: Vehicle, Property.',
  })
  @IsOptional()
  @IsEnum(AdvertisementType)
  type?: AdvertisementType;

  @ApiPropertyOptional({
    enum: VehicleTypes,
    description: 'Type of vehicls. Allowed values: Car',
  })
  @IsEnum(VehicleTypes)
  modelType: VehicleTypes;

  @ApiPropertyOptional({ description: 'Title of the advertisement' })
  @IsOptional()
  @IsString()
  adTitle?: string;

  @ApiPropertyOptional({ description: 'Description of the advertisement' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Price of the advertised item',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    description: 'Image URLs for the advertisement',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'Full name of the advertiser' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Phone number of the advertiser' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'State where the advertisement is posted',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'City where the advertisement is posted',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'User ID of the creator',
    example: '609c1d1f4f1a2561d8e6b123',
  })
  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Category ID for the advertisement',
    example: '609c1d1f4f1a2561d8e6b789',
  })
  @IsOptional()
  @IsMongoId()
  category?: string;

  @ApiPropertyOptional({
    description:
      'Fuel type for the vehicle advertisement. Allowed values: Petrol, Diesel, Electric, Hybrid.',
    enum: FuelType,
  })
  @ValidateIf((o) => o.type === AdvertisementType.Vehicle)
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;
}
