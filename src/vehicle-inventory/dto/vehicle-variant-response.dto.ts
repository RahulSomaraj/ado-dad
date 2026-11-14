import { ApiProperty } from '@nestjs/swagger';
import { VehicleVariant, EngineSpecs, PerformanceSpecs } from '../schemas/vehicle-variant.schema';

export class PaginatedVehicleVariantResponseDto {
  @ApiProperty({ description: 'Array of vehicle variants' })
  data: any[];

  @ApiProperty({ description: 'Total number of variants' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}
