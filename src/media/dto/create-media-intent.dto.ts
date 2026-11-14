import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateMediaIntentDto {
  @ApiProperty({ enum: ['ad_image', 'ad_video'], example: 'ad_image' })
  @IsIn(['ad_image', 'ad_video'])
  kind!: 'ad_image' | 'ad_video';

  @ApiProperty({
    example: 'image/jpeg',
    description:
      'image/jpeg | image/png | image/webp (≤ 10 MB) or video/mp4 | video/quicktime (≤ 50 MB). Send exactly this as the PUT Content-Type.',
  })
  @IsString()
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ example: 312044, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  size!: number;
}
