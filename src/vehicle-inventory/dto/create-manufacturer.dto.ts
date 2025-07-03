import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateManufacturerDto {
  @ApiProperty({
    description: 'The unique name of the manufacturer.',
    example: 'maruti-suzuki',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The display name of the manufacturer.',
    example: 'Maruti Suzuki',
  })
  @IsString()
  displayName: string;

  @ApiProperty({
    description: 'The country of origin of the manufacturer.',
    example: 'Japan',
  })
  @IsString()
  originCountry: string;

  @ApiProperty({
    description: 'Description of the manufacturer.',
    example: 'Leading automobile manufacturer in India',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL of the manufacturer logo.',
    example: 'https://example.com/maruti-logo.png',
  })
  @IsUrl()
  logo: string;

  @ApiProperty({
    description: 'Official website of the manufacturer.',
    example: 'https://www.marutisuzuki.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'Year when the manufacturer was founded.',
    example: 1981,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @ApiProperty({
    description: 'Headquarters location of the manufacturer.',
    example: 'New Delhi, India',
    required: false,
  })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiProperty({
    description: 'Whether the manufacturer is active.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
