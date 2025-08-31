import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    description:
      'Sorting field and order (e.g., "name:asc" or "createdAt:desc")',
    example: 'name:asc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

// DTO for safe user API responses
export class UserResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '+123456789' })
  phoneNumber: string;

  @ApiProperty({ example: 'NU', enum: UserType })
  type: UserType;

  @ApiProperty({ example: 'https://example.com/profile.jpg', required: false })
  profilePic?: string;

  @ApiProperty({ example: false, required: false })
  isDeleted?: boolean;
}
