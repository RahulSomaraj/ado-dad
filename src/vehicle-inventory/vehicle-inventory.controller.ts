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
} from '@nestjs/common';
import { VehicleInventoryService } from './vehicle-inventory.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/shared/exception-service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { UserType } from 'src/users/enums/user.types';

@ApiTags('Vehicle Inventory')
@Controller('vehicle-inventory')
@UseFilters(new HttpExceptionFilter('Vehicle Inventory'))
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleInventoryController {
  constructor(
    private readonly vehicleInventoryService: VehicleInventoryService,
  ) {}

  // Manufacturer endpoints
  @Post('manufacturers')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
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
  @ApiOperation({ summary: 'Get all manufacturers' })
  @ApiResponse({
    status: 200,
    description: 'Manufacturers retrieved successfully',
  })
  async findAllManufacturers() {
    return this.vehicleInventoryService.findAllManufacturers();
  }

  @Get('manufacturers/:id')
  @ApiOperation({ summary: 'Get manufacturer by ID' })
  @ApiParam({ name: 'id', description: 'Manufacturer ID' })
  @ApiResponse({ status: 200, description: 'Manufacturer found' })
  @ApiResponse({ status: 404, description: 'Manufacturer not found' })
  async findManufacturerById(@Param('id') id: string) {
    return this.vehicleInventoryService.findManufacturerById(id);
  }

  // Vehicle Model endpoints
  @Post('models')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
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
  @ApiOperation({ summary: 'Get all vehicle models' })
  @ApiQuery({
    name: 'manufacturerId',
    required: false,
    description: 'Filter by manufacturer ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle models retrieved successfully',
  })
  async findAllVehicleModels(@Query('manufacturerId') manufacturerId?: string) {
    return this.vehicleInventoryService.findAllVehicleModels(manufacturerId);
  }

  @Get('models/:id')
  @ApiOperation({ summary: 'Get vehicle model by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle model ID' })
  @ApiResponse({ status: 200, description: 'Vehicle model found' })
  @ApiResponse({ status: 404, description: 'Vehicle model not found' })
  async findVehicleModelById(@Param('id') id: string) {
    return this.vehicleInventoryService.findVehicleModelById(id);
  }

  // Vehicle Variant endpoints
  @Post('variants')
  @Roles(UserType.SUPER_ADMIN, UserType.ADMIN)
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

  @Get('variants')
  @ApiOperation({ summary: 'Get all vehicle variants with filters' })
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
    name: 'maxPrice',
    required: false,
    description: 'Filter by maximum price',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle variants retrieved successfully',
  })
  async findAllVehicleVariants(
    @Query('modelId') modelId?: string,
    @Query('fuelTypeId') fuelTypeId?: string,
    @Query('transmissionTypeId') transmissionTypeId?: string,
    @Query('maxPrice') maxPrice?: number,
  ) {
    return this.vehicleInventoryService.findAllVehicleVariants(
      modelId,
      fuelTypeId,
      transmissionTypeId,
      maxPrice,
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

  // Advanced query endpoints for the requirements
  @Get('variants/diesel/:modelName')
  @ApiOperation({ summary: 'Get all diesel variants of a specific model' })
  @ApiParam({ name: 'modelName', description: 'Model name (e.g., Creta)' })
  @ApiResponse({ status: 200, description: 'Diesel variants found' })
  @ApiResponse({
    status: 404,
    description: 'Model or diesel fuel type not found',
  })
  async findDieselVariantsByModel(@Param('modelName') modelName: string) {
    return this.vehicleInventoryService.findDieselVariantsByModel(modelName);
  }

  @Get('variants/cng/under-price')
  @ApiOperation({ summary: 'Get all CNG variants under a specific price' })
  @ApiQuery({
    name: 'maxPrice',
    required: true,
    description: 'Maximum price in INR',
  })
  @ApiResponse({ status: 200, description: 'CNG variants found' })
  @ApiResponse({ status: 404, description: 'CNG fuel type not found' })
  async findCNGVariantsUnderPrice(@Query('maxPrice') maxPrice: number) {
    return this.vehicleInventoryService.findCNGVariantsUnderPrice(maxPrice);
  }

  @Get('manufacturers/:manufacturerId/models/multiple-fuel-types')
  @ApiOperation({
    summary: 'Get models that offer both Petrol and CNG variants',
  })
  @ApiParam({ name: 'manufacturerId', description: 'Manufacturer ID' })
  @ApiResponse({
    status: 200,
    description: 'Models with multiple fuel types found',
  })
  @ApiResponse({
    status: 404,
    description: 'Manufacturer or fuel types not found',
  })
  async findModelsWithMultipleFuelTypes(
    @Param('manufacturerId') manufacturerId: string,
  ) {
    return this.vehicleInventoryService.findModelsWithMultipleFuelTypes(
      manufacturerId,
    );
  }

  // Lookup endpoints
  @Get('fuel-types')
  @ApiOperation({ summary: 'Get all fuel types' })
  @ApiResponse({
    status: 200,
    description: 'Fuel types retrieved successfully',
  })
  async findAllFuelTypes() {
    return this.vehicleInventoryService.findAllFuelTypes();
  }

  @Get('transmission-types')
  @ApiOperation({ summary: 'Get all transmission types' })
  @ApiResponse({
    status: 200,
    description: 'Transmission types retrieved successfully',
  })
  async findAllTransmissionTypes() {
    return this.vehicleInventoryService.findAllTransmissionTypes();
  }

  // Search and utility endpoints
  @Get('variants/search')
  @ApiOperation({ summary: 'Search vehicle variants by name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchVariants(@Query('q') query: string) {
    return this.vehicleInventoryService.searchVariants(query);
  }

  @Get('price-range')
  @ApiOperation({ summary: 'Get the price range of all variants' })
  @ApiResponse({
    status: 200,
    description: 'Price range retrieved successfully',
  })
  async getPriceRange() {
    return this.vehicleInventoryService.getPriceRange();
  }
}
