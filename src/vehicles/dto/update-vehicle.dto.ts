import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsMongoId,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  VehicleDetailsDto,
  AdditionalInfoDto,
  VehicleModelDto,
} from './create-vehicle.dto';

export class UpdateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Camry' })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiProperty({ type: VehicleDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleDetailsDto)
  details?: VehicleDetailsDto;

  @ApiProperty({ example: '60f6a4c1234567890abcdef2' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({ example: '60f6a4c1234567890abcdef3' })
  @IsOptional()
  @IsMongoId()
  vendor?: string;

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
