import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEnum } from 'class-validator';

export class DetailsDto {
  @ApiProperty({ example: 2023 })
  @IsNumber()
  modelYear: number;

  @ApiProperty({ example: 'January' })
  @IsString()
  month: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  kilometersDriven: number;

  @ApiProperty({ example: 'Automatic' })
  @IsEnum(['Automatic', 'Manual', 'Semi-Automatic', 'CVT', 'Dual-Clutch'])
  transmissionType: string;

  @ApiProperty({ example: '18 km/l' })
  @IsString()
  mileage: string;
}
