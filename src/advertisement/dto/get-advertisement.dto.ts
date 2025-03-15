import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleTypes } from 'src/vehicles/enum/vehicle.type';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { FindVehicleAdvDto } from 'src/vehicles-adv/dto/get-vehicle-adv.dto';

export class FindAdvertisementsDto extends PaginationDto {
  @ApiProperty({
    description: 'Advertisement type (Vehicle or Property)',
    example: 'Vehicle',
  })
  @IsNotEmpty()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Advertisement type (Vehicle or Property)',
    example: 'Vehicle',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Price in rupees. This value can be very large, so it is transformed to a number.',
    example: 1000000000, // example in rupees
  })
  @IsOptional()
  @IsNotEmpty({ message: 'MinPrice is required.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number.' })
  @Min(0, { message: 'Price must be at least 0.' })
  minPrice: number;

  @ApiPropertyOptional({
    description:
      'Price in rupees. This value can be very large, so it is transformed to a number.',
    example: 1000000000, // example in rupees
  })
  @IsOptional()
  @IsNotEmpty({ message: 'MAA rice is required.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Max Price must be a valid number.' })
  @Min(0, { message: 'Price must be at least 0.' })
  maxPrice: number;

  @ApiPropertyOptional({
    description:
      'Price in rupees. This value can be very large, so it is transformed to a number.',
    example: 1000000000, // example in rupees
  })
  @IsOptional()
  @ValidateNested()
  
  @Type(() => FindVehicleAdvDto)
  vehicleAdv?: FindVehicleAdvDto;
}
