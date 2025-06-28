import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from 'src/vehicles/enum/vehicle.type';

export class FindVehicleDto {
  @ApiPropertyOptional({
    description: 'Vehicle name/brand',
    example: 'Honda',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Vehicle model name',
    example: 'City',
  })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({
    description: 'Vehicle color',
    example: 'White',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    enum: VehicleTypes,
    description: 'Type of vehicle',
  })
  @IsOptional()
  @IsEnum(VehicleTypes)
  vehicleType?: VehicleTypes;

  @ApiPropertyOptional({
    enum: WheelerType,
    description: 'Number of wheels',
  })
  @IsOptional()
  @IsEnum(WheelerType)
  wheelerType?: WheelerType;

  @ApiPropertyOptional({
    enum: FuelType,
    description: 'Fuel type',
  })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({
    enum: TransmissionType,
    description: 'Transmission type',
  })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @ApiPropertyOptional({
    description: 'Minimum model year',
    example: 2018,
  })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  modelYearMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum model year',
    example: 2023,
  })
  @IsOptional()
  @IsNumber()
  @Max(new Date().getFullYear() + 1)
  modelYearMax?: number;

  @ApiPropertyOptional({
    description: 'Minimum mileage',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mileageMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum mileage',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mileageMax?: number;

  @ApiPropertyOptional({
    description: 'Registration number',
    example: 'MH-01-AB-1234',
  })
  @IsOptional()
  @IsString()
  registrationNumber?: string;
}
