import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseAdDto } from '../common/base-ad.dto';
import { PropertyTypeEnum } from '../../schemas/property-ad.schema';

export class CreatePropertyAdDto extends BaseAdDto {
  @ApiProperty({ description: 'Property type', enum: PropertyTypeEnum })
  @IsEnum(PropertyTypeEnum)
  propertyType: PropertyTypeEnum;

  @ApiProperty({ description: 'Number of bedrooms' })
  @IsNumber()
  @Min(0)
  @Max(20)
  bedrooms: number;

  @ApiProperty({ description: 'Number of bathrooms' })
  @IsNumber()
  @Min(0)
  @Max(20)
  bathrooms: number;

  @ApiProperty({ description: 'Area in square feet' })
  @IsNumber()
  @Min(0)
  areaSqft: number;

  @ApiPropertyOptional({ description: 'Floor number' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floor?: number;

  @ApiPropertyOptional({ description: 'Is furnished' })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({ description: 'Has parking' })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({ description: 'Has garden' })
  @IsOptional()
  @IsBoolean()
  hasGarden?: boolean;

  @ApiPropertyOptional({ description: 'Amenities list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
