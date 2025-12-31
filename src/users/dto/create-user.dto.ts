import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsIn,
  Matches,
  IsNumberString,
} from 'class-validator';
import { UserType } from '../enums/user.types';
import { IsPhoneNumberWithCountry } from '../../common/decorators/phone-number-validator.decorator';
import {
  getSupportedPhoneCodes,
  isValidPhoneCode,
} from '../../common/utils/phone-validator.util';

const supportedPhoneCodes = getSupportedPhoneCodes();

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '+91',
    description: 'Phone country code with + prefix (e.g., +91, +971, +1)',
    enum: supportedPhoneCodes.slice(0, 50), // Show first 50 in Swagger
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{1,4}$/, {
    message: 'Country code must be in format +XX (e.g., +91, +971, +1)',
  })
  @IsIn(supportedPhoneCodes, {
    message: `Country code must be a valid phone country code (e.g., +91, +971, +1)`,
  })
  countryCode: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Phone number without country code',
  })
  @IsString()
  @IsNotEmpty()
  // @IsPhoneNumberWithCountry('+91', {
  //   message: 'Invalid phone number format',
  // })
  @IsNumberString({ no_symbols: true }, { 
    message: 'Phone number must contain only numbers' 
  })
  phoneNumber: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'SA', enum: UserType })
  @IsEnum(UserType)
  @IsNotEmpty()
  type: UserType;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile picture URL (optional)',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  profilePic?: string;
}

// DTO for creating user with file upload
export class CreateUserWithFileDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '+91',
    description: 'Phone country code with + prefix (e.g., +91, +971, +1)',
    enum: supportedPhoneCodes.slice(0, 50), // Show first 50 in Swagger
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{1,4}$/, {
    message: 'Country code must be in format +XX (e.g., +91, +971, +1)',
  })
  @IsIn(supportedPhoneCodes, {
    message: `Country code must be a valid phone country code (e.g., +91, +971, +1)`,
  })
  countryCode: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Phone number without country code',
  })
  @IsString()
  @IsNotEmpty()
  // @IsPhoneNumberWithCountry('+91', {
  //   message: 'Invalid phone number format',
  // })
  @IsNumberString({ no_symbols: true }, { 
    message: 'Phone number must contain only numbers' 
  })
  phoneNumber: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'SA', enum: UserType })
  @IsEnum(UserType)
  @IsNotEmpty()
  type: UserType;
}
