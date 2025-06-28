import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ValidateIf,
  IsNotEmpty,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { FuelType, VehicleTypes } from 'src/vehicles/enum/vehicle.type';
import { AdvertisementType } from './create-advertisement.dto';
import { CreatePropertyDto } from 'src/property/dto/create-property.dto';
import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateAdvertisementDto {
  @ApiPropertyOptional({
    enum: AdvertisementType,
    description: 'Type of advertisement. Allowed values: Vehicle, Property.',
  })
  @IsOptional()
  @IsEnum(AdvertisementType)
  type?: AdvertisementType;

  @IsOptional()
  @IsEnum(VehicleTypes)
  modelType?: VehicleTypes;

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
  @Type(() => Number)
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
    description: 'District where the advertisement is posted',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    description: 'Name of user who posted the ad',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number of user who posted the ad',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Approval status of the advertisement',
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

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

  @ApiPropertyOptional({
    description: 'Vehicle details. Optional for updates',
    type: CreateVehicleDto,
  })
  @ValidateIf((o) => o.type === AdvertisementType.Vehicle)
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle?: CreateVehicleDto;

  @ApiPropertyOptional({
    description: 'Property details. Optional for updates',
    type: CreatePropertyDto,
  })
  @ValidateIf((o) => o.type === AdvertisementType.Property)
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePropertyDto)
  property?: CreatePropertyDto;
}
