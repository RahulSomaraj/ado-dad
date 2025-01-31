import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MaxLength, IsMongoId } from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({
    description: 'User ID',
    example: '63a79bfb1234567890abcdef',
  })
  @IsMongoId()
  user: string;

  @ApiProperty({
    description: 'Product ID',
    example: '63b1c1234567890abcdef123',
  })
  @IsMongoId()
  product: string;

  @ApiProperty({
    description: 'Rating value (1-5)',
    example: 4,
  })
  @IsNumber()
  rating: number;

  @ApiProperty({
    description: 'Review for the product',
    example: 'This product is excellent!',
    required: false,
  })
  @IsOptional()
  @MaxLength(500)
  review?: string;
}
