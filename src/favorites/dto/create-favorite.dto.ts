import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({
    example: '65b90e8f5d9f6c001c5a1234',
    description: 'MongoDB ObjectId of the item',
  })
  @IsMongoId()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    example: 'product',
    enum: ['product', 'service'],
    description: 'Type of the item',
  })
  @IsEnum(['product', 'service'])
  @IsNotEmpty()
  itemType: 'product' | 'service';
}
