import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class UpdateCategoryDto {
    @ApiProperty({ example: 'Updated Electronics', description: 'Updated category name' })
    @IsOptional()
    @IsString()
    name?: string;
  
    @ApiProperty({
      example: 'https://example.com/icon-updated-electronics.png',
      description: 'Updated icon URL',
      required: false,
    })
    @IsOptional()
    @IsString()
    icon?: string;
  }