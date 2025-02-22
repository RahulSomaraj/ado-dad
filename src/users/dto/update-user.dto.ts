import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { UserType } from '../enums/user.types';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name: string;

  @ApiPropertyOptional({ example: '+123456789' })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('IN')
  @IsOptional()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsOptional()
  email: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  password: string;

  @ApiPropertyOptional({ example: 'SA', enum: UserType })
  @IsEnum(UserType)
  @IsNotEmpty()
  @IsOptional()
  type: UserType;

  @ApiPropertyOptional({ example: 'john_doe', required: false })
  @IsOptional()
  @IsString()
  username?: string;
}
