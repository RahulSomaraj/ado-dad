import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdsService } from '../services/ads.service';
import { DataValidationService } from '../services/data-validation.service';
import {
  FilterAdDto,
  AdminAllAdsFilterDto,
  FilterVehicleModelsDto,
  FilterVehicleVariantsDto,
} from '../dto/common/filter-ad.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { CreateAdDto } from '../dto/common/create-ad.dto';
import { EditAdDto } from '../dto/common/edit-ad.dto';
import {
  AdResponseDto,
  PaginatedAdResponseDto,
  DetailedAdResponseDto,
  PaginatedDetailedAdResponseDto,
} from '../dto/common/ad-response.dto';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth-guard';
import { S3Service } from '../../shared/s3.service';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { RolesGuard } from '../../roles/roles.guard';
import { Roles } from '../../roles/roles.decorator';
import { UserType } from '../../users/enums/user.types';
import { LoggingInterceptor } from '../../interceptors/logging.interceptors';

@ApiTags('Ads')
@Controller('ads')
@UseInterceptors(LoggingInterceptor)
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly dataValidationService: DataValidationService,
    private readonly s3Service: S3Service,
    private readonly vehicleInventoryService: VehicleInventoryService,
  ) {}

  @Post('list')
  async getAllAds(
    @Body() filterDto: FilterAdDto,
  ): Promise<PaginatedDetailedAdResponseDto> {
    return this.adsService.findAll(filterDto);
  }

  @Get(':id')
  async getAdById(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<DetailedAdResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }

      const userId = req?.user?.id;
      return await this.adsService.getAdById(id, userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError' && error.kind === 'ObjectId') {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }
      throw error;
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createAd(
    @Body() createAdDto: CreateAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    try {
      const result = await this.adsService.createAd(createAdDto, req.user.id);
      return result;
    } catch (error) {
      console.error('Error creating advertisement:', error);
      throw error;
    }
  }

  @Put('v2/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing advertisement (v2)' })
  @ApiBody({
    type: EditAdDto,
    description:
      'Pass only fields you want to update. Category-specific rules applied server-side.',
  })
  @ApiResponse({
    status: 200,
    description: 'Advertisement updated',
    type: AdResponseDto,
  })
  async updateAdV2(
    @Param('id') id: string,
    @Body() updateDto: EditAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }

      // Delegate to service update which applies category-specific logic
      return await this.adsService.update(
        id,
        updateDto,
        req.user.id,
        req.user.type,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError' && error.kind === 'ObjectId') {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }
      throw error;
    }
  }

  @Post('upload-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.ADMIN, UserType.SUPER_ADMIN, UserType.SHOWROOM)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload images for advertisements',
    description:
      'Upload multiple images for advertisements. Returns array of image URLs.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Image files to upload (JPG, PNG, WebP supported)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const uploadPromises = files.map((file) => this.s3Service.uploadFile(file));
    const urls = await Promise.all(uploadPromises);
    return { urls };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.ADMIN, UserType.SUPER_ADMIN, UserType.SHOWROOM)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update advertisement by ID',
    description:
      'Update an existing advertisement. Only the advertisement owner or admin can update it.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID (MongoDB ObjectId)' })
  @ApiBody({ type: EditAdDto })
  @ApiResponse({
    status: 200,
    description: 'Advertisement updated successfully',
    type: AdResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions or not the owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found',
  })
  async updateAd(
    @Param('id') id: string,
    @Body() updateAdDto: EditAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }

      return await this.adsService.update(
        id,
        updateAdDto,
        req.user.id,
        req.user.type,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError' && error.kind === 'ObjectId') {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }
      throw error;
    }
  }

  @Put(':id/sold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.SHOWROOM, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update sold-out status',
    description:
      'Toggle the soldOut status for an advertisement. Users/Showrooms can update only their own ads. Admin/Super Admin can update any ad.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID (MongoDB ObjectId)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        soldOut: { type: 'boolean', description: 'Sold-out status' },
      },
      required: ['soldOut'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sold-out status updated',
    type: DetailedAdResponseDto,
  })
  async updateSoldOut(
    @Param('id') id: string,
    @Body() body: { soldOut: boolean },
    @Request() req: any,
  ): Promise<DetailedAdResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid ad id: ObjectId must be a 24 character hex string',
      );
    }
    return this.adsService.updateSoldOut(
      id,
      body.soldOut,
      req.user.id,
      req.user.type,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete advertisement by ID',
    description:
      'Delete an advertisement. Only the advertisement owner, admin, or super admin can delete it.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID (MongoDB ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Advertisement deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Advertisement deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions or not the owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found',
  })
  async deleteAd(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }

      await this.adsService.delete(id, req.user.id, req.user.type);
      return { message: 'Advertisement deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError' && error.kind === 'ObjectId') {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }
      throw error;
    }
  }

  // Vehicle Inventory endpoints for lookup data
  @Get('lookup/manufacturers')
  @ApiOperation({ summary: 'Get all manufacturers' })
  @ApiResponse({
    status: 200,
    description: 'Manufacturers retrieved successfully',
  })
  async getManufacturers() {
    return this.vehicleInventoryService.findAllManufacturers();
  }

  @Get('lookup/manufacturers/:id')
  @ApiOperation({ summary: 'Get manufacturer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Manufacturer retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Manufacturer ID' })
  async getManufacturerById(@Param('id') id: string) {
    return this.vehicleInventoryService.findManufacturerById(id);
  }

  @Post('lookup/vehicle-models')
  @ApiOperation({ summary: 'Get all vehicle models' })
  @ApiBody({
    type: FilterVehicleModelsDto,
    description: 'Filter criteria for vehicle models',
    examples: {
      all_models: {
        summary: 'All Models',
        description: 'Get all vehicle models without filtering',
        value: {},
      },
      manufacturer_filter: {
        summary: 'Filter by Manufacturer',
        description: 'Get vehicle models for a specific manufacturer',
        value: {
          manufacturerId: '507f1f77bcf86cd799439011',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle models retrieved successfully',
  })
  async getVehicleModels(@Body() filterDto: FilterVehicleModelsDto) {
    return this.vehicleInventoryService.findAllVehicleModels(
      filterDto.manufacturerId,
    );
  }

  @Get('lookup/vehicle-models/:id')
  @ApiOperation({ summary: 'Get vehicle model by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle model retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Vehicle model ID' })
  async getVehicleModelById(@Param('id') id: string) {
    return this.vehicleInventoryService.findVehicleModelById(id);
  }

  @Post('lookup/vehicle-variants')
  @ApiOperation({ summary: 'Get all vehicle variants' })
  @ApiBody({
    type: FilterVehicleVariantsDto,
    description: 'Filter criteria for vehicle variants',
    examples: {
      all_variants: {
        summary: 'All Variants',
        description: 'Get all vehicle variants without filtering',
        value: {},
      },
      model_filter: {
        summary: 'Filter by Model',
        description: 'Get vehicle variants for a specific model',
        value: {
          modelId: '507f1f77bcf86cd799439012',
        },
      },
      advanced_filter: {
        summary: 'Advanced Filter',
        description: 'Get vehicle variants with multiple filters',
        value: {
          modelId: '507f1f77bcf86cd799439012',
          fuelTypeId: '507f1f77bcf86cd799439013',
          transmissionTypeId: '507f1f77bcf86cd799439014',
          maxPrice: 1000000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle variants retrieved successfully',
  })
  async getVehicleVariants(@Body() filterDto: FilterVehicleVariantsDto) {
    return this.vehicleInventoryService.findAllVehicleVariants(
      filterDto.modelId,
      filterDto.fuelTypeId,
      filterDto.transmissionTypeId,
      filterDto.maxPrice,
    );
  }

  @Get('lookup/vehicle-variants/:id')
  @ApiOperation({ summary: 'Get vehicle variant by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle variant retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Vehicle variant ID' })
  async getVehicleVariantById(@Param('id') id: string) {
    return this.vehicleInventoryService.findVehicleVariantById(id);
  }

  @Post('cache/warm-up')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Warm up ads cache',
    description:
      'Pre-populate cache with popular queries for better performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache warmed up successfully',
  })
  @ApiBearerAuth()
  async warmUpCache() {
    await this.adsService.warmUpCache();
    return { message: 'Cache warmed up successfully' };
  }

  // Data Validation Endpoints
  @Get('validation/consistency')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Check data consistency',
    description: 'Validate that all ads have proper detailed records',
  })
  @ApiResponse({
    status: 200,
    description: 'Data consistency report generated',
  })
  @ApiBearerAuth()
  async checkDataConsistency() {
    const validation =
      await this.dataValidationService.validateDataConsistency();
    return validation;
  }

  @Get('validation/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Generate consistency report',
    description: 'Generate a detailed data consistency report',
  })
  @ApiResponse({
    status: 200,
    description: 'Consistency report generated',
  })
  @ApiBearerAuth()
  async generateConsistencyReport() {
    const report = await this.dataValidationService.generateConsistencyReport();
    return { report };
  }

  @Post('validation/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Clean up orphaned ads',
    description: 'Remove ads that are missing their detailed records',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed',
  })
  @ApiBearerAuth()
  async cleanupOrphanedAds() {
    const result = await this.dataValidationService.cleanupOrphanedAds();
    return result;
  }

  @Post('my-ads')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get current user's advertisements",
    description: `
      Retrieve all advertisements posted by the currently authenticated user.
      
      **Features:**
      - Returns all ads posted by the authenticated user
      - Includes detailed ad information
      - Supports pagination
      - Can filter by category and status
      - Includes user information and ad statistics
      - Shows sold out status for each advertisement
      
      **Response includes:**
      - Advertisement details
      - Category-specific information
      - User information
      - Pagination metadata
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          minimum: 1,
        },
        limit: {
          type: 'number',
          description: 'Number of items per page (default: 20, max: 100)',
          minimum: 1,
          maximum: 100,
        },
        search: {
          type: 'string',
          description:
            'Search term for title, manufacturer, model, or variant names',
        },
        sortBy: {
          type: 'string',
          description: 'Sort field (default: createdAt)',
          enum: ['createdAt', 'title', 'price', 'updatedAt'],
        },
        sortOrder: {
          type: 'string',
          description: 'Sort order (default: DESC)',
          enum: ['ASC', 'DESC'],
        },
        soldOut: {
          type: 'boolean',
          description: 'Filter by sold out status',
        },
      },
    },
    description: 'Filter and pagination parameters for user advertisements',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'User advertisements retrieved successfully',
    type: PaginatedDetailedAdResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User not authenticated',
  })
  @ApiBearerAuth()
  async getMyAds(
    @Request() req,
    @Body()
    filterDto: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      soldOut?: boolean;
    } = {},
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    return this.adsService.getUserAds(userId, filterDto);
  }

  // Get ads by user ID
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get advertisements by user ID',
    description:
      'Retrieve all advertisements posted by a specific user with pagination and sorting. No authentication required.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to filter ads by',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field (default: createdAt)',
    enum: ['createdAt', 'title', 'price', 'updatedAt'],
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (default: DESC)',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiResponse({
    status: 200,
    description: 'User advertisements retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getAdsByUser(
    @Param('userId') userId: string,
    @Query()
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ) {
    const filterDto: FilterAdDto = {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder,
    };

    return this.adsService.getUserAds(userId, filterDto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN, UserType.USER, UserType.SHOWROOM)
  @ApiOperation({
    summary: 'Get all advertisements (Admin)',
    description:
      'Retrieve all advertisements including unapproved ones with pagination and search. Accessible by authenticated users.',
  })
  @ApiResponse({
    status: 200,
    description: 'All advertisements retrieved successfully with pagination',
    type: PaginatedDetailedAdResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiBearerAuth()
  async getAllAdsForAdmin(
    @Query() filterDto: AdminAllAdsFilterDto,
  ): Promise<PaginatedDetailedAdResponseDto> {
    // Map to FilterAdDto for service compatibility
    const serviceFilter: FilterAdDto = {
      page: filterDto.page,
      limit: filterDto.limit,
      search: filterDto.search,
    };
    return this.adsService.getAllAdsForAdmin(serviceFilter);
  }

  @Put(':id/approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update advertisement approval status',
    description:
      'Approve or reject an advertisement. Only accessible by admin and super admin.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isApproved: {
          type: 'boolean',
          description: 'Set to true to approve, false to reject',
        },
      },
      required: ['isApproved'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Advertisement approval status updated successfully',
    type: DetailedAdResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found',
  })
  @ApiBearerAuth()
  async updateAdApproval(
    @Param('id') id: string,
    @Body() body: { isApproved: boolean },
    @Request() req: any,
  ): Promise<DetailedAdResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }

      return await this.adsService.updateAdApproval(
        id,
        body.isApproved,
        req.user.id,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError' && error.kind === 'ObjectId') {
        throw new BadRequestException(
          'Invalid ad id: ObjectId must be a 24 character hex string',
        );
      }
      throw error;
    }
  }
}
