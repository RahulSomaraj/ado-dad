import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  UseFilters,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UserReportService } from './user-report.service';
import { CreateUserReportDto } from './dto/create-user-report.dto';
import { UpdateUserReportDto } from './dto/update-user-report.dto';
import { ListUserReportsDto } from './dto/list-user-reports.dto';
import { UserReportResponseDto } from './dto/user-report-response.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from './enums/user.types';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('User Reports')
@Controller('user-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UseFilters(new HttpExceptionFilter('User Reports'))
export class UserReportController {
  constructor(private readonly userReportService: UserReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Report a user',
    description: `
      Report a user for inappropriate behavior, spam, fraud, or other violations.
      
      **Report Reasons:**
      - **spam**: User is posting spam content
      - **inappropriate_content**: User is posting inappropriate content
      - **fraud**: User is engaging in fraudulent activities
      - **harassment**: User is harassing other users
      - **fake_listings**: User is posting fake advertisements
      - **price_manipulation**: User is manipulating prices
      - **contact_abuse**: User is abusing contact information
      - **other**: Other violations not covered above
      
      **Features:**
      - Prevents self-reporting
      - Rate limiting (24 hours between reports for same user)
      - Evidence upload support
      - Related ad linking
      - Automatic report count tracking
    `,
  })
  @ApiBody({
    type: CreateUserReportDto,
    examples: {
      spam: {
        summary: 'Report spam user',
        description: 'Report a user for posting spam advertisements',
        value: {
          reportedUser: '507f1f77bcf86cd799439011',
          reason: 'spam',
          description:
            'This user is posting spam advertisements repeatedly across multiple categories',
          evidenceUrls: ['https://example.com/screenshot1.png'],
          relatedAd: '507f1f77bcf86cd799439012',
        },
      },
      fraud: {
        summary: 'Report fraud',
        description: 'Report a user for fraudulent activities',
        value: {
          reportedUser: '507f1f77bcf86cd799439011',
          reason: 'fraud',
          description:
            'This user is asking for advance payment but not delivering the product',
          evidenceUrls: ['https://example.com/chat-screenshot.png'],
        },
      },
      harassment: {
        summary: 'Report harassment',
        description: 'Report a user for harassment',
        value: {
          reportedUser: '507f1f77bcf86cd799439011',
          reason: 'harassment',
          description:
            'This user is sending inappropriate messages and making threats',
          evidenceUrls: ['https://example.com/message-screenshot.png'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User report created successfully',
    type: UserReportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Reported user not found',
  })
  async createReport(
    @Body() createReportDto: CreateUserReportDto,
    @Request() req: any,
  ): Promise<UserReportResponseDto> {
    return this.userReportService.createReport(createReportDto, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user reports',
    description: `
      Retrieve user reports with filtering and pagination.
      
      **Access Control:**
      - **Regular Users**: Can only see their own reports
      - **Admin/Super Admin**: Can see all reports
      
      **Filters:**
      - Filter by reported user
      - Filter by reporter
      - Filter by reason
      - Filter by status
      - Search in description
      - Pagination support
    `,
  })
  @ApiQuery({
    name: 'reportedUser',
    required: false,
    description: 'Filter by reported user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'reportedBy',
    required: false,
    description: 'Filter by reporter user ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'reason',
    required: false,
    description: 'Filter by report reason',
    enum: [
      'spam',
      'inappropriate_content',
      'fraud',
      'harassment',
      'fake_listings',
      'price_manipulation',
      'contact_abuse',
      'other',
    ],
    example: 'spam',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by report status',
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    example: 'pending',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in description',
    example: 'spam',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'User reports retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserReportResponseDto' },
        },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 3 },
        hasNext: { type: 'boolean', example: true },
        hasPrev: { type: 'boolean', example: false },
      },
    },
  })
  async getReports(@Query() filters: ListUserReportsDto, @Request() req: any) {
    return this.userReportService.getReports(
      filters,
      req.user.id,
      req.user.type,
    );
  }

  @Get('stats')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get report statistics (Admin only)',
    description: `
      Get comprehensive statistics about user reports.
      
      **Admin Only**: This endpoint is restricted to admin and super admin users.
      
      **Statistics Include:**
      - Total reports count
      - Pending reports count
      - Resolved reports count
      - Dismissed reports count
      - Reports breakdown by reason
      - Reports breakdown by status
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Report statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalReports: { type: 'number', example: 150 },
        pendingReports: { type: 'number', example: 25 },
        resolvedReports: { type: 'number', example: 100 },
        dismissedReports: { type: 'number', example: 25 },
        reportsByReason: {
          type: 'object',
          example: {
            spam: 50,
            fraud: 30,
            harassment: 20,
            inappropriate_content: 15,
            fake_listings: 10,
            other: 25,
          },
        },
        reportsByStatus: {
          type: 'object',
          example: {
            pending: 25,
            under_review: 10,
            resolved: 100,
            dismissed: 25,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getReportStats() {
    return this.userReportService.getReportStats();
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get a specific user report',
    description: `
      Retrieve details of a specific user report.
      
      **Access Control:**
      - **Regular Users**: Can only view their own reports
      - **Admin/Super Admin**: Can view any report
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'User report retrieved successfully',
    type: UserReportResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot view this report',
  })
  async getReportById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<UserReportResponseDto> {
    return this.userReportService.getReportById(id, req.user.id, req.user.type);
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update a user report (Admin only)',
    description: `
      Update the status and admin notes of a user report.
      
      **Admin Only**: This endpoint is restricted to admin and super admin users.
      
      **Updates:**
      - Change report status (pending, under_review, resolved, dismissed)
      - Add admin notes about the resolution
      - Automatically tracks who reviewed and when
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateUserReportDto,
    examples: {
      resolve: {
        summary: 'Resolve a report',
        description: 'Mark a report as resolved with admin notes',
        value: {
          status: 'resolved',
          adminNotes:
            'User has been warned and spam ads removed. No further action needed.',
        },
      },
      dismiss: {
        summary: 'Dismiss a report',
        description: 'Dismiss a report as unfounded',
        value: {
          status: 'dismissed',
          adminNotes:
            'Report was unfounded. User behavior is within acceptable limits.',
        },
      },
      review: {
        summary: 'Mark under review',
        description: 'Mark a report as under review',
        value: {
          status: 'under_review',
          adminNotes:
            'Investigating the reported behavior. Will update once review is complete.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User report updated successfully',
    type: UserReportResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateUserReportDto,
    @Request() req: any,
  ): Promise<UserReportResponseDto> {
    return this.userReportService.updateReport(
      id,
      updateReportDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user report (Admin only)',
    description: `
      Soft delete a user report.
      
      **Admin Only**: This endpoint is restricted to admin and super admin users.
      
      **Note**: This performs a soft delete - the report is marked as deleted but not permanently removed from the database.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 204,
    description: 'User report deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async deleteReport(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    return this.userReportService.deleteReport(id, req.user.id);
  }
}
