import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, MaxLength } from 'class-validator';

export class UpdateRatingDto {
  @ApiProperty({
    description: 'Rating value (1-5)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiProperty({
    description: 'Updated review for the product',
    example: 'Updated review for the product.',
    required: false,
  })
  @IsOptional()
  @MaxLength(500)
  review?: string;
}
