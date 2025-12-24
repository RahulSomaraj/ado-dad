import { IsOptional, IsString, IsUrl, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleCompanyDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Maruti Suzuki', description: 'Updated name of the vehicle company' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Maruti Suzuki', description: 'Updated display name for the manufacturer' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'India / Japan', description: 'Updated country of origin' })
  originCountry?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "India's largest passenger car manufacturer", description: 'Updated description of the manufacturer/company' })
  description?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ 
    example: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Maruti_Suzuki_Logo.png', 
    description: 'Updated URL of the company logo (must be a valid image URL)' 
  })
  logo?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ example: 'https://www.marutisuzuki.com', description: 'Updated official website URL of the company' })
  website?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1981, description: 'Updated year the company was founded' })
  foundedYear?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'New Delhi, India', description: 'Updated location of company headquarters' })
  headquarters?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Whether the manufacturer is active (boolean: true/false)' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false, description: 'Whether the manufacturer is premium (boolean: true/false)' })
  isPremium?: boolean;
}
