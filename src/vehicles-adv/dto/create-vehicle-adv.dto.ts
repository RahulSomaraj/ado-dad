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
import {
  FuelType,
  TransmissionType,
  VehicleTypes,
  WheelerType,
} from 'src/vehicles/enum/vehicle.type';

export class AdvVehicleDetailsDto {
  @ApiProperty({ example: 2023 })
  @IsNumber()
  @IsNotEmpty()
  modelYear: number;

  @ApiProperty({ example: 'March' })
  @IsString()
  @IsNotEmpty()
  month: string;
}

export class AdvAdditionalInfoDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  abs?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  accidental?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  adjustableExternalMirror?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  adjustableSteering?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  adjustableSeats?: boolean;

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

  // Updated: color as an array of strings.
  @ApiPropertyOptional({ example: ['Red'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color?: string[];

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  seatWarmer?: boolean;
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
    enum: FuelType,
  })
  @IsEnum(FuelType)
  @IsNotEmpty()
  fuelType: FuelType;

  @ApiProperty({
    example: 'Automatic',
    enum: TransmissionType,
  })
  @IsEnum(TransmissionType)
  @IsNotEmpty()
  transmissionType: TransmissionType;

  @ApiPropertyOptional({ example: '15' })
  @IsNumber()
  @IsNotEmpty()
  mileage: number;

  @ApiPropertyOptional({ example: '15' })
  @IsNumber()
  @IsNotEmpty()
  engineCapacity: number;

  @ApiPropertyOptional({ example: '15' })
  @IsNumber()
  @IsNotEmpty()
  fuelCapacity: number;

  @ApiPropertyOptional({ example: '15' })
  @IsNumber()
  @IsNotEmpty()
  maxPower: number;

  @ApiPropertyOptional({ type: AdvAdditionalInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvAdditionalInfoDto)
  additionalInfo?: AdvAdditionalInfoDto;
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

  @ApiPropertyOptional({ example: VehicleTypes.SEDAN, enum: VehicleTypes })
  @IsOptional()
  @IsEnum(VehicleTypes)
  modelType?: VehicleTypes;

  @ApiPropertyOptional({ example: WheelerType.TWO_WHEELER, enum: WheelerType })
  @IsOptional()
  @IsEnum(WheelerType)
  wheelerType?: WheelerType;

  @ApiProperty({ type: AdvVehicleDetailsDto })
  @ValidateNested()
  @Type(() => AdvVehicleDetailsDto)
  @IsNotEmpty()
  details: AdvVehicleDetailsDto;

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

  @ApiPropertyOptional({
    isArray: true,
    type: String,
    example: ['Red', 'Blue'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color?: string[];
}
