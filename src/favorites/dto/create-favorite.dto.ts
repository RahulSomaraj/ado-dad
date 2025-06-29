import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({
    example: '65b90e8f5d9f6c001c5a1234',
    description: 'MongoDB ObjectId of the ad',
  })
  @IsMongoId()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    example: 'ad',
    enum: ['ad'],
    description: 'Type of the item (only ad is supported)',
  })
  @IsEnum(['ad'])
  @IsNotEmpty()
  itemType: 'ad';
}
