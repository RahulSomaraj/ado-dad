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

export class AdditionalAdvInfoDto {
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

export class VehicleModelAdvDto {
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

  @ApiProperty({ example: 15 })
  @IsNumber()
  @IsNotEmpty()
  mileage: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @IsNotEmpty()
  engineCapacity: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @IsNotEmpty()
  fuelCapacity: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @IsNotEmpty()
  maxPower: number;

  @ApiPropertyOptional({ type: AdditionalAdvInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalAdvInfoDto)
  additionalInfo?: AdditionalAdvInfoDto;
}

export class VehicleDetailsAdvDto {
  @ApiProperty({ example: 2023 })
  @IsNumber()
  @IsNotEmpty()
  modelYear: number;

  @ApiProperty({ example: 'March' })
  @IsString()
  @IsNotEmpty()
  month: string;
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

  @ApiPropertyOptional({
    example: 'Red',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ type: VehicleDetailsAdvDto })
  @ValidateNested()
  @Type(() => VehicleDetailsAdvDto)
  @IsNotEmpty()
  details: VehicleDetailsAdvDto;

  @ApiProperty({ example: '67b349d2c0ec145884f86926' })
  @IsMongoId()
  @IsNotEmpty()
  vendor: string;

  @ApiPropertyOptional({
    type: VehicleModelAdvDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleModelAdvDto)
  vehicleModel?: VehicleModelAdvDto;
}
