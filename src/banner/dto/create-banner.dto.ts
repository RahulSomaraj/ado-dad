// src/banner/dto/create-banner.dto.ts
import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({
    description: 'The title of the banner.',
    example: 'Car for sale', // Example value
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The URL of the banner image for desktop.',
    example: 'https://example.com/banner-desktop.jpg', // Example value
  })
  @IsString()
  desktopImage: string;

  @ApiProperty({
    description: 'The URL of the banner image for phone.',
    example: 'https://example.com/banner-phone.jpg', // Example value
  })
  @IsString()
  phoneImage: string;

  @ApiProperty({
    description: 'The URL of the banner image for tablet.',
    example: 'https://example.com/banner-tablet.jpg', // Example value
  })
  @IsString()
  tabletImage: string;

  @ApiProperty({
    description: 'The link associated with the banner.',
    example: 'https://example.com', // Example value
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  link?: string;
}
