import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdateFavoriteDto {
  @IsMongoId()
  @IsNotEmpty()
  itemId: string;

  @IsEnum(['product', 'service'])
  @IsNotEmpty()
  itemType: 'product' | 'service';
}
