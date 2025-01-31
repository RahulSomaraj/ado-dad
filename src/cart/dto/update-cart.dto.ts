import { IsNotEmpty, IsMongoId, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartDto {
  @ApiProperty({
    description: 'Product ID to be updated in the cart',
    example: '60d21b4967d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @ApiProperty({
    description: 'New quantity for the product',
    example: 3,
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
