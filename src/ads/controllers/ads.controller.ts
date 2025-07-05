import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/common';
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
import { FilterAdDto } from '../dto/common/filter-ad.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { CreateAdDto } from '../dto/common/create-ad.dto';
import {
  AdResponseDto,
  PaginatedAdResponseDto,
  DetailedAdResponseDto,
} from '../dto/common/ad-response.dto';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth-guard';
import { S3Service } from '../../shared/s3.service';
import { VehicleInventoryService } from '../../vehicle-inventory/vehicle-inventory.service';
import { RolesGuard } from '../../auth/guard/roles.guards';
import { Roles } from '../../auth/guard/roles.decorator';
import { UserType } from '../../users/enums/user.types';
import { LoggingInterceptor } from '../../interceptors/logging.interceptors';

@ApiTags('Ads')
@Controller('ads')
@UseInterceptors(LoggingInterceptor)
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly s3Service: S3Service,
    private readonly vehicleInventoryService: VehicleInventoryService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get all advertisements with comprehensive filtering and pagination',
    description:
      'Retrieve advertisements with advanced filtering capabilities. Supports filtering by category, price range, location, search terms, and category-specific filters. All filters are optional and can be combined for precise results.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['property', 'private_vehicle', 'commercial_vehicle', 'two_wheeler'],
    description: 'Filter by advertisement category',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in title and description (text search)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Filter by location (partial match)',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'postedBy',
    required: false,
    type: String,
    description: 'Filter by user who posted the advertisement',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by advertisement status (active/inactive)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price', 'postedAt', 'title', 'createdAt', 'updatedAt'],
    description: 'Sort by field (default: postedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
  })
  // Property-specific filters
  @ApiQuery({
    name: 'propertyType',
    required: false,
    enum: ['apartment', 'house', 'villa', 'plot', 'commercial'],
    description: 'Property type filter',
  })
  @ApiQuery({
    name: 'minBedrooms',
    required: false,
    type: Number,
    description: 'Minimum number of bedrooms',
  })
  @ApiQuery({
    name: 'maxBedrooms',
    required: false,
    type: Number,
    description: 'Maximum number of bedrooms',
  })
  @ApiQuery({
    name: 'minBathrooms',
    required: false,
    type: Number,
    description: 'Minimum number of bathrooms',
  })
  @ApiQuery({
    name: 'maxBathrooms',
    required: false,
    type: Number,
    description: 'Maximum number of bathrooms',
  })
  @ApiQuery({
    name: 'minArea',
    required: false,
    type: Number,
    description: 'Minimum area in square feet',
  })
  @ApiQuery({
    name: 'maxArea',
    required: false,
    type: Number,
    description: 'Maximum area in square feet',
  })
  @ApiQuery({
    name: 'isFurnished',
    required: false,
    type: Boolean,
    description: 'Filter by furnished status',
  })
  @ApiQuery({
    name: 'hasParking',
    required: false,
    type: Boolean,
    description: 'Filter by parking availability',
  })
  @ApiQuery({
    name: 'hasGarden',
    required: false,
    type: Boolean,
    description: 'Filter by garden availability',
  })
  // Vehicle-specific filters
  @ApiQuery({
    name: 'vehicleType',
    required: false,
    enum: ['two_wheeler', 'four_wheeler'],
    description: 'Vehicle type filter',
  })
  @ApiQuery({
    name: 'manufacturerId',
    required: false,
    type: String,
    description: 'Manufacturer ID filter',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    type: String,
    description: 'Model ID filter',
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    type: String,
    description: 'Variant ID filter',
  })
  @ApiQuery({
    name: 'minYear',
    required: false,
    type: Number,
    description: 'Minimum manufacturing year',
  })
  @ApiQuery({
    name: 'maxYear',
    required: false,
    type: Number,
    description: 'Maximum manufacturing year',
  })
  @ApiQuery({
    name: 'maxMileage',
    required: false,
    type: Number,
    description: 'Maximum mileage',
  })
  @ApiQuery({
    name: 'transmissionTypeId',
    required: false,
    type: String,
    description: 'Transmission type ID filter',
  })
  @ApiQuery({
    name: 'fuelTypeId',
    required: false,
    type: String,
    description: 'Fuel type ID filter',
  })
  @ApiQuery({
    name: 'color',
    required: false,
    type: String,
    description: 'Vehicle color filter',
  })
  @ApiQuery({
    name: 'isFirstOwner',
    required: false,
    type: Boolean,
    description: 'Filter by first owner status',
  })
  @ApiQuery({
    name: 'hasInsurance',
    required: false,
    type: Boolean,
    description: 'Filter by insurance status',
  })
  @ApiQuery({
    name: 'hasRcBook',
    required: false,
    type: Boolean,
    description: 'Filter by RC book availability',
  })
  // Commercial vehicle-specific filters
  @ApiQuery({
    name: 'commercialVehicleType',
    required: false,
    enum: ['truck', 'bus', 'tractor', 'trailer', 'other'],
    description: 'Commercial vehicle type filter',
  })
  @ApiQuery({
    name: 'bodyType',
    required: false,
    enum: ['flatbed', 'container', 'tanker', 'pickup', 'passenger', 'other'],
    description: 'Body type filter',
  })
  @ApiQuery({
    name: 'minPayloadCapacity',
    required: false,
    type: Number,
    description: 'Minimum payload capacity',
  })
  @ApiQuery({
    name: 'maxPayloadCapacity',
    required: false,
    type: Number,
    description: 'Maximum payload capacity',
  })
  @ApiQuery({
    name: 'axleCount',
    required: false,
    type: Number,
    description: 'Number of axles filter',
  })
  @ApiQuery({
    name: 'hasFitness',
    required: false,
    type: Boolean,
    description: 'Filter by fitness certificate status',
  })
  @ApiQuery({
    name: 'hasPermit',
    required: false,
    type: Boolean,
    description: 'Filter by permit status',
  })
  @ApiQuery({
    name: 'minSeatingCapacity',
    required: false,
    type: Number,
    description: 'Minimum seating capacity',
  })
  @ApiQuery({
    name: 'maxSeatingCapacity',
    required: false,
    type: Number,
    description: 'Maximum seating capacity',
  })
  @ApiResponse({
    status: 200,
    description:
      'Advertisements retrieved successfully with comprehensive filtering',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AdResponseDto' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 8 },
        hasNext: { type: 'boolean', example: true },
        hasPrev: { type: 'boolean', example: false },
      },
    },
  })
  async getAllAds(@Query() filterDto: FilterAdDto) {
    return this.adsService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get advertisement by ID with complete details',
    description:
      'Retrieve a single advertisement with all its details including category-specific information and vehicle inventory data (for vehicle ads). This endpoint provides comprehensive information about the advertisement including user details, property details, vehicle details, or commercial vehicle details based on the category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Advertisement ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Advertisement retrieved successfully',
    type: DetailedAdResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found',
  })
  async getAdById(@Param('id') id: string): Promise<DetailedAdResponseDto> {
    return this.adsService.getAdById(id);
  }

  @Post('property')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Property advertisement created successfully',
    type: AdResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPropertyAd(
    @Body() createDto: CreatePropertyAdDto,
    @Param('userId') userId: string,
  ): Promise<AdResponseDto> {
    return this.adsService.createPropertyAd(createDto, userId);
  }

  @Post('vehicle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vehicle advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle advertisement created successfully',
    type: AdResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createVehicleAd(
    @Body() createDto: CreateVehicleAdDto,
    @Param('userId') userId: string,
  ): Promise<AdResponseDto> {
    return this.adsService.createVehicleAd(createDto, userId);
  }

  @Post('commercial-vehicle')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a commercial vehicle advertisement' })
  @ApiResponse({
    status: 201,
    description: 'Commercial vehicle advertisement created successfully',
    type: AdResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCommercialVehicleAd(
    @Body() createDto: CreateCommercialVehicleAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    return this.adsService.createCommercialVehicleAd(createDto, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new advertisement',
    description:
      'Create an advertisement for any category (Property, Private Vehicle, Commercial Vehicle, Two Wheeler). All fields in the data object are optional, but you should include the fields relevant to your selected category.',
  })
  @ApiBody({
    type: CreateAdDto,
    description:
      'Advertisement data - include fields relevant to the selected category',
    examples: {
      property: {
        summary: 'Property Ad Example',
        description: 'Complete example for creating a property advertisement',
        value: {
          category: 'property',
          data: {
            title: 'Beautiful 2BHK Apartment in Prime Location',
            description:
              'Spacious and well-maintained 2BHK apartment located in the heart of the city. This property offers modern amenities, excellent connectivity, and a peaceful neighborhood.',
            price: 8500000,
            location: 'Bandra West, Mumbai, Maharashtra',
            images: [
              'https://example.com/property/living-room.jpg',
              'https://example.com/property/bedroom.jpg',
            ],
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
            floor: 8,
            isFurnished: true,
            hasParking: true,
            hasGarden: false,
            amenities: ['Gym', 'Swimming Pool', 'Garden', 'Security', 'Lift'],
          },
        },
      },
      private_vehicle: {
        summary: 'Private Vehicle Ad Example',
        description:
          'Complete example for creating a private vehicle advertisement',
        value: {
          category: 'private_vehicle',
          data: {
            title: 'Honda City 2020 Model - Single Owner',
            description:
              'Well-maintained Honda City in excellent condition. Single owner, full service history, no accidents. Perfect for daily commute.',
            price: 850000,
            location: 'Dwarka, Delhi, NCR',
            images: [
              'https://example.com/vehicle/exterior.jpg',
              'https://example.com/vehicle/interior.jpg',
            ],
            vehicleType: 'four_wheeler',
            manufacturerId: '507f1f77bcf86cd799439011',
            modelId: '507f1f77bcf86cd799439012',
            variantId: '507f1f77bcf86cd799439013',
            year: 2020,
            mileage: 25000,
            transmissionTypeId: '507f1f77bcf86cd799439014',
            fuelTypeId: '507f1f77bcf86cd799439015',
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Sunroof',
              'Leather Seats',
              'Navigation System',
              'Reverse Camera',
            ],
          },
        },
      },
      commercial_vehicle: {
        summary: 'Commercial Vehicle Ad Example',
        description:
          'Complete example for creating a commercial vehicle advertisement',
        value: {
          category: 'commercial_vehicle',
          data: {
            title: 'Tata 407 Truck - Excellent Condition',
            description:
              'Heavy duty Tata 407 truck in excellent condition. Perfect for logistics and transportation business. Well-maintained with all necessary permits.',
            price: 1800000,
            location: 'Pune, Maharashtra',
            images: [
              'https://example.com/truck/exterior.jpg',
              'https://example.com/truck/cargo-area.jpg',
            ],
            vehicleType: 'four_wheeler',
            commercialVehicleType: 'truck',
            bodyType: 'flatbed',
            manufacturerId: '507f1f77bcf86cd799439011',
            modelId: '507f1f77bcf86cd799439012',
            variantId: '507f1f77bcf86cd799439013',
            year: 2019,
            mileage: 75000,
            transmissionTypeId: '507f1f77bcf86cd799439014',
            fuelTypeId: '507f1f77bcf86cd799439015',
            color: 'Blue',
            payloadCapacity: 5000,
            payloadUnit: 'kg',
            axleCount: 2,
            hasInsurance: true,
            hasFitness: true,
            hasPermit: true,
            additionalFeatures: [
              'GPS Tracking',
              'Climate Control',
              'Safety Features',
            ],
            seatingCapacity: 3,
          },
        },
      },
      two_wheeler: {
        summary: 'Two Wheeler Ad Example',
        description:
          'Complete example for creating a two-wheeler advertisement',
        value: {
          category: 'two_wheeler',
          data: {
            title: 'Honda Activa 6G - 2021 Model',
            description:
              'Honda Activa 6G in pristine condition. Single owner, low mileage, excellent fuel efficiency. Perfect for daily commute.',
            price: 65000,
            location: 'Koramangala, Bangalore, Karnataka',
            images: [
              'https://example.com/scooter/exterior.jpg',
              'https://example.com/scooter/dashboard.jpg',
            ],
            vehicleType: 'two_wheeler',
            manufacturerId: '507f1f77bcf86cd799439011',
            modelId: '507f1f77bcf86cd799439012',
            variantId: '507f1f77bcf86cd799439013',
            year: 2021,
            mileage: 12000,
            transmissionTypeId: '507f1f77bcf86cd799439014',
            fuelTypeId: '507f1f77bcf86cd799439015',
            color: 'Red',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Digital Console',
              'LED Headlight',
              'Mobile Charging Port',
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Advertisement created successfully',
    type: AdResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - validation error or missing required fields for the selected category',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async createAd(
    @Body() createAdDto: CreateAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    return this.adsService.createAd(createAdDto, req.user.id);
  }

  @Post('upload-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.ADMIN)
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
  @Roles(UserType.USER, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update advertisement by ID',
    description:
      'Update an existing advertisement. Only the advertisement owner or admin can update it.',
  })
  @ApiParam({ name: 'id', description: 'Advertisement ID (MongoDB ObjectId)' })
  @ApiBody({ type: CreateAdDto })
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
    @Body() updateAdDto: CreateAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    return this.adsService.update(id, updateAdDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete advertisement by ID',
    description:
      'Delete an advertisement. Only the advertisement owner or admin can delete it.',
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
    await this.adsService.delete(id, req.user.id);
    return { message: 'Advertisement deleted successfully' };
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

  @Get('lookup/vehicle-models')
  @ApiOperation({ summary: 'Get all vehicle models' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle models retrieved successfully',
  })
  @ApiQuery({
    name: 'manufacturerId',
    required: false,
    description: 'Filter by manufacturer ID',
  })
  async getVehicleModels(@Query('manufacturerId') manufacturerId?: string) {
    return this.vehicleInventoryService.findAllVehicleModels(manufacturerId);
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

  @Get('lookup/vehicle-variants')
  @ApiOperation({ summary: 'Get all vehicle variants' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle variants retrieved successfully',
  })
  @ApiQuery({
    name: 'modelId',
    required: false,
    description: 'Filter by model ID',
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
  async getVehicleVariants(
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
}
