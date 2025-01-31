import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleCompanyDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Tesla', description: 'Name of the vehicle company' })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'USA', description: 'Country of origin' })
  originCountry: string;

  @IsNotEmpty()
  @IsUrl()
  @ApiProperty({ 
    example: 'https://www.tesla.com/logo.png', 
    description: 'URL of the company logo (must be a valid image URL)' 
  })
  logo: string;
}
