import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CommonData, CreateAdV2Dto } from './create-ad-v2.dto';

/**
 * PATCH /v2/ads/:id `data`. Same as create, plus the edit-only media and video
 * controls. `media` entries are validated by UpdateAdUc (not class-validator)
 * so a malformed entry reports as a single `data.media` field error.
 */
export class UpdateCommonData extends CommonData {
  @ApiPropertyOptional({
    description:
      'Ordered photos, index 0 = cover. Each entry is {"mediaId"} (a new upload owned by you, status uploaded) or {"url"} (a photo already on this ad).',
    example: [{ url: 'https://ado-dad.s3.ap-south-1.amazonaws.com/media/u/1.jpg' }, { mediaId: '66f2b1ce8f50cfd2a6a3a999' }],
  })
  @IsOptional()
  @IsArray()
  media?: ({ mediaId?: string; url?: string } | unknown)[];

  @ApiPropertyOptional({
    description: 'Keep the current video: must equal the ad\'s current video URL.',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'true clears the video' })
  @IsOptional()
  @IsBoolean()
  removeVideo?: boolean;
}

export class UpdateAdV2Dto extends CreateAdV2Dto {
  @ApiPropertyOptional({ type: UpdateCommonData })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCommonData)
  data!: UpdateCommonData;
}
