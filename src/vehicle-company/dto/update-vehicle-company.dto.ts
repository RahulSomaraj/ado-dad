import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WheelerType } from 'src/vehicles/enum/vehicle.type';

export class UpdateVehicleCompanyDto {
  @ApiPropertyOptional({
    example: 'Tesla Motors',
    description: 'Updated name of the vehicle company',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Updated country of origin',
  })
  @IsOptional()
  @IsString()
  originCountry?: string;

  @ApiPropertyOptional({
    example: 'two-wheeler',
    description: 'two-wheeler, four-wheeler',
  })
  @IsEnum(WheelerType)
  @IsNotEmpty()
  @IsOptional()
  vehicleType: WheelerType;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({
    example: 'https://www.tesla.com/logo-updated.png',
    description: 'Updated URL of the company logo (must be a valid image URL)',
  })
  logo?: string;
}
