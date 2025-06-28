import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from 'src/vehicles/enum/vehicle.type';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Vehicle name/brand',
    example: 'Honda City',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Vehicle model name',
    example: 'City',
  })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({
    description: 'Vehicle color',
    example: 'White',
  })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({
    enum: VehicleTypes,
    description: 'Type of vehicle',
    example: VehicleTypes.SEDAN,
  })
  @IsEnum(VehicleTypes)
  vehicleType: VehicleTypes;

  @ApiProperty({
    enum: WheelerType,
    description: 'Number of wheels',
    example: WheelerType.FOUR_WHEELER,
  })
  @IsEnum(WheelerType)
  wheelerType: WheelerType;

  @ApiProperty({
    enum: FuelType,
    description: 'Fuel type',
    example: FuelType.PETROL,
  })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiProperty({
    enum: TransmissionType,
    description: 'Transmission type',
    example: TransmissionType.MANUAL,
  })
  @IsEnum(TransmissionType)
  transmissionType: TransmissionType;

  @ApiProperty({
    description: 'Model year',
    example: 2020,
  })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  modelYear: number;

  @ApiProperty({
    description: 'Mileage in km/l',
    example: 15.5,
  })
  @IsNumber()
  @Min(0)
  mileage: number;

  @ApiPropertyOptional({
    description: 'Engine capacity in cc',
    example: 1498,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  engineCapacity?: number;

  @ApiPropertyOptional({
    description: 'Number of seats',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seats?: number;

  @ApiPropertyOptional({
    description: 'Registration number',
    example: 'MH-01-AB-1234',
  })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Insurance expiry date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({
    description: 'PUC expiry date',
    example: '2024-06-30',
  })
  @IsOptional()
  @IsString()
  pucExpiry?: string;

  @ApiPropertyOptional({
    description: 'Additional features',
    example: ['ABS', 'Air Conditioning', 'Power Steering'],
  })
  @IsOptional()
  @IsString({ each: true })
  features?: string[];
}
