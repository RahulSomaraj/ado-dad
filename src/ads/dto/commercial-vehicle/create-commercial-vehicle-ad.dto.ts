import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseAdDto } from '../common/base-ad.dto';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../../schemas/commercial-vehicle-ad.schema';

export class CreateCommercialVehicleAdDto extends BaseAdDto {
  @ApiProperty({
    description: 'Commercial Vehicle type',
    enum: CommercialVehicleTypeEnum,
  })
  @IsEnum(CommercialVehicleTypeEnum)
  CommercialVehicleType: CommercialVehicleTypeEnum;

  @ApiProperty({ description: 'Body type', enum: BodyTypeEnum })
  @IsEnum(BodyTypeEnum)
  bodyType: BodyTypeEnum;

  @ApiProperty({ description: 'Manufacturer ID (MongoDB ObjectId)' })
  @IsString()
  manufacturerId: string;

  @ApiProperty({ description: 'Vehicle model ID (MongoDB ObjectId)' })
  @IsString()
  modelId: string;

  @ApiPropertyOptional({ description: 'Vehicle variant ID (MongoDB ObjectId)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Manufacturing year' })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ description: 'Vehicle mileage' })
  @IsNumber()
  @Min(0)
  mileage: number;

  @ApiProperty({ description: 'Payload capacity' })
  @IsNumber()
  @Min(0)
  payloadCapacity: number;

  @ApiPropertyOptional({ description: 'Payload unit (tons, kg, etc.)' })
  @IsOptional()
  @IsString()
  payloadUnit?: string;

  @ApiProperty({ description: 'Number of axles' })
  @IsNumber()
  @Min(1)
  @Max(10)
  axleCount: number;

  @ApiProperty({ description: 'Transmission type ID (MongoDB ObjectId)' })
  @IsString()
  transmissionTypeId: string;

  @ApiProperty({ description: 'Fuel type ID (MongoDB ObjectId)' })
  @IsString()
  fuelTypeId: string;

  @ApiPropertyOptional({ description: 'Vehicle color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Has insurance' })
  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiPropertyOptional({ description: 'Has fitness certificate' })
  @IsOptional()
  @IsBoolean()
  hasFitness?: boolean;

  @ApiPropertyOptional({ description: 'Has permit' })
  @IsOptional()
  @IsBoolean()
  hasPermit?: boolean;

  @ApiPropertyOptional({ description: 'Additional features' })
  @IsOptional()
  @IsString()
  additionalFeatures?: string;

  @ApiPropertyOptional({ description: 'Seating capacity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seatingCapacity?: number;
}
