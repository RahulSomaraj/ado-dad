import { IsNotEmpty, IsString, IsUrl, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleCompanyDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Maruti Suzuki', description: 'Name of the vehicle company (required)' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Maruti Suzuki', description: 'Display name for the manufacturer' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'India / Japan', description: 'Country of origin' })
  originCountry?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "India's largest passenger car manufacturer; joint venture between Maruti and Suzuki", description: 'Description of the manufacturer/company' })
  description?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ 
    example: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Maruti_Suzuki_Logo.png', 
    description: 'URL of the company logo (must be a valid image URL)' 
  })
  logo?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ example: 'https://www.marutisuzuki.com', description: 'Official website URL of the company' })
  website?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1981, description: 'Year the company was founded' })
  foundedYear?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'New Delhi, India', description: 'Location of company headquarters' })
  headquarters?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Whether the manufacturer is active (boolean: true/false)', default: true })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false, description: 'Whether the manufacturer is premium (boolean: true/false)', default: false })
  isPremium?: boolean;
}
