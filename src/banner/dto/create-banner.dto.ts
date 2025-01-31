// src/banner/dto/create-banner.dto.ts
import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({
    description: 'The title of the banner.',
    example: 'Car for sale',  // Example value
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The URL of the banner image.',
    example: 'https://example.com/banner.jpg',  // Example value
  })
  @IsString()
  image: string;

  @ApiProperty({
    description: 'The link associated with the banner.',
    example: 'https://example.com',  // Example value
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  link?: string;
}
