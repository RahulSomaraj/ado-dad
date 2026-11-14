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
import { VehicleTypeEnum } from '../../schemas/vehicle-ad.schema';

export class CreateVehicleAdDto extends BaseAdDto {
  @ApiProperty({ description: 'Vehicle type', enum: VehicleTypeEnum })
  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

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

  @ApiPropertyOptional({ description: 'Is first owner' })
  @IsOptional()
  @IsBoolean()
  isFirstOwner?: boolean;

  @ApiPropertyOptional({ description: 'Has insurance' })
  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiPropertyOptional({ description: 'Has RC book' })
  @IsOptional()
  @IsBoolean()
  hasRcBook?: boolean;

  @ApiPropertyOptional({ description: 'Additional features' })
  @IsOptional()
  @IsString()
  additionalFeatures?: string;
}
