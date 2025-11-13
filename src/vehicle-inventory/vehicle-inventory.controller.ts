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
  UploadedFile,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

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
  @ApiOperation({
    summary:
      'Get all vehicle models with comprehensive filtering and pagination',
    description:
      'Retrieve vehicle models with advanced filtering options including search, manufacturer filters, vehicle specifications, features, and pagination support.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search vehicle models by name, display name, or description',
    example: 'swift',
  })
  @ApiQuery({
    name: 'manufacturerId',
    required: false,
    description: 'Filter by manufacturer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'vehicleType',
    required: false,
    description: 'Filter by vehicle type',
    enum: [
      'SUV',
      'Sedan',
      'Truck',
      'Coupe',
      'Hatchback',
      'Convertible',
      'two-wheeler',
      'MUV',
      'Compact SUV',
      'Sub-Compact SUV',
    ],
    example: 'SUV',
  })
  @ApiQuery({
    name: 'segment',
    required: false,
    description: 'Filter by vehicle segment (A, B, C, D, E)',
    example: 'B',
  })
  @ApiQuery({
    name: 'bodyType',
    required: false,
    description: 'Filter by body type',
    example: 'Hatchback',
  })
  @ApiQuery({
    name: 'minLaunchYear',
    required: false,
    description: 'Filter by minimum launch year',
    example: 2020,
  })
  @ApiQuery({
    name: 'maxLaunchYear',
    required: false,
    description: 'Filter by maximum launch year',
    example: 2024,
  })
  @ApiQuery({
    name: 'manufacturerName',
    required: false,
    description: 'Filter by manufacturer name',
    example: 'Maruti Suzuki',
  })
  @ApiQuery({
    name: 'manufacturerCountry',
    required: false,
    description: 'Filter by manufacturer origin country',
    example: 'Japan',
  })
  @ApiQuery({
    name: 'manufacturerCategory',
    required: false,
    description: 'Filter by manufacturer category',
    enum: [
      'passenger_car',
      'two_wheeler',
      'commercial_vehicle',
      'luxury',
      'suv',
    ],
    example: 'passenger_car',
  })
  @ApiQuery({
    name: 'manufacturerRegion',
    required: false,
    description: 'Filter by manufacturer region',
    enum: [
      'Asia',
      'Europe',
      'North America',
      'South America',
      'Africa',
      'Oceania',
    ],
    example: 'Asia',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Filter by minimum price of variants',
    example: 500000,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Filter by maximum price of variants',
    example: 2000000,
  })
  @ApiQuery({
    name: 'fuelType',
    required: false,
    description: 'Filter by fuel type',
    example: 'Petrol',
  })
  @ApiQuery({
    name: 'transmissionType',
    required: false,
    description: 'Filter by transmission type',
    example: 'Automatic',
  })
  @ApiQuery({
    name: 'featurePackage',
    required: false,
    description: 'Filter by feature package',
    enum: [
      'Base',
      'L',
      'LX',
      'V',
      'VX',
      'Z',
      'ZX',
      'ZX(O)',
      'ZX+',
      'Top End',
      'Premium',
      'Executive',
      'Royale',
    ],
    example: 'VX',
  })
  @ApiQuery({
    name: 'minSeatingCapacity',
    required: false,
    description: 'Filter by minimum seating capacity',
    example: 5,
  })
  @ApiQuery({
    name: 'maxSeatingCapacity',
    required: false,
    description: 'Filter by maximum seating capacity',
    example: 7,
  })
  @ApiQuery({
    name: 'minEngineCapacity',
    required: false,
    description: 'Filter by minimum engine capacity (cc)',
    example: 1000,
  })
  @ApiQuery({
    name: 'maxEngineCapacity',
    required: false,
    description: 'Filter by maximum engine capacity (cc)',
    example: 2000,
  })
  @ApiQuery({
    name: 'minMileage',
    required: false,
    description: 'Filter by minimum mileage (km/l)',
    example: 15,
  })
  @ApiQuery({
    name: 'maxMileage',
    required: false,
    description: 'Filter by maximum mileage (km/l)',
    example: 25,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field',
    enum: [
      'name',
      'displayName',
      'vehicleType',
      'segment',
      'bodyType',
      'launchYear',
      'manufacturer.name',
      'manufacturer.displayName',
      'manufacturer.originCountry',
      'createdAt',
      'updatedAt',
    ],
    example: 'displayName',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle models retrieved successfully',
    type: PaginatedVehicleModelResponseDto,
  })
  async findAllVehicleModels(@Query() filters: FilterVehicleModelDto) {
    // Check if any filters are provided
    const hasFilters = Object.keys(filters).some(
      (key) => filters[key] !== undefined,
    );

    if (hasFilters) {
      console.log(hasFilters);
      console.log(filters);
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
    name: 'modelId',
    required: false,
    description: 'Filter by vehicle model ID',
  })
  @ApiQuery({
    name: 'fuelTypeId',
    required: false,
    description: 'Filter by fuel type ID',
  })
  @ApiQuery({
    name: 'transmissionTypeId',
    required: false,
    description: 'Filter by transmission type ID',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Filter by minimum price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Filter by maximum price',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field',
    enum: ['price', 'name', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
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


  @Post('upload-vehicle-models')
  @ApiOperation({ summary: 'Bulk upload vehicle models from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing vehicle model data',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Vehicle models uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or missing file',
  })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  async vehicleModelCsvUpload(@UploadedFile() file:Express.Multer.File)
  {
    if(!file)
    {
      throw new HttpException({status:HttpStatus.BAD_REQUEST,error:"No file uploaded"},HttpStatus.BAD_REQUEST);
    }
    const filExt=path.extname(file.originalname).toLowerCase();

    if(filExt!=='.csv')
    {
      throw new BadRequestException('Only CSV files are supported');
    }
    return await this.vehicleInventoryService.createVehicleModelCsv(file.buffer,'csv')
  }

  
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload CSV file for vehicle variants',
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
    status: 201,
    description: 'Vehicle variants uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or upload failure',
  })
  @Post('upload-vehicle-variants-csv')
  @ApiOperation({ summary: 'Bulk upload vehicle variants from CSV file' })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  async vehicleVariantUploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'No file uploaded',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (fileExt !== '.csv') {
      throw new BadRequestException('Only CSV files are supported');
    }

    return await this.vehicleInventoryService.createVehicleVariantCsv(
      file.buffer,
      'csv',
    );
  }



}
