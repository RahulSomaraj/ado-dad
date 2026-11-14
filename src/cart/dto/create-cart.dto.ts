import {
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CartItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '60d21b4967d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
  })
  @IsNotEmpty()
  quantity: number;
}

export class CreateCartDto {
  @ApiProperty({
    description: 'User ID',
    example: '60d21b4967d0d8992e610c85',
  })
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @ApiProperty({
    description: 'List of items in the cart',
    type: [CartItemDto],
    example: [
      { product: '60d21b4967d0d8992e610c85', quantity: 2 },
      { product: '60d21b4967d0d8992e610c86', quantity: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
