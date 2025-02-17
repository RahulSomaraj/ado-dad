import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleCompanyTypes } from 'src/vehicles/enum/vehicle.type';

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
  @IsEnum(VehicleCompanyTypes)
  @ApiProperty({
    enum: VehicleCompanyTypes,
    example: VehicleCompanyTypes.BIKES,
    description: 'Type of vehicle company (e.g., two-wheeler, four-wheeler)',
  })
  vehicleType: VehicleCompanyTypes;

  @IsNotEmpty()
  @IsUrl()
  @ApiProperty({
    example: 'https://www.tesla.com/logo.png',
    description: 'URL of the company logo (must be a valid image URL)',
  })
  logo: string;
}
