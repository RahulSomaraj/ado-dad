import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
} from 'class-validator';
import { ReportStatus } from '../schemas/user-report.schema';

export class UpdateUserReportDto {
  @ApiPropertyOptional({
    description: 'New status for the report',
    enum: ReportStatus,
    example: ReportStatus.UNDER_REVIEW,
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: 'Admin notes about the resolution',
    example: 'User has been warned and spam ads removed',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Admin notes cannot exceed 500 characters' })
  adminNotes?: string;
}
