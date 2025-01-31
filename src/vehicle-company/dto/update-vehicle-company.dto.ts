import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleCompanyDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Tesla Motors', description: 'Updated name of the vehicle company' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'USA', description: 'Updated country of origin' })
  originCountry?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ 
    example: 'https://www.tesla.com/logo-updated.png', 
    description: 'Updated URL of the company logo (must be a valid image URL)' 
  })
  logo?: string;
}
