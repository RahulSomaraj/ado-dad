import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleCompanyTypes } from 'src/vehicles/enum/vehicle.type';
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
  @IsEnum(VehicleCompanyTypes)
  vehicleType: VehicleCompanyTypes;

  @ApiPropertyOptional({
    description: 'Origin country of the vehicle company',
    example: 'USA',
  })
  @IsOptional()
  @IsString()
  originCountry?: string;
}
