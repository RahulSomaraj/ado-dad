import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({
    example: 'Updated Electronics',
    description: 'Updated category name',
  })
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

  @ApiProperty({
    example: '60c72b2f9b1e8c1a8a0c4b2d',
    description: 'Parent category ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  parent?: string;
}
