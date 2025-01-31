import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShowroomDto {
  @ApiProperty({
    description: 'Image URL of the showroom',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  image: string;

  @ApiProperty({
    description: 'Name of the showroom',
    example: 'Prime Auto Showroom',
  })
  @IsString()
  @IsNotEmpty()
  showroomName: string;

  @ApiProperty({
    description: 'Name of the owner',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    description: 'Address of the showroom',
    example: '123 Main Street, New York, NY',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'PAN Card number',
    example: 'ABCDE1234F',
  })
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN Card format',
  })
  panCard: string;

  @ApiProperty({
    description: 'CIN Number',
    example: 'U12345XYZ9876A',
  })
  @IsString()
  @Matches(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{1}$/, {
    message: 'Invalid CIN Number format',
  })
  cinNumber: string;
}
