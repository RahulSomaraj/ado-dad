import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserReport,
  UserReportDocument,
  ReportStatus,
} from './schemas/user-report.schema';
import { User } from './schemas/user.schema';
import { CreateUserReportDto } from './dto/create-user-report.dto';
import { UpdateUserReportDto } from './dto/update-user-report.dto';
import { ListUserReportsDto } from './dto/list-user-reports.dto';
import { UserReportResponseDto } from './dto/user-report-response.dto';

@Injectable()
export class UserReportService {
  private readonly logger = new Logger(UserReportService.name);

  constructor(
    @InjectModel(UserReport.name)
    private userReportModel: Model<UserReportDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Create a new user report
   */
  async createReport(
    createReportDto: CreateUserReportDto,
    reporterId: string,
  ): Promise<UserReportResponseDto> {
    const { reportedUser, reason, description, evidenceUrls, relatedAd } =
      createReportDto;

    // Validate that the reporter is not reporting themselves
    if (reporterId === reportedUser) {
      throw new BadRequestException('You cannot report yourself');
    }

    // Check if the reported user exists
    const reportedUserExists = await this.userModel.findById(reportedUser);
    if (!reportedUserExists) {
      throw new NotFoundException('Reported user not found');
    }

    // Check if the reporter has already reported this user recently (within 24 hours)
    const recentReport = await this.userReportModel.findOne({
      reportedUser: new Types.ObjectId(reportedUser),
      reportedBy: new Types.ObjectId(reporterId),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 hours ago
      isDeleted: false,
    });

    if (recentReport) {
      throw new BadRequestException(
        'You have already reported this user recently. Please wait 24 hours before reporting again.',
      );
    }

    // Create the report
    const report = new this.userReportModel({
      reportedUser: new Types.ObjectId(reportedUser),
      reportedBy: new Types.ObjectId(reporterId),
      reason,
      description,
      evidenceUrls: evidenceUrls || [],
      relatedAd: relatedAd ? new Types.ObjectId(relatedAd) : undefined,
      status: ReportStatus.PENDING,
    });

    const savedReport = await report.save();

    // Update the report count for the reported user
    await this.updateUserReportCount(reportedUser);

    this.logger.log(
      `New user report created: ${savedReport._id} for user: ${reportedUser}`,
    );

    return this.mapToResponseDto(savedReport);
  }

  /**
   * Get all reports with filtering and pagination
   */
  async getReports(
    filters: ListUserReportsDto,
    requesterId: string,
    requesterType: string,
  ): Promise<{
    data: UserReportResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const {
      reportedUser,
      reportedBy,
      reason,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // Build match conditions
    const matchConditions: any = {
      isDeleted: false,
    };

    // Regular users can only see their own reports
    if (requesterType !== 'ADMIN' && requesterType !== 'SUPER_ADMIN') {
      matchConditions.reportedBy = new Types.ObjectId(requesterId);
    }

    // Apply filters
    if (reportedUser) {
      matchConditions.reportedUser = new Types.ObjectId(reportedUser);
    }
    if (reportedBy) {
      matchConditions.reportedBy = new Types.ObjectId(reportedBy);
    }
    if (reason) {
      matchConditions.reason = reason;
    }
    if (status) {
      matchConditions.status = status;
    }
    if (search) {
      matchConditions.description = { $regex: search, $options: 'i' };
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedUser',
          foreignField: '_id',
          as: 'reportedUserDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reportedByDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reviewedBy',
          foreignField: '_id',
          as: 'reviewedByDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          reportedUserDetails: { $arrayElemAt: ['$reportedUserDetails', 0] },
          reportedByDetails: { $arrayElemAt: ['$reportedByDetails', 0] },
          reviewedByDetails: { $arrayElemAt: ['$reviewedByDetails', 0] },
        },
      },
      {
        $sort: {
          [sortBy]: sortOrder === 'ASC' ? 1 : -1,
        },
      },
    ];

    // Count total documents
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute queries
    const [data, countResult] = await Promise.all([
      this.userReportModel.aggregate(pipeline),
      this.userReportModel.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((report) => this.mapToResponseDto(report)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get a single report by ID
   */
  async getReportById(
    reportId: string,
    requesterId: string,
    requesterType: string,
  ): Promise<UserReportResponseDto> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const pipeline: any[] = [
      {
        $match: {
          _id: new Types.ObjectId(reportId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedUser',
          foreignField: '_id',
          as: 'reportedUserDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reportedByDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reviewedBy',
          foreignField: '_id',
          as: 'reviewedByDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          reportedUserDetails: { $arrayElemAt: ['$reportedUserDetails', 0] },
          reportedByDetails: { $arrayElemAt: ['$reportedByDetails', 0] },
          reviewedByDetails: { $arrayElemAt: ['$reviewedByDetails', 0] },
        },
      },
    ];

    const results = await this.userReportModel.aggregate(pipeline);
    const report = results[0];

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Check permissions
    if (requesterType !== 'ADMIN' && requesterType !== 'SUPER_ADMIN') {
      if (report.reportedBy.toString() !== requesterId) {
        throw new ForbiddenException('You can only view your own reports');
      }
    }

    return this.mapToResponseDto(report);
  }

  /**
   * Update a report (Admin only)
   */
  async updateReport(
    reportId: string,
    updateReportDto: UpdateUserReportDto,
    adminId: string,
  ): Promise<UserReportResponseDto> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.userReportModel.findById(reportId);
    if (!report || report.isDeleted) {
      throw new NotFoundException('Report not found');
    }

    // Update the report
    const updateData: any = {
      ...updateReportDto,
    };

    if (updateReportDto.status) {
      updateData.reviewedBy = new Types.ObjectId(adminId);
      updateData.reviewedAt = new Date();
      updateData.isResolved = updateReportDto.status === ReportStatus.RESOLVED;
    }

    const updatedReport = await this.userReportModel.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true },
    );

    this.logger.log(`Report ${reportId} updated by admin ${adminId}`);

    return this.getReportById(reportId, adminId, 'ADMIN');
  }

  /**
   * Delete a report (Admin only)
   */
  async deleteReport(reportId: string, adminId: string): Promise<void> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.userReportModel.findById(reportId);
    if (!report || report.isDeleted) {
      throw new NotFoundException('Report not found');
    }

    await this.userReportModel.findByIdAndUpdate(reportId, {
      isDeleted: true,
      reviewedBy: new Types.ObjectId(adminId),
      reviewedAt: new Date(),
    });

    this.logger.log(`Report ${reportId} deleted by admin ${adminId}`);
  }

