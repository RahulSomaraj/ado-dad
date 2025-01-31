import { IsString, IsNotEmpty, IsNumber, Min, IsArray, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdvertisementDto {
  @ApiProperty({ description: 'Type of advertisement, either "Vehicle" or "Property"', example: 'Vehicle' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Title of the advertisement', example: 'Affordable Family Car for Sale' })
  @IsString()
  @IsNotEmpty()
  adTitle: string;

  @ApiProperty({ description: 'Description of the advertisement', example: 'A well-maintained family car, single owner, excellent mileage, and recently serviced.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Price of the advertisement', example: 15000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Array of image URLs', example: ['https://example.com/car1.jpg', 'https://example.com/car2.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  imageUrls: string[];

  @ApiProperty({ description: 'Full name of the person', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Phone number of the person', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'State where the advertisement is located', example: 'California' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'City where the advertisement is located', example: 'Los Angeles' })
  @IsString()
  @IsNotEmpty()
  city: string;
}
