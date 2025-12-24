import { Controller, Post, Put, Get, Param, Body, Query, Delete, Req, UploadedFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelService } from './model.service';
import { getIsActiveFilter } from '../common/utils/admin.helpers';
import { CsvUploadService } from '../common/services/csv-upload.service';
import { CsvUploadDecorator } from '../common/decorators/csv-upload.decorator';
import { VEHICLE_MODEL_FIELD_TYPES } from '../common/utils/csv-field-mappers';

@ApiTags('Model')
@Controller('models')
export class ModelController {
  constructor(
    private readonly modelService: ModelService,
    private readonly csvUploadService: CsvUploadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new model' })
  @ApiBody({
    description: 'Create a new vehicle model',
    type: CreateModelDto,
  })
  @ApiResponse({ status: 201, description: 'Model created successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async createModel(@Body() createModelDto: CreateModelDto) {
    return this.modelService.create(createModelDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all models with optional query filters' })
  @ApiResponse({ status: 200, description: 'Models fetched successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiQuery({ name: 'manufacturerId', required: false, description: 'Filter by manufacturer ID (MongoDB ObjectId)' })
  @ApiQuery({ name: 'fuelType', required: false, description: 'Filter by fuel type' })
  @ApiQuery({ name: 'launchYear', required: false, description: 'Filter by launch year' })
  @ApiQuery({ name: 'vehicleType', required: false, description: 'Filter by vehicle type' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status (true/false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Pagination - Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit the number of results' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort by field (e.g., name:asc)' })
  async getAllModels(
    @Query('manufacturerId') manufacturerId?: string,
    @Query('fuelType') fuelType?: string,
    @Query('launchYear') launchYear?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort?: string,
    @Req() req?: Request
  ): Promise<any> {
    const pagination = { page: parseInt(page.toString(), 10), limit: parseInt(limit.toString(), 10) };
    const sortOptions = sort ? Object.fromEntries(sort.split(',').map((s) => s.split(':'))) : {};
    const isActiveBool = getIsActiveFilter(isActive, req);

    return this.modelService.findAll({
      manufacturerId,
      fuelType,
      launchYear,
      vehicleType,
      isActive: isActiveBool,
      pagination,
      sortOptions
    });
  }

  @Get('manufacturer/:manufacturerId')
  @ApiOperation({ summary: 'Get all models for a specific manufacturer' })
  @ApiResponse({ status: 200, description: 'Models fetched successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiParam({ name: 'manufacturerId', required: true, description: 'Manufacturer ID (MongoDB ObjectId)' })
  async getModelsByManufacturer(@Param('manufacturerId') manufacturerId: string, @Req() req?: Request) {
    return this.modelService.findByManufacturer(manufacturerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a model by ID' })
  @ApiResponse({ status: 200, description: 'Model fetched successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getModelById(@Param('id') id: string) {
    return this.modelService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing model by ID' })
  @ApiBody({
    description: 'Update vehicle model details',
    type: UpdateModelDto,
  })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async updateModel(@Param('id') id: string, @Body() updateModelDto: UpdateModelDto) {
    return this.modelService.update(id, updateModelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a model by ID' })
  @ApiResponse({ status: 200, description: 'Model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async deleteModel(@Param('id') id: string) {
    return this.modelService.remove(id);
  }

  @Post('upload-csv')
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(UserRole.Admin)
  @CsvUploadDecorator('Upload vehicle models from CSV file', 'vehicle model')
  async uploadCSV(
    @UploadedFile() file: Express.Multer.File,
    @Query('skipDuplicates') skipDuplicates: string = 'true',
  ) {
    const results = await this.csvUploadService.processCSVUpload<CreateModelDto>({
      file,
      fieldTypes: VEHICLE_MODEL_FIELD_TYPES as any,
      skipDuplicates: skipDuplicates === 'true',
      validateRow: (dto) => {
        const nameError = this.csvUploadService.validateRequired('name', dto.name);
        if (nameError) return nameError;

        const manufacturerIdError = this.csvUploadService.validateObjectId('manufacturerId', dto.manufacturerId);
        if (manufacturerIdError) return manufacturerIdError;

        return null;
      },
      createOrSkip: (dto) => this.modelService.createOrSkip(dto),
      create: (dto) => this.modelService.create(dto),
    });

    return {
      message: `CSV upload completed. Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
      ...results,
    };
  }
}
