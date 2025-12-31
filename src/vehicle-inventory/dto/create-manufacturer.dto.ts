import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
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

  @ApiPropertyOptional({
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

  @ApiPropertyOptional({
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

  @ApiPropertyOptional({
    description: 'Whether the manufacturer is premium.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({
    description:
      'Vehicle category for this manufacturer. Same manufacturer name can be created for different categories (e.g., Honda for passenger_car and Honda for two_wheeler). Cannot create duplicate name + category combination. Defaults to passenger_car if not provided.',
    example: 'passenger_car',
    enum: [
      'passenger_car',
      'two_wheeler',
      'commercial_vehicle',
      'luxury',
      'suv',
    ],
    default: 'passenger_car',
  })
  @IsOptional()
  @IsString()
  @IsIn(['passenger_car', 'two_wheeler', 'commercial_vehicle', 'luxury', 'suv'])
  vehicleCategory?: string;
}
