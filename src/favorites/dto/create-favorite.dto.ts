import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateFavoriteDto {
  @IsMongoId()
  @IsNotEmpty()
  itemId: string;

  @IsEnum(['product', 'service'])
  @IsNotEmpty()
  itemType: 'product' | 'service';
}