  /**
   * Get report statistics (Admin only)
   */
  async getReportStats(): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    dismissedReports: number;
    reportsByReason: Record<string, number>;
    reportsByStatus: Record<string, number>;
  }> {
    const [
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      reportsByReason,
      reportsByStatus,
    ] = await Promise.all([
      this.userReportModel.countDocuments({ isDeleted: false }),
      this.userReportModel.countDocuments({
        status: ReportStatus.PENDING,
        isDeleted: false,
      }),
      this.userReportModel.countDocuments({
        status: ReportStatus.RESOLVED,
        isDeleted: false,
      }),
      this.userReportModel.countDocuments({
        status: ReportStatus.DISMISSED,
        isDeleted: false,
      }),
      this.userReportModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.userReportModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      reportsByReason: reportsByReason.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      reportsByStatus: reportsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Update the report count for a user
   */
  private async updateUserReportCount(userId: string): Promise<void> {
    const reportCount = await this.userReportModel.countDocuments({
      reportedUser: new Types.ObjectId(userId),
      isDeleted: false,
    });

    await this.userReportModel.updateMany(
      { reportedUser: new Types.ObjectId(userId) },
      { reportCount },
    );
  }

  /**
   * Map database document to response DTO
   */
  private mapToResponseDto(report: any): UserReportResponseDto {
    return {
      id: report._id?.toString(),
      reportedUser: report.reportedUser?.toString(),
      reportedUserDetails: report.reportedUserDetails
        ? {
            id: report.reportedUserDetails._id?.toString(),
            name: report.reportedUserDetails.name,
            email: report.reportedUserDetails.email,
            phone: report.reportedUserDetails.phoneNumber,
          }
        : {
            id: '',
            name: 'Unknown User',
            email: 'unknown@example.com',
            phone: 'N/A',
          },
      reportedBy: report.reportedBy?.toString(),
      reportedByDetails: report.reportedByDetails
        ? {
            id: report.reportedByDetails._id?.toString(),
            name: report.reportedByDetails.name,
            email: report.reportedByDetails.email,
          }
        : {
            id: '',
            name: 'Unknown User',
            email: 'unknown@example.com',
          },
      reason: report.reason,
      description: report.description,
      status: report.status,
      reviewedBy: report.reviewedBy?.toString(),
      adminNotes: report.adminNotes,
      reviewedAt: report.reviewedAt,
      evidenceUrls: report.evidenceUrls,
      relatedAd: report.relatedAd?.toString(),
      reportCount: report.reportCount,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
