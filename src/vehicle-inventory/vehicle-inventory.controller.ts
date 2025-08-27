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
} from '@nestjs/common';
import { VehicleInventoryService } from './vehicle-inventory.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { FilterManufacturerDto } from './dto/filter-manufacturer.dto';
import { FilterVehicleModelDto } from './dto/filter-vehicle-model.dto';
import { PaginatedManufacturerResponseDto } from './dto/manufacturer-response.dto';
import { PaginatedVehicleModelResponseDto } from './dto/vehicle-model-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
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

@ApiTags('Vehicle Inventory')
@Controller('vehicle-inventory')
@UseFilters(new HttpExceptionFilter('Vehicle Inventory'))
export class VehicleInventoryController {
  constructor(
    private readonly vehicleInventoryService: VehicleInventoryService,
  ) {}

  // Manufacturer endpoints
  @Post('manufacturers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new manufacturer' })
  @ApiResponse({
    status: 201,
    description: 'Manufacturer created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createManufacturer(
    @Body() createManufacturerDto: CreateManufacturerDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleInventoryService.createManufacturer(
      createManufacturerDto,
    );
  }

  @Get('manufacturers')
  @ApiOperation({
    summary: 'Get all manufacturers with comprehensive filtering',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search manufacturers by name, display name, or description',
    example: 'honda',
  })
  @ApiQuery({
    name: 'originCountry',
    required: false,
    description: 'Filter by origin country',
    example: 'Japan',
  })
  @ApiQuery({
    name: 'minFoundedYear',
    required: false,
    description: 'Filter by minimum founded year',
    example: 1900,
  })
  @ApiQuery({
    name: 'maxFoundedYear',
    required: false,
    description: 'Filter by maximum founded year',
    example: 2000,
  })
  @ApiQuery({
    name: 'headquarters',
    required: false,
    description: 'Filter by headquarters location',
    example: 'Tokyo',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'category',
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
    name: 'region',
    required: false,
    description: 'Filter by region',
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
    name: 'sortBy',
    required: false,
    description: 'Sort by field',
    enum: [
      'name',
      'displayName',
      'originCountry',
      'foundedYear',
      'headquarters',
      'createdAt',
      'updatedAt',
    ],
    example: 'name',
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
    description: 'Manufacturers retrieved successfully',
    type: PaginatedManufacturerResponseDto,
  })
  async findAllManufacturers(@Query() filters: FilterManufacturerDto) {
    // Check if any filters are provided
    const hasFilters = Object.keys(filters).some(
      (key) => filters[key] !== undefined,
    );

    if (hasFilters) {
      return this.vehicleInventoryService.findManufacturersWithFilters(filters);
    } else {
      // Return simple list if no filters
      const manufacturers =
        await this.vehicleInventoryService.findAllManufacturers();
      return {
        data: manufacturers,
        total: manufacturers.length,
        page: 1,
        limit: manufacturers.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
    }
  }

  @Get('manufacturers/:id')
  @ApiOperation({ summary: 'Get manufacturer by ID' })
  @ApiParam({ name: 'id', description: 'Manufacturer ID' })
  @ApiResponse({ status: 200, description: 'Manufacturer found' })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  async findManufacturerById(@Param('id') id: string) {
    return this.vehicleInventoryService.findManufacturerById(id);
  }

  @Put('manufacturers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a manufacturer' })
  @ApiParam({ name: 'id', description: 'Manufacturer ID' })
  @ApiResponse({
    status: 200,
    description: 'Manufacturer updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  async updateManufacturer(
    @Param('id') id: string,
    @Body() updateManufacturerDto: UpdateManufacturerDto,
    @Request() req,
  ) {
    const { user } = req;
    return this.vehicleInventoryService.updateManufacturer(
      id,
      updateManufacturerDto,
    );
  }

  @Delete('manufacturers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a manufacturer' })
  @ApiParam({ name: 'id', description: 'Manufacturer ID' })
  @ApiResponse({
    status: 200,
    description: 'Manufacturer deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  async deleteManufacturer(@Param('id') id: string, @Request() req) {
    const { user } = req;
    return this.vehicleInventoryService.deleteManufacturer(id);
  }

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
}
