import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateManufacturerDto {
  @ApiPropertyOptional({
    description: 'The unique name of the manufacturer.',
    example: 'maruti-suzuki',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The display name of the manufacturer.',
    example: 'Maruti Suzuki',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'The country of origin of the manufacturer.',
    example: 'Japan',
  })
  @IsOptional()
  @IsString()
  originCountry?: string;

  @ApiPropertyOptional({
    description: 'Description of the manufacturer.',
    example: 'Leading automobile manufacturer in India',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL of the manufacturer logo.',
    example: 'https://example.com/maruti-logo.png',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Official website of the manufacturer.',
    example: 'https://www.marutisuzuki.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Year when the manufacturer was founded.',
    example: 1981,
  })
  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @ApiPropertyOptional({
    description: 'Headquarters location of the manufacturer.',
    example: 'New Delhi, India',
  })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({
    description: 'Whether the manufacturer is active.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
