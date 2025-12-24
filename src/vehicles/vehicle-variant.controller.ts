import { Controller, Post, Put, Get, Param, Body, Query, Delete, Req, UploadedFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import { UpdateVehicleVariantDto } from './dto/update-vehicle-variant.dto';
import { VehicleVariantService } from './vehicle-variant.service';
import { getIsActiveFilter } from '../common/utils/admin.helpers';
import { CsvUploadService } from '../common/services/csv-upload.service';
import { CsvUploadDecorator } from '../common/decorators/csv-upload.decorator';
import { VEHICLE_VARIANT_FIELD_TYPES } from '../common/utils/csv-field-mappers';

@ApiTags('Vehicle Variants')
@Controller('vehicle-variants')
export class VehicleVariantController {
  constructor(
    private readonly variantService: VehicleVariantService,
    private readonly csvUploadService: CsvUploadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle variant' })
  @ApiBody({
    description: 'Create a new vehicle variant',
    type: CreateVehicleVariantDto,
  })
  @ApiResponse({ status: 201, description: 'Variant created successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async createVariant(@Body() createVariantDto: CreateVehicleVariantDto) {
    return this.variantService.create(createVariantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicle variants with optional query filters' })
  @ApiResponse({ status: 200, description: 'Variants fetched successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiQuery({ name: 'modelId', required: false, description: 'Filter by model ID (MongoDB ObjectId)' })
  @ApiQuery({ name: 'fuelType', required: false, description: 'Filter by fuel type' })
  @ApiQuery({ name: 'transmissionType', required: false, description: 'Filter by transmission type' })
  @ApiQuery({ name: 'featurePackage', required: false, description: 'Filter by feature package' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status (true/false)' })
  async getAllVariants(
    @Query('modelId') modelId?: string,
    @Query('fuelType') fuelType?: string,
    @Query('transmissionType') transmissionType?: string,
    @Query('featurePackage') featurePackage?: string,
    @Query('isActive') isActive?: string,
    @Req() req?: Request
  ): Promise<any> {
    const isActiveBool = getIsActiveFilter(isActive, req);

    return this.variantService.findAll({
      modelId,
      fuelType,
      transmissionType,
      featurePackage,
      isActive: isActiveBool,
    });
  }

  @Get('model/:modelId')
  @ApiOperation({ summary: 'Get all variants for a specific model' })
  @ApiResponse({ status: 200, description: 'Variants fetched successfully' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @ApiParam({ name: 'modelId', required: true, description: 'Model ID (MongoDB ObjectId)' })
  async getVariantsByModel(@Param('modelId') modelId: string, @Req() req?: Request) {
    return this.variantService.findByModel(modelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a variant by ID' })
  @ApiResponse({ status: 200, description: 'Variant fetched successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async getVariantById(@Param('id') id: string) {
    return this.variantService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing variant by ID' })
  @ApiBody({
    description: 'Update vehicle variant details',
    type: UpdateVehicleVariantDto,
  })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async updateVariant(@Param('id') id: string, @Body() updateVariantDto: UpdateVehicleVariantDto) {
    return this.variantService.update(id, updateVariantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a variant by ID' })
  @ApiResponse({ status: 200, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async deleteVariant(@Param('id') id: string) {
    return this.variantService.remove(id);
  }

  @Post('upload-csv')
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(UserRole.Admin)
  @CsvUploadDecorator('Upload vehicle variants from CSV file', 'vehicle variant')
  async uploadCSV(
    @UploadedFile() file: Express.Multer.File,
    @Query('skipDuplicates') skipDuplicates: string = 'true',
  ) {
    const results = await this.csvUploadService.processCSVUpload<CreateVehicleVariantDto>({
      file,
      fieldTypes: VEHICLE_VARIANT_FIELD_TYPES as any,
      skipDuplicates: skipDuplicates === 'true',
      validateRow: (dto) => {
        const fuelTypeError = this.csvUploadService.validateRequired('fuelType', dto.fuelType);
        if (fuelTypeError) return fuelTypeError;

        const transmissionTypeError = this.csvUploadService.validateRequired('transmissionType', dto.transmissionType);
        if (transmissionTypeError) return transmissionTypeError;

        const featurePackageError = this.csvUploadService.validateRequired('featurePackage', dto.featurePackage);
        if (featurePackageError) return featurePackageError;

        const modelIdError = this.csvUploadService.validateObjectId('modelId', dto.modelId);
        if (modelIdError) return modelIdError;

        return null;
      },
      createOrSkip: (dto) => this.variantService.createOrSkip(dto),
      create: (dto) => this.variantService.create(dto),
    });

    return {
      message: `CSV upload completed. Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
      ...results,
    };
  }
}

