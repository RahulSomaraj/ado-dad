import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

/**
 * Filters for AdditionalInfo fields within each vehicle model.
 */
export class FindAdditionalInfoDto {
  @ApiPropertyOptional({ example: true, description: 'ABS availability' })
  @IsOptional()
  abs?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Adjustable external mirror',
  })
  @IsOptional()
  adjustableExternalMirror?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Adjustable steering' })
  @IsOptional()
  adjustableSteering?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Air conditioning available',
  })
  @IsOptional()
  airConditioning?: boolean;

  @ApiPropertyOptional({ example: 6, description: 'Number of airbags' })
  @IsOptional()
  numberOfAirbags?: number;

  @ApiPropertyOptional({ example: true, description: 'Alloy wheels available' })
  @IsOptional()
  alloyWheels?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Aux compatibility' })
  @IsOptional()
  auxCompatibility?: boolean;

  @ApiPropertyOptional({ example: 'Good', description: 'Battery condition' })
  @IsOptional()
  @IsString()
  batteryCondition?: string;

  @ApiPropertyOptional({ example: true, description: 'Bluetooth available' })
  @IsOptional()
  bluetooth?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Vehicle is certified' })
  @IsOptional()
  vehicleCertified?: boolean;

  @ApiPropertyOptional({ example: 'Red', description: 'Vehicle color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Cruise control available',
  })
  @IsOptional()
  cruiseControl?: boolean;

  @ApiPropertyOptional({
    example: 'Full Coverage',
    description: 'Insurance type',
  })
  @IsOptional()
  @IsString()
  insuranceType?: string;

  @ApiPropertyOptional({ example: true, description: 'Lock system available' })
  @IsOptional()
  lockSystem?: boolean;

  @ApiPropertyOptional({ example: 'January', description: 'Make month' })
  @IsOptional()
  @IsString()
  makeMonth?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Navigation system available',
  })
  @IsOptional()
  navigationSystem?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Parking sensors available',
  })
  @IsOptional()
  parkingSensors?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Power steering available',
  })
  @IsOptional()
  powerSteering?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Power windows available',
  })
  @IsOptional()
  powerWindows?: boolean;

  @ApiPropertyOptional({ example: true, description: 'AM/FM radio available' })
  @IsOptional()
  amFmRadio?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Rear parking camera available',
  })
  @IsOptional()
  rearParkingCamera?: boolean;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'Registration place',
  })
  @IsOptional()
  @IsString()
  registrationPlace?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Exchange option available',
  })
  @IsOptional()
  exchange?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Finance option available',
  })
  @IsOptional()
  finance?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Service history available',
  })
  @IsOptional()
  serviceHistory?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Sunroof available' })
  @IsOptional()
  sunroof?: boolean;

  @ApiPropertyOptional({ example: 'Good', description: 'Tyre condition' })
  @IsOptional()
  @IsString()
  tyreCondition?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'USB compatibility available',
  })
  @IsOptional()
  usbCompatibility?: boolean;
}

/**
 * Filters for properties inside a vehicle model.
 */
export class FindVehicleModelDto {
  @ApiPropertyOptional({
    example: 'Model X',
    description: 'Vehicle model variant name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'X1',
    description: 'Vehicle model code/name',
  })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({
    example: 'Latest model details',
    description: 'Additional details about the vehicle model',
  })
  @IsOptional()
  @IsString()
  modelDetails?: string;

  @ApiPropertyOptional({
    example: 'Petrol',
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    description: 'Fuel type',
  })
  @IsOptional()
  @IsEnum(['Petrol', 'Diesel', 'Electric', 'Hybrid'])
  fuelType?: string;

  @ApiPropertyOptional({
    example: 'Automatic',
    enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
    description: 'Transmission type',
  })
  @IsOptional()
  @IsEnum(['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'])
  transmissionType?: string;

  @ApiPropertyOptional({ example: '15km/l', description: 'Mileage' })
  @IsOptional()
  @IsString()
  mileage?: string;

  @ApiPropertyOptional({
    type: FindAdditionalInfoDto,
    description: 'Filter for additional info',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FindAdditionalInfoDto)
  additionalInfo?: FindAdditionalInfoDto;
}

/**
 * Main DTO for searching vehicles.
 */
export class FindVehicleDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '60f6a4c1234567890abcdef1',
    description: 'Vendor ID for AdditionalInfo',
  })
  @IsOptional()
  @IsMongoId()
  vendor?: string;

  @ApiPropertyOptional({ example: 'Toyota', description: 'Vehicle brand name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Camry', description: 'Vehicle model name' })
  @IsOptional()
  @IsString()
  modelName?: string;

  // Filtering by details fields (which are stored in the "details" sub-document)

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  modelYear?: number;

  @ApiPropertyOptional({
    example: 'March',
    description: 'Manufacturing month from vehicle details',
  })
  @IsOptional()
  @IsString()
  month?: string;

  // Nested filter for vehicle models
  @ApiPropertyOptional({
    type: FindVehicleModelDto,
    description: 'Filter based on vehicle model properties',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FindVehicleModelDto)
  vehicleModel?: FindVehicleModelDto;
}
