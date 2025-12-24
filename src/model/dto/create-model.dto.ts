import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, IsIn, IsMongoId } from 'class-validator';
import { VALID_FUEL_TYPES, VALID_TRANSMISSION_TYPES, VALID_VEHICLE_TYPES } from '../../common/constants/vehicle.constants';

export class CreateModelDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Toyota Camry', description: 'Name of the vehicle model (required)' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Toyota Camry', description: 'Display name for the model' })
  displayName?: string;

  @IsOptional()
  @IsEnum(VALID_VEHICLE_TYPES)
  @ApiPropertyOptional({ 
    example: 'Sedan', 
    description: `Vehicle type - must be one of: ${VALID_VEHICLE_TYPES.join(', ')}` 
  })
  vehicleType?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'A mid-size sedan with excellent fuel economy', description: 'Description of the vehicle model' })
  description?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2023, description: 'Year the model was launched' })
  launchYear?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Mid-Size', description: 'Vehicle segment' })
  segment?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Sedan', description: 'Body type of the vehicle' })
  bodyType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ 
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'], 
    description: 'Array of image URLs' 
  })
  images?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'https://example.com/brochure.pdf', description: 'URL to the vehicle brochure' })
  brochureUrl?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false, description: 'Whether this is a commercial vehicle (boolean: true/false)', default: false })
  isCommercialVehicle?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Light Commercial Vehicle', description: 'Type of commercial vehicle' })
  commercialVehicleType?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Pickup', description: 'Commercial body type' })
  commercialBodyType?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1000, description: 'Default payload capacity' })
  defaultPayloadCapacity?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2, description: 'Default number of axles' })
  defaultAxleCount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'kg', description: 'Unit for payload capacity (e.g., kg, tons)' })
  defaultPayloadUnit?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 5, description: 'Default seating capacity' })
  defaultSeatingCapacity?: number;

  @IsOptional()
  @IsArray()
  @IsIn(VALID_FUEL_TYPES, { each: true })
  @ApiPropertyOptional({ 
    example: ['petrol', 'diesel', 'hybrid_petrol'], 
    description: `Array of available fuel types. Valid values: ${VALID_FUEL_TYPES.join(', ')}` 
  })
  fuelTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(VALID_TRANSMISSION_TYPES, { each: true })
  @ApiPropertyOptional({ 
    example: ['manual_5', 'automatic_6'], 
    description: `Array of available transmission types. Valid values: ${VALID_TRANSMISSION_TYPES.join(', ')}` 
  })
  transmissionTypes?: string[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Whether the model is active (boolean: true/false)', default: true })
  isActive?: boolean;

  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Manufacturer ID (MongoDB ObjectId) - required' })
  manufacturerId: string;
}
