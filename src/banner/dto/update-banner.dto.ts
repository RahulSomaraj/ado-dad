// src/banner/dto/update-banner.dto.ts
import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBannerDto {
  @ApiProperty({
    description: 'Updated title of the banner.',
    example: 'New Car for sale',  // Example value
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Updated URL of the banner image.',
    example: 'https://example.com/new-banner.jpg',  // Example value
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Updated link associated with the banner.',
    example: 'https://example.com/new-link',  // Example value
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  link?: string;
}
