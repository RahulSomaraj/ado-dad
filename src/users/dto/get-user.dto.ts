import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '../enums/user.types';

export class GetUsersDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of users per page',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search query to filter users',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'User type filter',
    example: UserType.USER,
  })
  @IsOptional()
  @IsString()
  type?: UserType;

  @ApiPropertyOptional({
    description: 'Sorting field and order (e.g., "name:asc" or "createdAt:desc")',
    example: 'name:asc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
