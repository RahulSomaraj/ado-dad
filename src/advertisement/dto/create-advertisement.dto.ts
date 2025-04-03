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
    description: 'Type of advertisement. Allowed values: Vehicle, Property',
  })
  @IsEnum(AdvertisementType)
  type: AdvertisementType;

  @ApiProperty({ description: 'Description of the advertisement' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description:
      'Price in rupees. This value can be very large, so it is transformed to a number.',
    example: 1000000000, // example in rupees
  })
  @IsNotEmpty({ message: 'Price is required.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number.' })
  @Min(0, { message: 'Price must be at least 0.' })
  price: number;

  @ApiProperty({ description: 'State where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'City where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'City where the advertisement is posted' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({
    description: 'Category ID for the advertisement',
    example: '609c1d1f4f1a2561d8e6b789',
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;
}
