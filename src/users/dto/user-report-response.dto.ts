import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportStatus } from '../schemas/user-report.schema';

export class UserReportResponseDto {
  @ApiProperty({
    description: 'Report ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the user being reported',
    example: '507f1f77bcf86cd799439012',
  })
  reportedUser: string;

  @ApiProperty({
    description: 'Reported user details',
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439012' },
      name: { type: 'string', example: 'John Doe' },
      email: { type: 'string', example: 'john@example.com' },
      phone: { type: 'string', example: '+1234567890' },
    },
  })
  reportedUserDetails: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };

  @ApiProperty({
    description: 'ID of the user who reported',
    example: '507f1f77bcf86cd799439013',
  })
  reportedBy: string;

  @ApiProperty({
    description: 'Reporter user details',
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439013' },
      name: { type: 'string', example: 'Jane Smith' },
      email: { type: 'string', example: 'jane@example.com' },
    },
  })
  reportedByDetails: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Reason for the report',
    enum: ReportReason,
    example: ReportReason.SPAM,
  })
  reason: ReportReason;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'This user is posting spam advertisements repeatedly',
  })
  description: string;

  @ApiProperty({
    description: 'Current status of the report',
    enum: ReportStatus,
    example: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ApiPropertyOptional({
    description: 'ID of the admin who reviewed the report',
    example: '507f1f77bcf86cd799439014',
  })
  reviewedBy?: string;

  @ApiPropertyOptional({
    description: 'Admin notes about the resolution',
    example: 'User has been warned and spam ads removed',
  })
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'When the report was reviewed',
    example: '2025-10-16T10:30:00.000Z',
  })
  reviewedAt?: Date;

  @ApiPropertyOptional({
    description: 'URLs to evidence',
    type: [String],
    example: ['https://example.com/screenshot1.png'],
  })
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    description: 'ID of the related ad',
    example: '507f1f77bcf86cd799439015',
  })
  relatedAd?: string;

  @ApiProperty({
    description: 'How many times this user has been reported',
    example: 3,
  })
  reportCount: number;

  @ApiProperty({
    description: 'When the report was created',
    example: '2025-10-16T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the report was last updated',
    example: '2025-10-16T10:30:00.000Z',
  })
  updatedAt: Date;
}
