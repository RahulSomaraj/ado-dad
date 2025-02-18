import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WheelerType } from 'src/vehicles/enum/vehicle.type';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class FindVehicleCompaniesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Vehicle company name',
    example: 'Tesla',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'USA', description: 'Country of origin' })
  @IsOptional()
  @IsNotEmpty()
  @IsEnum(WheelerType)
  vehicleType: WheelerType;

  @ApiPropertyOptional({
    description: 'Origin country of the vehicle company',
    example: 'USA',
  })
  @IsOptional()
  @IsString()
  originCountry?: string;
}
