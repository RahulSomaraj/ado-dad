import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsIn,
  Matches,
} from 'class-validator';
import { UserType } from '../enums/user.types';
import { IsPhoneNumberWithCountry } from '../../common/decorators/phone-number-validator.decorator';
import { getSupportedPhoneCodes } from '../../common/utils/phone-validator.util';

const supportedPhoneCodes = getSupportedPhoneCodes();

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '+91',
    description: 'Phone country code with + prefix (e.g., +91, +971, +1)',
    enum: supportedPhoneCodes.slice(0, 50), // Show first 50 in Swagger
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+\d{1,4}$/, {
    message: 'Country code must be in format +XX (e.g., +91, +971, +1)',
  })
  @IsIn(supportedPhoneCodes, {
    message: `Country code must be a valid phone country code (e.g., +91, +971, +1)`,
  })
  countryCode?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Phone number without country code',
  })
  @IsString()
  @IsOptional()
  @IsPhoneNumberWithCountry('+91', {
    message: 'Invalid phone number format',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'SA', enum: UserType })
  @IsEnum(UserType)
  @IsNotEmpty()
  @IsOptional()
  type?: UserType;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'Profile picture URL (optional)',
  })
  @IsOptional()
  @IsUrl()
  profilePic?: string;
}
