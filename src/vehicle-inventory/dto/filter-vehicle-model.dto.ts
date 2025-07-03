import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

export class FilterVehicleModelDto {
  @ApiPropertyOptional({
    description: 'Search vehicle models by name, display name, or description',
    example: 'swift',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by manufacturer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by vehicle type',
    enum: VehicleTypes,
    example: 'SUV',
  })
  @IsOptional()
  @IsEnum(VehicleTypes)
  vehicleType?: VehicleTypes;

  @ApiPropertyOptional({
    description: 'Filter by vehicle segment (A, B, C, D, E)',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({
    description: 'Filter by body type',
    example: 'Hatchback',
  })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum launch year',
    example: 2020,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(2030)
  minLaunchYear?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum launch year',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(2030)
  maxLaunchYear?: number;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by manufacturer name',
    example: 'Maruti Suzuki',
  })
  @IsOptional()
  @IsString()
  manufacturerName?: string;

  @ApiPropertyOptional({
    description: 'Filter by manufacturer origin country',
    example: 'Japan',
  })
  @IsOptional()
  @IsString()
  manufacturerCountry?: string;

  @ApiPropertyOptional({
    description: 'Filter by manufacturer category',
    enum: [
      'passenger_car',
      'two_wheeler',
      'commercial_vehicle',
      'luxury',
      'suv',
    ],
    example: 'passenger_car',
  })
  @IsOptional()
  @IsString()
  manufacturerCategory?: string;

  @ApiPropertyOptional({
    description: 'Filter by manufacturer region',
    enum: [
      'Asia',
      'Europe',
      'North America',
      'South America',
      'Africa',
      'Oceania',
    ],
    example: 'Asia',
  })
  @IsOptional()
  @IsString()
  manufacturerRegion?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum price of variants',
    example: 500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum price of variants',
    example: 2000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by fuel type',
    example: 'Petrol',
  })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({
    description: 'Filter by transmission type',
    example: 'Automatic',
  })
  @IsOptional()
  @IsString()
  transmissionType?: string;

  @ApiPropertyOptional({
    description: 'Filter by feature package',
    enum: [
      'Base',
      'L',
      'LX',
      'V',
      'VX',
      'Z',
      'ZX',
      'ZX(O)',
      'ZX+',
      'Top End',
      'Premium',
      'Executive',
      'Royale',
    ],
    example: 'VX',
  })
  @IsOptional()
  @IsString()
  featurePackage?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum seating capacity',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  minSeatingCapacity?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum seating capacity',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSeatingCapacity?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum engine capacity (cc)',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minEngineCapacity?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum engine capacity (cc)',
    example: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxEngineCapacity?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum mileage (km/l)',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minMileage?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum mileage (km/l)',
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxMileage?: number;

  @ApiPropertyOptional({
    description: 'Filter by turbocharged engines only',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  turbocharged?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with sunroof',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSunroof?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with alloy wheels',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAlloyWheels?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with automatic climate control',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAutomaticClimateControl?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with navigation',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasNavigation?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with parking sensors',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasParkingSensors?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with ABS',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasABS?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with airbags',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAirbags?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with leather seats',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLeatherSeats?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with LED headlamps',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLEDHeadlamps?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with touchscreen',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasTouchscreen?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with Android Auto',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAndroidAuto?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with Apple CarPlay',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAppleCarPlay?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with wireless charging',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasWirelessCharging?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with cruise control',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasCruiseControl?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with keyless entry',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasKeylessEntry?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with push button start',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPushButtonStart?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with power windows',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPowerWindows?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with power steering',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPowerSteering?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with central locking',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasCentralLocking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with immobilizer',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasImmobilizer?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with alarm system',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAlarmSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with Bluetooth',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasBluetooth?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with USB charging',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasUSBCharging?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with AM/FM radio',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAMFMRadio?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with CD player',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasCDPlayer?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with AUX input',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAUXInput?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with subwoofer',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSubwoofer?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with premium audio',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPremiumAudio?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with digital instrument cluster',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasDigitalInstrumentCluster?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with heads up display',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasHeadsUpDisplay?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with multi information display',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasMultiInformationDisplay?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with rear entertainment',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasRearEntertainment?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with parking camera',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasParkingCamera?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with 360 degree camera',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  has360DegreeCamera?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with automatic parking',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAutomaticParking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with sport mode',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSportMode?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with eco mode',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasEcoMode?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with paddle shifters',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPaddleShifters?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with launch control',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLaunchControl?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with adaptive suspension',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAdaptiveSuspension?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with sport suspension',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSportSuspension?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with height adjustable suspension',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasHeightAdjustableSuspension?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with one touch up/down windows',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasOneTouchUpDown?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with electric power steering',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasElectricPowerSteering?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with tilt steering',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasTiltSteering?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with telescopic steering',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasTelescopicSteering?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with steering mounted controls',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSteeringMountedControls?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with auto dimming IRVM',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAutoDimmingIrvm?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with auto folding IRVM',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAutoFoldingIrvm?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with vanity mirrors',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasVanityMirrors?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with cooled glove box',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasCooledGloveBox?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with sunglass holder',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSunglassHolder?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with umbrella holder',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasUmbrellaHolder?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with boot light',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasBootLight?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with puddle lamps',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPuddleLamps?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with welcome light',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasWelcomeLight?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with footwell lighting',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasFootwellLighting?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with engine immobilizer',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasEngineImmobilizer?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with security alarm',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSecurityAlarm?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with panic alarm',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPanicAlarm?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with theft alarm',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasTheftAlarm?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with vehicle tracking',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasVehicleTracking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with GPS tracking',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasGPSTracking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with remote locking',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasRemoteLocking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with remote unlocking',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasRemoteUnlocking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with remote start',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasRemoteStart?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with remote climate control',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasRemoteClimateControl?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with geofencing',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasGeofencing?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with valet mode',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasValetMode?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with service reminder',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasServiceReminder?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with maintenance schedule',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasMaintenanceSchedule?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with diagnostic system',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasDiagnosticSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with check engine light',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasCheckEngineLight?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with low fuel warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLowFuelWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with low oil warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLowOilWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with low tyre pressure warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLowTyrePressureWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with low wiper fluid warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasLowWiperFluidWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with battery warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasBatteryWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with door open warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasDoorOpenWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with seatbelt warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasSeatbeltWarning?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by models with handbrake warning',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasHandbrakeWarning?: boolean;

  // Pagination and sorting
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: [
      'name',
      'displayName',
      'vehicleType',
      'segment',
      'bodyType',
      'launchYear',
      'manufacturer.name',
      'manufacturer.displayName',
      'manufacturer.originCountry',
      'createdAt',
      'updatedAt',
    ],
    example: 'displayName',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'displayName';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
