// find-all-categories.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class FindAllCategoriesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by category name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by parent category ID' })
  @IsOptional()
  @IsString()
  parent?: string;
}
