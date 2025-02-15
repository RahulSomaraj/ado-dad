import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindVehicleCompaniesDto {
  @ApiPropertyOptional({
    description: 'Vehicle company name',
    example: 'Tesla',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Origin country of the vehicle company',
    example: 'USA',
  })
  @IsOptional()
  @IsString()
  originCountry?: string;
}
