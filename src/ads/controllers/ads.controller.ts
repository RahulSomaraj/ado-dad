import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdsService } from '../services/ads.service';
import { DataValidationService } from '../services/data-validation.service';
import {
  FilterAdDto,
  FilterVehicleModelsDto,
  FilterVehicleVariantsDto,
} from '../dto/common/filter-ad.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';
import { CreateAdDto } from '../dto/common/create-ad.dto';
import {
  AdResponseDto,
  PaginatedAdResponseDto,
  DetailedAdResponseDto,
  PaginatedDetailedAdResponseDto,
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
    private readonly dataValidationService: DataValidationService,
    private readonly s3Service: S3Service,
    private readonly vehicleInventoryService: VehicleInventoryService,
  ) {}

  @Post('list')
  @ApiOperation({
    summary: 'Get all advertisements with advanced filtering',
    description: `
      Retrieve advertisements with comprehensive filtering capabilities.
      
      **Features:**
      - Full-text search across title and description
      - Category-specific filtering (Property, Vehicle, Commercial Vehicle)
      - Price range filtering
      - Location-based filtering
      - Advanced vehicle filtering (manufacturer, model, variant, year, etc.)
      - Property-specific filtering (bedrooms, bathrooms, area, amenities)
      - Commercial vehicle filtering (payload, axles, permits, etc.)
      - Pagination and sorting
      - All filters are optional and can be combined
      
      **Response includes:**
      - Advertisement details
      - User information (name, email, phone)
      - Category-specific details
      - Vehicle inventory data (for vehicle ads)
      - Pagination metadata
    `,
  })
  @ApiBody({
    type: FilterAdDto,
    description: 'Filter criteria for advertisements',
    examples: {
      basic_filter: {
        summary: 'Basic Filter',
        description: 'Simple filter with category and price range',
        value: {
          category: 'property',
          minPrice: 100000,
          maxPrice: 5000000,
          location: 'Mumbai',
          page: 1,
          limit: 20,
        },
      },
      vehicle_filter: {
        summary: 'Vehicle Filter',
        description: 'Advanced vehicle filtering with manufacturer and model',
        value: {
          category: 'private_vehicle',
          vehicleType: 'four_wheeler',
          manufacturerId: ['507f1f77bcf86cd799439011'],
          modelId: ['507f1f77bcf86cd799439012'],
          minYear: 2018,
          maxYear: 2023,
          maxMileage: 50000,
          minPrice: 500000,
          maxPrice: 2000000,
          page: 1,
          limit: 20,
        },
      },
      property_filter: {
        summary: 'Property Filter',
        description: 'Property-specific filtering with bedrooms and area',
        value: {
          category: 'property',
          propertyType: 'apartment',
          minBedrooms: 2,
          maxBedrooms: 3,
          minBathrooms: 2,
          minArea: 1000,
          maxArea: 2000,
          isFurnished: true,
          hasParking: true,
          minPrice: 5000000,
          maxPrice: 15000000,
          page: 1,
          limit: 20,
        },
      },
      commercial_vehicle_filter: {
        summary: 'Commercial Vehicle Filter',
        description: 'Commercial vehicle filtering with payload and permits',
        value: {
          category: 'commercial_vehicle',
          commercialVehicleType: 'bus',
          bodyType: 'refrigerated',
          manufacturerId: ['686fb37cab966c7e18f26417'],
          modelId: ['686fb37dab966c7e18f2643a'],
          minYear: 2025,
          maxYear: 2025,
          maxMileage: 234,
          minPayloadCapacity: 3,
          maxPayloadCapacity: 3,
          axleCount: 2,
          transmissionTypeId: ['6860308d54670f22cc8de119'],
          fuelTypeId: ['6860308c54670f22cc8de0f9'],
          color: 'fdvdbd',
          hasInsurance: true,
          hasFitness: false,
          hasPermit: true,
          minSeatingCapacity: 3,
          maxSeatingCapacity: 3,
        },
      },
      two_wheeler_filter: {
        summary: 'Two Wheeler Filter',
        description:
          'Two-wheeler filtering with manufacturer, model, and features',
        value: {
          category: 'two_wheeler',
          manufacturerId: ['686fb37cab966c7e18f26417'],
          modelId: ['686fb37dab966c7e18f2643c'],
          minYear: 2025,
          maxYear: 2025,
          maxMileage: 545,
          color: 'vxfg',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Advertisements retrieved successfully',
    type: PaginatedDetailedAdResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllAds(
    @Body() filterDto: FilterAdDto,
  ): Promise<PaginatedDetailedAdResponseDto> {
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

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new advertisement',
    description:
      'Create an advertisement for any category (Property, Private Vehicle, Commercial Vehicle, Two Wheeler). Include fields relevant to your selected category.',
  })
  @ApiBody({
    type: CreateAdDto,
    description: 'Advertisement data with category-specific fields',
    examples: {
      property_example: {
        summary: 'Property Advertisement',
        description: 'Create a property advertisement with all relevant fields',
        value: {
          category: 'property',
          data: {
            title: 'Beautiful 2BHK Apartment in Prime Location',
            description:
              'Spacious and well-maintained 2BHK apartment with modern amenities and excellent connectivity.',
            price: 8500000,
            location: 'Bandra West, Mumbai, Maharashtra',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property2.jpg',
            ],
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
            floor: 8,
            isFurnished: true,
            hasParking: true,
            hasGarden: false,
            amenities: [
              'Gym',
              'Swimming Pool',
              'Security',
              'Lift',
              '24/7 Water Supply',
            ],
          },
        },
      },
      vehicle_example: {
        summary: 'Private Vehicle Advertisement',
        description:
          'Create a private vehicle advertisement with vehicle-specific details',
        value: {
          category: 'private_vehicle',
          data: {
            title: 'Honda City 2020 Model - Single Owner',
            description:
              'Well-maintained Honda City in excellent condition. Single owner, full service history.',
            price: 850000,
            location: 'Dwarka, Delhi, NCR',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle2.jpg',
            ],
            vehicleType: 'four_wheeler',
            manufacturerId: '507f1f77bcf86cd799439031',
            modelId: '507f1f77bcf86cd799439041',
            variantId: '507f1f77bcf86cd799439051',
            year: 2020,
            mileage: 25000,
            transmissionTypeId: '507f1f77bcf86cd799439061',
            fuelTypeId: '507f1f77bcf86cd799439071',
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Sunroof',
              'Leather Seats',
              'Navigation System',
              'Reverse Camera',
              'Bluetooth Connectivity',
            ],
          },
        },
      },
      commercial_example: {
        summary: 'Commercial Vehicle Advertisement',
        description:
          'Create a commercial vehicle advertisement for business use',
        value: {
          category: 'commercial_vehicle',
          data: {
            title: 'Tata 407 Truck - Excellent Condition',
            description:
              'Heavy duty Tata 407 truck in excellent condition. Perfect for logistics and transportation business.',
            price: 1800000,
            location: 'Pune, Maharashtra',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck2.jpg',
            ],
            commercialVehicleType: 'truck',
            bodyType: 'flatbed',
            manufacturerId: '507f1f77bcf86cd799439034',
            modelId: '507f1f77bcf86cd799439044',
            variantId: '507f1f77bcf86cd799439054',
            year: 2019,
            mileage: 75000,
            transmissionTypeId: '507f1f77bcf86cd799439061',
            fuelTypeId: '507f1f77bcf86cd799439072',
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
              'Anti-lock Braking System',
            ],
            seatingCapacity: 3,
          },
        },
      },
      two_wheeler_example: {
        summary: 'Two Wheeler Advertisement',
        description:
          'Create a two-wheeler advertisement for bikes and scooters',
        value: {
          category: 'two_wheeler',
          data: {
            title: 'Honda Activa 6G - 2021 Model',
            description:
              'Honda Activa 6G in pristine condition. Single owner, low mileage, excellent fuel efficiency.',
            price: 65000,
            location: 'Koramangala, Bangalore, Karnataka',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/scooter1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/scooter2.jpg',
            ],
            vehicleType: 'two_wheeler',
            manufacturerId: '507f1f77bcf86cd799439031',
            modelId: '507f1f77bcf86cd799439041',
            variantId: '507f1f77bcf86cd799439051',
            year: 2021,
            mileage: 12000,
            transmissionTypeId: '507f1f77bcf86cd799439063',
            fuelTypeId: '507f1f77bcf86cd799439071',
            color: 'Red',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Digital Console',
              'LED Headlight',
              'Mobile Charging Port',
              'External Fuel Filler',
              'Combi Brake System',
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
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        title: 'Beautiful 2BHK Apartment in Prime Location',
        description:
          'Spacious and well-maintained 2BHK apartment with modern amenities.',
        price: 8500000,
        images: [
          'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property1.jpg',
        ],
        location: 'Bandra West, Mumbai, Maharashtra',
        category: 'property',
        isActive: true,
        postedAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        postedBy: '507f1f77bcf86cd799439021',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or missing required fields',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'title should not be empty',
          'price must be a positive number',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async createAd(
    @Body() createAdDto: CreateAdDto,
    @Request() req: any,
  ): Promise<AdResponseDto> {
    try {
      console.log('Creating advertisement for user:', req.user._id);
      console.log('Advertisement category:', createAdDto.category);

      const result = await this.adsService.createAd(
        createAdDto,
        req.user._id.toString(),
      );

      console.log('Advertisement created successfully with ID:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating advertisement:', error);
      throw error;
    }
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
}
