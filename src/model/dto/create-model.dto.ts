import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { DetailsDto } from './details.dto';  // Correct path
import { AdditionalInfoDto } from './additional-info.dto';  // Correct path

export class CreateModelDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty()
  image: string;

  @ApiProperty({ example: 'Tesla Model S' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Tesla' })
  @IsString()
  @IsNotEmpty()
  brandName: string;

  @ApiProperty({ example: 'Model S' })
  @IsString()
  @IsNotEmpty()
  modelName: string;

  @ApiProperty({ example: 'Electric' })
  @IsEnum(['Petrol', 'Diesel', 'Electric', 'Hybrid'])
  @IsNotEmpty()
  fuelType: string;

  @ApiProperty({ type: DetailsDto })
  details: DetailsDto;

  @ApiProperty({ type: AdditionalInfoDto })
  additionalInfo: AdditionalInfoDto;
}
