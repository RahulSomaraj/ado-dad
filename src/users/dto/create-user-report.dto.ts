import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsArray,
  MaxLength,
  MinLength,
  IsUrl,
} from 'class-validator';
import { ReportReason } from '../schemas/user-report.schema';

export class CreateUserReportDto {
  @ApiProperty({
    description: 'ID of the user being reported',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  reportedUser: string;

  @ApiProperty({
    description: 'Reason for reporting the user',
    enum: ReportReason,
    example: ReportReason.SPAM,
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'This user is posting spam advertisements repeatedly',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;

  @ApiPropertyOptional({
    description: 'URLs to evidence (screenshots, etc.)',
    type: [String],
    example: [
      'https://example.com/screenshot1.png',
      'https://example.com/screenshot2.png',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    description: 'ID of the specific ad that triggered this report',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  relatedAd?: string;
}
