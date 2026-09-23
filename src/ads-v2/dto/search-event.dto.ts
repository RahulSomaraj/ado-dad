import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsMongoId, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A click, contact or favourite on a search result. `eventId` is the
 * `query.eventId` from the list response that showed the ad.
 */
export class SearchEventDto {
  @ApiProperty({ description: 'query.eventId from the list response', example: '66f0a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  eventId: string;

  @ApiProperty({ description: 'The ad that was acted on', example: '66f0a1b2c3d4e5f6a7b8c9d1' })
  @IsMongoId()
  adId: string;

  @ApiProperty({ description: '0-based position of the ad in the results as shown', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position: number;

  @ApiProperty({ enum: ['view', 'contact', 'favorite'], example: 'view' })
  @IsIn(['view', 'contact', 'favorite'])
  action: 'view' | 'contact' | 'favorite';
}
