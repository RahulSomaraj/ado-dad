import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class FilterVehicleVariantDto extends PaginationDto {
  @ApiPropertyOptional({ 
    type: String,
    description: 'Filter by vehicle model ID' 
  })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({ 
    type: String,
    description: 'Filter by fuel type ID' 
  })
  @IsOptional()
  @IsString()
  fuelTypeId?: string;

  @ApiPropertyOptional({ 
    type: String,
    description: 'Filter by transmission type ID' 
  })
  @IsOptional()
  @IsString()
  transmissionTypeId?: string;

  @ApiPropertyOptional({ 
    type: Number,
    description: 'Filter by minimum price' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ 
    type: Number,
    description: 'Filter by maximum price' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ 
    type: String,
    description: 'Search term' 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Sort by field',
    enum: ['price', 'name', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'price';

  @ApiPropertyOptional({
    type: String,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'ASC' || value === 'DESC') {
      return value;
    }
    return 'DESC'; // Default to DESC if invalid value
  })
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
