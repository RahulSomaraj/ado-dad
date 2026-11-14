import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BaseAdDto {
  @ApiProperty({ description: 'Advertisement description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Advertisement price' })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    description: 'Advertisement images URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: 'Advertisement location' })
  @IsString()
  location: string;

  @ApiPropertyOptional({ description: 'Is advertisement active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
