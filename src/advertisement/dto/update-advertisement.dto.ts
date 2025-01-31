import { IsString, IsNumber, Min, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdvertisementDto {
  @ApiProperty({ description: 'Type of advertisement, either "Vehicle" or "Property"', example: 'Vehicle', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Title of the advertisement', example: 'Affordable Family Car for Sale', required: false })
  @IsString()
  @IsOptional()
  adTitle?: string;

  @ApiProperty({ description: 'Description of the advertisement', example: 'A well-maintained family car, single owner, excellent mileage, and recently serviced.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Price of the advertisement', example: 15000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Array of image URLs', example: ['https://example.com/car1.jpg', 'https://example.com/car2.jpg'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({ description: 'Full name of the person', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ description: 'Phone number of the person', example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: 'State where the advertisement is located', example: 'California', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'City where the advertisement is located', example: 'Los Angeles', required: false })
  @IsString()
  @IsOptional()
  city?: string;
}
