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
} from '@nestjs/common';
import { VehicleInventoryService } from './vehicle-inventory.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
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
import { RolesGuard } from '../roles/roles.guard';
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  // Vehicle Model endpoints
  @Post('models')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    name: 'turbocharged',
    required: false,
    description: 'Filter by turbocharged engines only',
    example: true,
  })
  @ApiQuery({
    name: 'hasSunroof',
    required: false,
    description: 'Filter by models with sunroof',
    example: true,
  })
  @ApiQuery({
    name: 'hasAlloyWheels',
    required: false,
    description: 'Filter by models with alloy wheels',
    example: true,
  })
  @ApiQuery({
    name: 'hasAutomaticClimateControl',
    required: false,
    description: 'Filter by models with automatic climate control',
    example: true,
  })
  @ApiQuery({
    name: 'hasNavigation',
    required: false,
    description: 'Filter by models with navigation',
    example: true,
  })
  @ApiQuery({
    name: 'hasParkingSensors',
    required: false,
    description: 'Filter by models with parking sensors',
    example: true,
  })
  @ApiQuery({
    name: 'hasABS',
    required: false,
    description: 'Filter by models with ABS',
    example: true,
  })
  @ApiQuery({
    name: 'hasAirbags',
    required: false,
    description: 'Filter by models with airbags',
    example: true,
  })
  @ApiQuery({
    name: 'hasLeatherSeats',
    required: false,
    description: 'Filter by models with leather seats',
    example: true,
  })
  @ApiQuery({
    name: 'hasLEDHeadlamps',
    required: false,
    description: 'Filter by models with LED headlamps',
    example: true,
  })
  @ApiQuery({
    name: 'hasTouchscreen',
    required: false,
    description: 'Filter by models with touchscreen',
    example: true,
  })
  @ApiQuery({
    name: 'hasAndroidAuto',
    required: false,
    description: 'Filter by models with Android Auto',
    example: true,
  })
  @ApiQuery({
    name: 'hasAppleCarPlay',
    required: false,
    description: 'Filter by models with Apple CarPlay',
    example: true,
  })
  @ApiQuery({
    name: 'hasWirelessCharging',
    required: false,
    description: 'Filter by models with wireless charging',
    example: true,
  })
  @ApiQuery({
    name: 'hasCruiseControl',
    required: false,
    description: 'Filter by models with cruise control',
    example: true,
  })
  @ApiQuery({
    name: 'hasKeylessEntry',
    required: false,
    description: 'Filter by models with keyless entry',
    example: true,
  })
  @ApiQuery({
    name: 'hasPushButtonStart',
    required: false,
    description: 'Filter by models with push button start',
    example: true,
  })
  @ApiQuery({
    name: 'hasPowerWindows',
    required: false,
    description: 'Filter by models with power windows',
    example: true,
  })
  @ApiQuery({
    name: 'hasPowerSteering',
    required: false,
    description: 'Filter by models with power steering',
    example: true,
  })
  @ApiQuery({
    name: 'hasCentralLocking',
    required: false,
    description: 'Filter by models with central locking',
    example: true,
  })
  @ApiQuery({
    name: 'hasImmobilizer',
    required: false,
    description: 'Filter by models with immobilizer',
    example: true,
  })
  @ApiQuery({
    name: 'hasAlarmSystem',
    required: false,
    description: 'Filter by models with alarm system',
    example: true,
  })
  @ApiQuery({
    name: 'hasBluetooth',
    required: false,
    description: 'Filter by models with Bluetooth',
    example: true,
  })
  @ApiQuery({
    name: 'hasUSBCharging',
    required: false,
    description: 'Filter by models with USB charging',
    example: true,
  })
  @ApiQuery({
    name: 'hasAMFMRadio',
    required: false,
    description: 'Filter by models with AM/FM radio',
    example: true,
  })
  @ApiQuery({
    name: 'hasCDPlayer',
    required: false,
    description: 'Filter by models with CD player',
    example: true,
  })
  @ApiQuery({
    name: 'hasAUXInput',
    required: false,
    description: 'Filter by models with AUX input',
    example: true,
  })
  @ApiQuery({
    name: 'hasSubwoofer',
    required: false,
    description: 'Filter by models with subwoofer',
    example: true,
  })
  @ApiQuery({
    name: 'hasPremiumAudio',
    required: false,
    description: 'Filter by models with premium audio',
    example: true,
  })
  @ApiQuery({
    name: 'hasDigitalInstrumentCluster',
    required: false,
    description: 'Filter by models with digital instrument cluster',
    example: true,
  })
  @ApiQuery({
    name: 'hasHeadsUpDisplay',
    required: false,
    description: 'Filter by models with heads up display',
    example: true,
  })
  @ApiQuery({
    name: 'hasMultiInformationDisplay',
    required: false,
    description: 'Filter by models with multi information display',
    example: true,
  })
  @ApiQuery({
    name: 'hasRearEntertainment',
    required: false,
    description: 'Filter by models with rear entertainment',
    example: true,
  })
  @ApiQuery({
    name: 'hasParkingCamera',
    required: false,
    description: 'Filter by models with parking camera',
    example: true,
  })
  @ApiQuery({
    name: 'has360DegreeCamera',
    required: false,
    description: 'Filter by models with 360 degree camera',
    example: true,
  })
  @ApiQuery({
    name: 'hasAutomaticParking',
    required: false,
    description: 'Filter by models with automatic parking',
    example: true,
  })
  @ApiQuery({
    name: 'hasSportMode',
    required: false,
    description: 'Filter by models with sport mode',
    example: true,
  })
  @ApiQuery({
    name: 'hasEcoMode',
    required: false,
    description: 'Filter by models with eco mode',
    example: true,
  })
  @ApiQuery({
    name: 'hasPaddleShifters',
    required: false,
    description: 'Filter by models with paddle shifters',
    example: true,
  })
  @ApiQuery({
    name: 'hasLaunchControl',
    required: false,
    description: 'Filter by models with launch control',
    example: true,
  })
  @ApiQuery({
    name: 'hasAdaptiveSuspension',
    required: false,
    description: 'Filter by models with adaptive suspension',
    example: true,
  })
  @ApiQuery({
    name: 'hasSportSuspension',
    required: false,
    description: 'Filter by models with sport suspension',
    example: true,
  })
  @ApiQuery({
    name: 'hasHeightAdjustableSuspension',
    required: false,
    description: 'Filter by models with height adjustable suspension',
    example: true,
  })
  @ApiQuery({
    name: 'hasOneTouchUpDown',
    required: false,
    description: 'Filter by models with one touch up/down windows',
    example: true,
  })
  @ApiQuery({
    name: 'hasElectricPowerSteering',
    required: false,
    description: 'Filter by models with electric power steering',
    example: true,
  })
  @ApiQuery({
    name: 'hasTiltSteering',
    required: false,
    description: 'Filter by models with tilt steering',
    example: true,
  })
  @ApiQuery({
    name: 'hasTelescopicSteering',
    required: false,
    description: 'Filter by models with telescopic steering',
    example: true,
  })
  @ApiQuery({
    name: 'hasSteeringMountedControls',
    required: false,
    description: 'Filter by models with steering mounted controls',
    example: true,
  })
  @ApiQuery({
    name: 'hasAutoDimmingIrvm',
    required: false,
    description: 'Filter by models with auto dimming IRVM',
    example: true,
  })
  @ApiQuery({
    name: 'hasAutoFoldingIrvm',
    required: false,
    description: 'Filter by models with auto folding IRVM',
    example: true,
  })
  @ApiQuery({
    name: 'hasVanityMirrors',
    required: false,
    description: 'Filter by models with vanity mirrors',
    example: true,
  })
  @ApiQuery({
    name: 'hasCooledGloveBox',
    required: false,
    description: 'Filter by models with cooled glove box',
    example: true,
  })
  @ApiQuery({
    name: 'hasSunglassHolder',
    required: false,
    description: 'Filter by models with sunglass holder',
    example: true,
  })
  @ApiQuery({
    name: 'hasUmbrellaHolder',
    required: false,
    description: 'Filter by models with umbrella holder',
    example: true,
  })
  @ApiQuery({
    name: 'hasBootLight',
    required: false,
    description: 'Filter by models with boot light',
    example: true,
  })
  @ApiQuery({
    name: 'hasPuddleLamps',
    required: false,
    description: 'Filter by models with puddle lamps',
    example: true,
  })
  @ApiQuery({
    name: 'hasWelcomeLight',
    required: false,
    description: 'Filter by models with welcome light',
    example: true,
  })
  @ApiQuery({
    name: 'hasFootwellLighting',
    required: false,
    description: 'Filter by models with footwell lighting',
    example: true,
  })
  @ApiQuery({
    name: 'hasEngineImmobilizer',
    required: false,
    description: 'Filter by models with engine immobilizer',
    example: true,
  })
  @ApiQuery({
    name: 'hasSecurityAlarm',
    required: false,
    description: 'Filter by models with security alarm',
    example: true,
  })
  @ApiQuery({
    name: 'hasPanicAlarm',
    required: false,
    description: 'Filter by models with panic alarm',
    example: true,
  })
  @ApiQuery({
    name: 'hasTheftAlarm',
    required: false,
    description: 'Filter by models with theft alarm',
    example: true,
  })
  @ApiQuery({
    name: 'hasVehicleTracking',
    required: false,
    description: 'Filter by models with vehicle tracking',
    example: true,
  })
  @ApiQuery({
    name: 'hasGPSTracking',
    required: false,
    description: 'Filter by models with GPS tracking',
    example: true,
  })
  @ApiQuery({
    name: 'hasRemoteLocking',
    required: false,
    description: 'Filter by models with remote locking',
    example: true,
  })
  @ApiQuery({
    name: 'hasRemoteUnlocking',
    required: false,
    description: 'Filter by models with remote unlocking',
    example: true,
  })
  @ApiQuery({
    name: 'hasRemoteStart',
    required: false,
    description: 'Filter by models with remote start',
    example: true,
  })
  @ApiQuery({
    name: 'hasRemoteClimateControl',
    required: false,
    description: 'Filter by models with remote climate control',
    example: true,
  })
  @ApiQuery({
    name: 'hasGeofencing',
    required: false,
    description: 'Filter by models with geofencing',
    example: true,
  })
  @ApiQuery({
    name: 'hasValetMode',
    required: false,
    description: 'Filter by models with valet mode',
    example: true,
  })
  @ApiQuery({
    name: 'hasServiceReminder',
    required: false,
    description: 'Filter by models with service reminder',
    example: true,
  })
  @ApiQuery({
    name: 'hasMaintenanceSchedule',
    required: false,
    description: 'Filter by models with maintenance schedule',
    example: true,
  })
  @ApiQuery({
    name: 'hasDiagnosticSystem',
    required: false,
    description: 'Filter by models with diagnostic system',
    example: true,
  })
  @ApiQuery({
    name: 'hasCheckEngineLight',
    required: false,
    description: 'Filter by models with check engine light',
    example: true,
  })
  @ApiQuery({
    name: 'hasLowFuelWarning',
    required: false,
    description: 'Filter by models with low fuel warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasLowOilWarning',
    required: false,
    description: 'Filter by models with low oil warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasLowTyrePressureWarning',
    required: false,
    description: 'Filter by models with low tyre pressure warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasLowWiperFluidWarning',
    required: false,
    description: 'Filter by models with low wiper fluid warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasBatteryWarning',
    required: false,
    description: 'Filter by models with battery warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasDoorOpenWarning',
    required: false,
    description: 'Filter by models with door open warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasSeatbeltWarning',
    required: false,
    description: 'Filter by models with seatbelt warning',
    example: true,
  })
  @ApiQuery({
    name: 'hasHandbrakeWarning',
    required: false,
    description: 'Filter by models with handbrake warning',
    example: true,
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

  // Vehicle Variant endpoints
  @Post('variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
