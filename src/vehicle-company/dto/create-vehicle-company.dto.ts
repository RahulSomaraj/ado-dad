import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WheelerType } from 'src/vehicles/enum/vehicle.type';

export class CreateVehicleCompanyDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Tesla',
    description: 'Name of the vehicle company',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'USA',
    description: 'Country of origin',
  })
  originCountry: string;

  @IsNotEmpty()
  @IsEnum(WheelerType)
  @ApiProperty({
    enum: WheelerType,
    example: WheelerType.TWO_WHEELER,
    description: 'Type of vehicle company (e.g., two-wheeler, four-wheeler)',
  })
  vehicleType: WheelerType;

  @IsNotEmpty()
  @IsUrl()
  @ApiProperty({
    example: 'https://www.tesla.com/logo.png',
    description: 'URL of the company logo (must be a valid image URL)',
  })
  logo: string;
}
