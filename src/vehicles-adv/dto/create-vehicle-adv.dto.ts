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
  @ApiPropertyOptional({ example: 'Model X' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'X1' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiPropertyOptional({ example: 'Latest model details' })
  @IsOptional()
  @IsString()
  modelDetails?: string;

  @ApiPropertyOptional({
    example: 'Petrol',
    enum: FuelType,
  })
  @IsOptional()
  @IsEnum(FuelType)
  @IsNotEmpty()
  fuelType: FuelType;

  @ApiPropertyOptional({
    example: 'Automatic',
    enum: TransmissionType,
  })
  @IsOptional()
  @IsEnum(TransmissionType)
  @IsNotEmpty()
  transmissionType: TransmissionType;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  mileage: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  engineCapacity: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  fuelCapacity: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
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
  @ApiPropertyOptional({ example: 2023 })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  modelYear: number;

  @ApiPropertyOptional({ example: 'March' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  month: string;
}

export class CreateVehicleAdvDto {
  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Camry' })
  @IsOptional()
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

  @ApiPropertyOptional({ type: VehicleDetailsAdvDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleDetailsAdvDto)
  @IsNotEmpty()
  details: VehicleDetailsAdvDto;

  @ApiPropertyOptional({ example: '67b349d2c0ec145884f86926' })
  @IsOptional()
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
