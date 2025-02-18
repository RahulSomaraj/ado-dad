import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VehicleDetailsDto {
  @ApiProperty({ example: 2023 })
  @IsNumber()
  @IsNotEmpty()
  modelYear: number;

  @ApiProperty({ example: 'March' })
  @IsString()
  @IsNotEmpty()
  month: string;
}

export class AdditionalInfoDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  abs?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  adjustableExternalMirror?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  adjustableSteering?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  airConditioning?: boolean;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  numberOfAirbags?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  alloyWheels?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  auxCompatibility?: boolean;

  @ApiPropertyOptional({ example: 'Good' })
  @IsOptional()
  @IsString()
  batteryCondition?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  bluetooth?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  vehicleCertified?: boolean;

  @ApiPropertyOptional({ example: 'Red' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  cruiseControl?: boolean;

  @ApiPropertyOptional({ example: 'Full Coverage' })
  @IsOptional()
  @IsString()
  insuranceType?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  lockSystem?: boolean;

  @ApiPropertyOptional({ example: 'January' })
  @IsOptional()
  @IsString()
  makeMonth?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  navigationSystem?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  parkingSensors?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  powerSteering?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  powerWindows?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  amFmRadio?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  rearParkingCamera?: boolean;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  registrationPlace?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  exchange?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  finance?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  serviceHistory?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  sunroof?: boolean;

  @ApiPropertyOptional({ example: 'Good' })
  @IsOptional()
  @IsString()
  tyreCondition?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  usbCompatibility?: boolean;

  @ApiPropertyOptional({ example: '60f6a4c1234567890abcdef1' })
  @IsOptional()
  @IsMongoId()
  vendor?: string;
}

export class VehicleModelDto {
  @ApiProperty({ example: 'Model X' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'X1' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiPropertyOptional({ example: 'Latest model details' })
  @IsOptional()
  @IsString()
  modelDetails?: string;

  @ApiPropertyOptional({
    isArray: true,
    type: String,
    example: [
      'https://example.com/model1.jpg',
      'https://example.com/model2.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    example: 'Petrol',
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
  })
  @IsEnum(['Petrol', 'Diesel', 'Electric', 'Hybrid'])
  @IsNotEmpty()
  fuelType: string;

  @ApiProperty({
    example: 'Automatic',
    enum: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'],
  })
  @IsEnum(['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'])
  @IsNotEmpty()
  transmissionType: string;

  @ApiProperty({ example: '15km/l' })
  @IsString()
  @IsNotEmpty()
  mileage: string;

  @ApiPropertyOptional({ type: AdditionalInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalInfoDto)
  additionalInfo?: AdditionalInfoDto;
}

export class CreateVehicleAdvDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({ type: VehicleDetailsDto })
  @ValidateNested()
  @Type(() => VehicleDetailsDto)
  @IsNotEmpty()
  details: VehicleDetailsDto;

  @ApiProperty({ example: '60f6a4c1234567890abcdef2' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiProperty({ example: '60f6a4c1234567890abcdef3' })
  @IsMongoId()
  @IsNotEmpty()
  vendor: string;

  @ApiPropertyOptional({
    isArray: true,
    type: VehicleModelDto,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleModelDto)
  vehicleModels?: VehicleModelDto[];
}
