import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ example: 'iPhone 15', description: 'Name of the product' })
  name: string;

  @ApiProperty({ example: 'Apple', description: 'Brand of the product' })
  brand: string;

  @ApiProperty({ example: 'Electronics', description: 'Category of the product' })
  category: string;

  @ApiProperty({ example: 999, description: 'Price of the product' })
  price: number;

  @ApiProperty({ example: 10, description: 'Stock quantity of the product' })
  stock: number;

  @ApiProperty({
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    description: 'Array of product images',
  })
  images: string[];

  @ApiProperty({ example: 'Latest Apple smartphone with A17 chip', description: 'Product description' })
  description: string;
}
