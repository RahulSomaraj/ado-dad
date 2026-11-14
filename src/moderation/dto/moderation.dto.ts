import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ThresholdAction } from '../schemas/moderation-settings.schema';
import { AppealStatus } from '../schemas/appeal.schema';
import { SuspensionStatus } from '../schemas/suspension.schema';

export class AddStrikeDto {
  @ApiProperty({ example: 'Posted a fraudulent listing' })
  @IsString()
  @MaxLength(300)
  reason: string;

  @ApiPropertyOptional({ description: 'Report that triggered the strike' })
  @IsOptional()
  @IsMongoId()
  reportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SuspendUserDto {
  @ApiProperty({ example: 'Repeated policy violations' })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiProperty({ example: 7, description: 'Suspension length in days' })
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  reportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BanUserDto {
  @ApiProperty({ example: 'Severe / repeated fraud' })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  reportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RemoveAdDto {
  @ApiProperty({ example: 'Fake images / misleading price' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class StrikeThresholdDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  level: number;

  @ApiProperty({ enum: ThresholdAction })
  @IsEnum(ThresholdAction)
  action: ThresholdAction;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationDays?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: [StrikeThresholdDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrikeThresholdDto)
  thresholds?: StrikeThresholdDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyByPush?: boolean;
}

export class CreateAppealDto {
  @ApiProperty()
  @IsMongoId()
  suspensionId: string;

  @ApiProperty({ example: 'I believe this report was filed in bad faith…' })
  @IsString()
  @MaxLength(2000)
  message: string;
}

export class ReviewAppealDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(AppealStatus)
  decision: AppealStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ModerationListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Free-text search (name / email)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SuspensionStatus })
  @IsOptional()
  @IsEnum(SuspensionStatus)
  status?: SuspensionStatus;

  @ApiPropertyOptional({ enum: AppealStatus })
  @IsOptional()
  @IsEnum(AppealStatus)
  appealStatus?: AppealStatus;
}
