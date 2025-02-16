import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics', description: 'Category name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'https://example.com/icon-electronics.png',
    description: 'Icon URL',
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
