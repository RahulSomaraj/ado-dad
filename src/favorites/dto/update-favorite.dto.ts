import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFavoriteDto {
  @ApiProperty({
    example: '65b90e8f5d9f6c001c5a5678',
    description: 'MongoDB ObjectId of the ad to update in favorites',
  })
  @IsMongoId()
  @IsNotEmpty()
  adId: string;
}
