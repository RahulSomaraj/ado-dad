import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseFilters,
  UseGuards,
  Request,
  BadRequestException,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { VehicleInventoryService } from './vehicle-inventory.service';
import { ManufacturersService } from './manufacturers.service';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { FilterVehicleModelDto } from './dto/filter-vehicle-model.dto';
import { PaginatedVehicleModelResponseDto } from './dto/vehicle-model-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../auth/guard/roles.guards';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { Types } from 'mongoose';
import { FilterVehicleVariantDto } from './dto/filter-vehicle-variant.dto';
import { PaginatedVehicleVariantResponseDto } from './dto/vehicle-variant-response.dto';
import * as path from 'path';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { error } from 'console';

@ApiTags('Vehicle Inventory')
@Controller('vehicle-inventory')
@UseFilters(new HttpExceptionFilter('Vehicle Inventory'))
export class VehicleInventoryController {
  constructor(
    private readonly vehicleInventoryService: VehicleInventoryService,
    private readonly manufacturersService: ManufacturersService,
  ) {}

  // Vehicle Model endpoints
  @Post('models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vehicle model' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle model created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createVehicleModel(
    @Body() createVehicleModelDto: CreateVehicleModelDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleInventoryService.createVehicleModel(
      createVehicleModelDto,
    );
  }

  @Get('models')
  async findAllVehicleModels(@Query() filters: FilterVehicleModelDto) {
    // Check if any filters are provided
    const hasFilters = Object.keys(filters).some(
      (key) => filters[key] !== undefined,
    );

    if (hasFilters) {
      return this.vehicleInventoryService.findVehicleModelsWithFilters(filters);
    } else {
      // Return simple list if no filters
      const vehicleModels =
        await this.vehicleInventoryService.findAllVehicleModels();
      return {
        data: vehicleModels,
        total: vehicleModels.length,
        page: 1,
        limit: vehicleModels.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
    }
  }

  @Get('models/debug')
  @ApiOperation({
    summary: 'Debug endpoint to check vehicle models data',
    description:
      'Simple endpoint to verify vehicle models are being created and retrieved correctly',
  })
  @ApiResponse({
    status: 200,
    description: 'Debug information retrieved successfully',
  })
  async debugVehicleModels() {
    // Get all models without any filters
    const allModels = await this.vehicleInventoryService.findAllVehicleModels();

    // Get models with aggregation pipeline
    const aggregatedModels =
      await this.vehicleInventoryService.findVehicleModelsWithFilters({});

    return {
      debug: {
        simpleQuery: {
          count: allModels.length,
          models: allModels.map((m) => ({
            id: (m as any)._id,
            name: m.name,
            displayName: m.displayName,
            manufacturer: m.manufacturer,
            isActive: m.isActive,
          })),
        },
        aggregatedQuery: {
          count: aggregatedModels.data.length,
          total: aggregatedModels.total,
          models: aggregatedModels.data.map((m) => ({
            id: (m as any)._id,
            name: m.name,
            displayName: m.displayName,
            manufacturer: m.manufacturer,
            isActive: m.isActive,
          })),
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('models/:id')
  @ApiOperation({ summary: 'Get vehicle model by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle model ID' })
  @ApiResponse({ status: 200, description: 'Vehicle model found' })
  @ApiResponse({ status: 404, description: 'Vehicle model not found' })
  async findVehicleModelById(@Param('id') id: string) {
    return this.vehicleInventoryService.findVehicleModelById(id);
  }

  @Put('models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vehicle model' })
  @ApiParam({ name: 'id', description: 'Vehicle model ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle model updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Vehicle model not found' })
  async updateVehicleModel(
    @Param('id') id: string,
    @Body() updateVehicleModelDto: UpdateVehicleModelDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleInventoryService.updateVehicleModel(
      id,
      updateVehicleModelDto,
    );
  }

  // Vehicle Variant endpoints
  @Post('variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vehicle variant' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle variant created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createVehicleVariant(
    @Body() createVehicleVariantDto: CreateVehicleVariantDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleInventoryService.createVehicleVariant(
      createVehicleVariantDto,
    );
  }

  // Lookup endpoints for fuel types and transmission types
  @Get('fuel-types')
  @ApiOperation({
    summary: 'Get all fuel types',
    description: 'Retrieve all available fuel types for vehicles',
  })
  @ApiResponse({
    status: 200,
    description: 'Fuel types retrieved successfully',
  })
  async getFuelTypes() {
    return this.vehicleInventoryService.getFuelTypes();
  }

  @Get('transmission-types')
  @ApiOperation({
    summary: 'Get all transmission types',
    description: 'Retrieve all available transmission types for vehicles',
  })
  @ApiResponse({
    status: 200,
    description: 'Transmission types retrieved successfully',
  })
  async getTransmissionTypes() {
    return this.vehicleInventoryService.getTransmissionTypes();
  }

  @Get('variants')
  @ApiOperation({
    summary: 'Get all vehicle variants with filters and pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    type: String,
    description: 'Filter by vehicle model ID',
  })
  @ApiQuery({
    name: 'fuelTypeId',
    required: false,
    type: String,
    description: 'Filter by fuel type ID',
  })
  @ApiQuery({
    name: 'transmissionTypeId',
    required: false,
    type: String,
    description: 'Filter by transmission type ID',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Filter by minimum price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Filter by maximum price',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort by field',
    enum: ['price', 'name', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (ASC or DESC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle variants retrieved successfully',
    type: PaginatedVehicleVariantResponseDto,
  })
  async findAllVehicleVariants(@Query() filters: FilterVehicleVariantDto) {
    return this.vehicleInventoryService.findAllVehicleVariantsWithPagination(
      filters,
    );
  }

  @Get('variants/:id')
  @ApiOperation({ summary: 'Get vehicle variant by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle variant ID' })
  @ApiResponse({ status: 200, description: 'Vehicle variant found' })
  @ApiResponse({ status: 404, description: 'Vehicle variant not found' })
  async findVehicleVariantById(@Param('id') id: string) {
    return this.vehicleInventoryService.findVehicleVariantById(id);
  }

  private requireFirstFile(
    files: Express.Multer.File[] | undefined,
    errorMessage: string,
  ): Express.Multer.File {
    if (!files || files.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: errorMessage,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return files[0];
  }

  private parseCsvBufferFromBody(body: any): Buffer | null {
    if (!body) return null;
    if (body instanceof Buffer) {
      return body.length ? body : null;
    }
    if (typeof body === 'string') {
      const trimmed = body.trim();
      return trimmed ? Buffer.from(trimmed) : null;
    }
    if (typeof body !== 'object') return null;

    const base64Candidates = [body.csvBase64, body.base64, body.fileBase64];
    for (const candidate of base64Candidates) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      const dataUrlIndex = trimmed.indexOf('base64,');
      const raw = dataUrlIndex >= 0 ? trimmed.slice(dataUrlIndex + 7) : trimmed;
      const buffer = Buffer.from(raw, 'base64');
      if (buffer.length) return buffer;
    }

    const textCandidates = [
      body.csv,
      body.csvText,
      body.text,
      body.data,
      body.file,
    ];
    for (const candidate of textCandidates) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('data:') && trimmed.includes('base64,')) {
        const raw = trimmed.split('base64,').pop() || '';
        const buffer = Buffer.from(raw, 'base64');
        if (buffer.length) return buffer;
        continue;
      }
      return Buffer.from(trimmed);
    }

    return null;
  }

  private getCsvBuffer(
    files: Express.Multer.File[] | undefined,
    req: ExpressRequest,
    errorMessage: string,
  ): Buffer {
    if (files && files.length > 0 && files[0]?.buffer?.length) {
      return files[0].buffer;
    }
    const bodyBuffer = this.parseCsvBufferFromBody(req.body);
    if (bodyBuffer && bodyBuffer.length) return bodyBuffer;
    throw new HttpException(
      {
        status: HttpStatus.BAD_REQUEST,
        error: errorMessage,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private async handleVehicleModelCsvUpload(
    id: string,
    files: Express.Multer.File[] | undefined,
    req: ExpressRequest,
  ) {
    const buffer = this.getCsvBuffer(files, req, 'No file Uploaded');
    return await this.vehicleInventoryService.createVechicleModelUploadFromId(
      id,
      buffer,
      'csv',
    );
  }

  @Post(':id/upload-csv')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Upload vehicle models CSV for a manufacturer',
    description:
      'Uploads a CSV file and creates vehicle models for the given manufacturer ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Manufacturer ID',
    type: String,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file containing vehicle models',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CSV processed successfully. Models created/updated.',
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file type (only CSV allowed).',
  })
  @ApiResponse({
    status: 404,
    description: 'Manufacturer not found.',
  })
  async vechicleModelUploadFromId(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.handleVehicleModelCsvUpload(id, files, req as ExpressRequest);
  }

  @Post('models/:id/upload-csv')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Upload vehicle models CSV for a manufacturer (alias)',
    description:
      'Alias endpoint to support /vehicle-inventory/models/:id/upload-csv.',
  })
  @ApiParam({
    name: 'id',
    description: 'Manufacturer ID',
    type: String,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file containing vehicle models',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CSV processed successfully. Models created/updated.',
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file type (only CSV allowed).',
  })
  @ApiResponse({
    status: 404,
    description: 'Manufacturer not found.',
  })
  async vechicleModelUploadFromIdAlias(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.handleVehicleModelCsvUpload(id, files, req as ExpressRequest);
  }

  @Post('upload-vehicle-models-csv')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Upload vehicle models CSV (manufacturer in form data)',
    description:
      'Uploads a CSV file and creates vehicle models for a manufacturer ID provided in form data.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        manufacturerId: { type: 'string', example: '665f2c4e3a7aab1234567890' },
        manufacturer: { type: 'string', example: '665f2c4e3a7aab1234567890' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  async vehicleModelUploadCsv(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('manufacturerId') manufacturerId: string,
    @Body('manufacturer') manufacturer: string,
    @Request() req,
  ) {
    const id = manufacturerId || manufacturer || '';
    return this.handleVehicleModelCsvUpload(id, files, req as ExpressRequest);
  }

  @Post('upload-vehicle-variants-csv')
  @ApiOperation({ summary: 'Bulk upload vehicle variants from CSV file' })
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        modelId: { type: 'string', example: '665f2c4e3a7aab1234567890' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['modelId', 'file'],
    },
  })
  async vehicleVariantUploadCsv(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('modelId') modelId: string,
    @Request() req,
  ) {
    const buffer = this.getCsvBuffer(
      files,
      req as ExpressRequest,
      'No file uploaded',
    );

    // Accept uploads without strict validation. modelId may be any identifier — service will handle permissively.
    return await this.vehicleInventoryService.createVehicleVariantCsv(
      buffer,
      'csv',
      modelId,
    );
  }
}
