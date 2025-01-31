import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsMongoId, } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  image: string;

  @ApiProperty({ example: 'Toyota Camry' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  brandName: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  modelName: string;

  @ApiProperty({ enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'], example: 'Petrol' })
  @IsEnum(['Petrol', 'Diesel', 'Electric', 'Hybrid'])
  fuelType: string;

  @ApiProperty({
    type: Object,
    example: {
      modelYear: 2023,
      month: 'March',
      kilometersDriven: 15000,
      transmissionType: 'Automatic',
      mileage: '15km/l',
    },
  })
  details: {
    modelYear: number;
    month: string;
    kilometersDriven: number;
    transmissionType: string;
    mileage: string;
  };

  @ApiProperty({ type: Object, required: false })
  @IsOptional()
  additionalInfo: {
    abs?: boolean;
    accidental?: boolean;
    numberOfAirbags?: number;
    vendor?: string;  // Vendor ID (MongoDB ObjectId)
  };

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsMongoId()
  vendor?: string; // Optional vendor ID for validation
}
