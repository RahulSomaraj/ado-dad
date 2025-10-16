import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  UseGuards,
  Req,
  BadRequestException,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CreateAdV2Dto } from './dto/create-ad-v2.dto';
import { ListAdsV2Dto } from './dto/list-ads-v2.dto';
import { CreateAdUc } from './application/use-cases/create-ad.uc';
import { ListAdsUc } from './application/use-cases/list-ads.uc';
import { GetAdByIdUc } from './application/use-cases/get-ad-by-id.uc';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../auth/guard/roles.guards';
import { Roles } from '../auth/guard/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { DetailedAdResponseDto } from '../ads/dto/common/ad-response.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@ApiTags('Ads v2')
@Controller('v2/ads')
export class AdsV2Controller {
  constructor(
    private readonly createAdUc: CreateAdUc,
    private readonly listAdsUc: ListAdsUc,
    private readonly getAdByIdUc: GetAdByIdUc,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Extract user ID from JWT token if present
   */
  private extractUserIdFromToken(authHeader: string): string | null {
    try {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const secret =
        this.configService.get('TOKEN_KEY') ||
        'default-secret-key-change-in-production';

      const payload = this.jwtService.verify(token, { secret });
      return payload.id || null;
    } catch (error) {
      return null;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new advertisement (v2)',
    description: `
      Create an advertisement with enhanced validation, idempotency support, and better error handling.
      
      **Features:**
      - Strong DTO validation (compile-time + runtime)
      - Inventory integrity checks for vehicle references
      - Commercial vehicle auto-detection
      - Idempotency support via Idempotency-Key header
      - Transactional writes (Ad + subdocument)
      - Cache invalidation
      - Async event processing for enrichments
      
      **Idempotency:**
      - Provide Idempotency-Key header to make retries safe
      - Same key with same data returns cached result
      - Prevents duplicate creates on network retries
      
      **Validation:**
      - Category-specific field validation
      - Inventory reference validation
      - Price and numeric field validation
      - Image count limits (max 20)
    `,
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'UUID to make retries safe (recommended)',
    example: '1f3b8f48-1d7a-4c63-a8a2-7e5d9f5a3d6e',
  })
  @ApiBody({
    description: 'Advertisement creation data with examples for each category',
    type: CreateAdV2Dto,
    examples: {
      property: {
        summary: 'Property Advertisement',
        description: 'Example for creating a property advertisement',
        value: {
          category: 'property',
          data: {
            description:
              'എറണാകുളം ജില്ല arayankaav ടൗണിനു സമീപം പ്രീമിയം പ്ലോട്ടുകൾ വില്പനക്ക് 9747757547',
            price: 100000,
            location: 'arayankaav',
            link: 'https://example.com/property-details/arayankaav-plot',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/0104fc6e-f6cd-44a3-b95b-83f742255912-image_1757679411039.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/3f432878-2cda-44c9-b203-18932a2cc648-image_1757679412305.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/8fc3df77-4d2e-45b8-b8b8-f9714f35015f-image_1757679413180.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/654bcc2e-e319-40b9-bbc5-c7770ad648f3-image_1757679414099.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/f82c62e2-ada1-42ce-ae0f-99ee1c32799c-image_1757679414998.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/1b215bcf-8c59-49a9-80e5-e29628cbef5a-image_1757679415930.jpeg',
            ],
          },
          property: {
            propertyType: 'plot',
            bedrooms: 0,
            bathrooms: 0,
            areaSqft: 100,
            floor: 0,
            isFurnished: true,
            hasParking: true,
            hasGarden: true,
            amenities: [],
          },
        },
      },
      private_vehicle: {
        summary: 'Private Vehicle Advertisement',
        description: 'Example for creating a private vehicle advertisement',
        value: {
          category: 'private_vehicle',
          data: {
            description: 'Sporty Porsche Macan Turbo with turbo performance.',
            price: 120000090,
            location: 'Pune, Maharashtra',
            link: 'https://example.com/vehicle-details/porsche-macan-turbo',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/3fa63fc6-d4a8-437a-89f1-c86dc3e55c62-image_1756892894323.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/4aa322a1-134c-4a58-87b7-ef53ad2d2783-image_1756892894685.jpeg',
            ],
          },
          vehicle: {
            vehicleType: 'four_wheeler',
            manufacturerId: '507f1f77bcf86cd799439031',
            modelId: '507f1f77bcf86cd799439041',
            year: 2020,
            mileage: 20000,
            transmissionTypeId: '507f1f77bcf86cd799439031',
            fuelTypeId: '507f1f77bcf86cd799439041',
            color: 'Carrara White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Premium Audio System',
              'Panoramic Sunroof',
              'Heated Seats',
              '360° Camera',
              'Air Suspension',
            ],
          },
        },
      },
      commercial_vehicle: {
        summary: 'Commercial Vehicle Advertisement',
        description: 'Example for creating a commercial vehicle advertisement',
        value: {
          category: 'commercial_vehicle',
          data: {
            description:
              'Heavy duty truck for commercial use with valid permits',
            price: 1500000,
            location: 'Pune, Maharashtra',
            link: 'https://example.com/commercial-vehicle-details/heavy-duty-truck',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/3fa63fc6-d4a8-437a-89f1-c86dc3e55c62-image_1756892894323.jpeg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/4aa322a1-134c-4a58-87b7-ef53ad2d2783-image_1756892894685.jpeg',
            ],
          },
          commercial: {
            vehicleType: 'four_wheeler',
            manufacturerId: '507f1f77bcf86cd799439011',
            modelId: '507f1f77bcf86cd799439012',
            variantId: '507f1f77bcf86cd799439013',
            year: 2019,
            mileage: 80000,
            transmissionTypeId: '507f1f77bcf86cd799439014',
            fuelTypeId: '507f1f77bcf86cd799439015',
            color: 'Blue',
            isFirstOwner: false,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'GPS Tracking',
              'Air Brakes',
              'Fleet Management',
            ],
            commercialVehicleType: 'truck',
            bodyType: 'flatbed',
            payloadCapacity: 5000,
            payloadUnit: 'kg',
            axleCount: 2,
            hasFitness: true,
            hasPermit: true,
            seatingCapacity: 2,
          },
        },
      },
      two_wheeler: {
        summary: 'Two Wheeler Advertisement',
        description: 'Example for creating a two-wheeler advertisement',
        value: {
          category: 'two_wheeler',
          data: {
            description: 'Bike near chittar for sale, good condition',
            price: 45000,
            location: 'Chittar,Pathanmathitta',
            link: 'https://example.com/two-wheeler-details/chittar-bike',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/6137d10f-798b-41c0-9f89-2f2a09be7aa3-image_1757739698227.png',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/1d3be360-f296-4882-b490-449ed58a7dc7-image_1757739701656.png',
            ],
          },
          vehicle: {
            vehicleType: 'two_wheeler',
            manufacturerId: '68b5376e019b16f4fd2c1b1e',
            modelId: '68b54bac2e106cc77e5e7098',
            variantId: '68b54c96ac287cf92222d5fa',
            year: 2015,
            mileage: 20,
            transmissionTypeId: '68b53a421f3fb49e93b9ef59',
            fuelTypeId: '68b53a26933e8b3908eb5448',
            color: 'Black',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [],
          },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Advertisement created successfully',
    type: DetailedAdResponseDto,
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        title: 'Honda City 2020 (White)',
        description: 'Honda City 2020 Model - Single Owner',
        price: 850000,
        images: ['https://example.com/vehicle1.jpg'],
        location: 'Delhi, NCR',
        category: 'private_vehicle',
        isActive: true,
        status: 'active',
        postedAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        postedBy: '507f1f77bcf86cd799439021',
        user: {
          id: '507f1f77bcf86cd799439021',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+91-9876543210',
          profilePic: 'https://example.com/profile.jpg',
        },
        vehicleDetails: {
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
          additionalFeatures: ['Sunroof', 'Leather Seats'],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation error or missing required fields',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Description, price, and location are required for all ad types',
          'Vehicle data is required for vehicle advertisements',
          'Invalid manufacturer ID: 507f1f77bcf86cd799439999',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async create(
    @Body() dto: CreateAdV2Dto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: any,
  ): Promise<DetailedAdResponseDto> {
    try {
      if (!req.user?.id) {
        throw new BadRequestException('User ID not found in request');
      }

      const userId = req.user.id;
      const userType = req.user.userType || req.user.role || 'USER';

      console.log('Creating v2 advertisement for user:', userId);
      console.log('Advertisement category:', dto.category);
      console.log('Idempotency key:', idempotencyKey);

      const result = await this.createAdUc.exec({
        dto,
        userId,
        userType,
        idempotencyKey,
      });

      console.log(
        'v2 Advertisement created successfully with ID:',
        (result as any).id,
      );
      return result as DetailedAdResponseDto;
    } catch (error) {
      console.error('Error creating v2 advertisement:', error);
      throw error;
    }
  }

  @Post('list')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get advertisements with enhanced filtering and search (v2)',
    description: `
      Retrieve advertisements with comprehensive filtering and search capabilities.
      
      **Features:**
      - Basic category filtering (property, private_vehicle, commercial_vehicle, two_wheeler)
      - Enhanced text search across:
        - Ad title and description (all categories)
        - Vehicle manufacturer names (Honda, Toyota, etc.)
        - Vehicle model names (Civic, Camry, etc.)
        - Vehicle variant names (LX, EX, etc.)
        - Fuel type names (Petrol, Diesel, Electric, etc.)
        - Transmission type names (Manual, Automatic, CVT, etc.)
        - Property types (apartment, house, villa, etc.)
        - Property amenities (parking, garden, furnished, etc.)
      - Location filtering (text-based and geographic coordinates)
      - Intelligent location filtering with automatic distance fallback (state-based with 50km→1000km expansion)
      - Price range filtering (minPrice, maxPrice - both optional)
      - Two-wheeler specific filtering:
        - Fuel type IDs (fuelTypeIds) - filter by specific fuel types
        - Transmission type IDs (transmissionTypeIds) - filter by specific transmission types
      - Pagination and sorting
      - All filters are optional
      
      **Authentication:**
      - **Optional**: No authentication required (public endpoint)
      - **With Bearer Token**: If you provide a valid JWT token in Authorization header, the response will include your favorite status (isFavorite field)
      - **Without Token**: All ads will show isFavorite: false
      
      **Location-based Filtering:**
      - **Text-based**: Use 'location' field for partial text matching (e.g., "Mumbai", "Kerala")
      - **Intelligent geographic**: Use 'latitude' and 'longitude' for smart location filtering
      - **State-based logic**: If coordinates fall within a known state, shows ALL ads in that state
      - **Automatic distance fallback**: If no results found, automatically expands search radius (50km → 100km → 200km → 500km → 1000km)
      - **Final fallback**: If still no results, removes location filtering entirely
      - **Distance prioritization**: Within the same state, closer ads appear first
      - **Distance calculation**: Uses Manhattan distance approximation for compatibility
      - **Response includes**: latitude, longitude coordinates and distance for each ad
      
      **Response includes:**
      - Advertisement details with geographic coordinates (latitude, longitude)
      - User information
      - Detailed vehicle information with manufacturer, model, fuel, transmission details
      - Property details (for property ads)
      - Commercial vehicle details (for commercial vehicle ads)
      - Favorite status for authenticated users (isFavorite field)
      - Pagination metadata
    `,
  })
  @ApiHeader({
    name: 'Authorization',
    description:
      'Optional JWT Bearer token for personalized favorites. Format: "Bearer <token>". If provided, isFavorite field will show your personal favorites.',
    required: false,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Advertisement listing filters',
    type: ListAdsV2Dto,
    examples: {
      basic: {
        summary: 'Basic listing (no auth)',
        description:
          'Get all ads with pagination - no authentication required. All isFavorite will be false.',
        value: {
          search: 'honda',
          minPrice: 10000,
          maxPrice: 1000000,
          latitude: 19.076,
          longitude: 72.8777,
          page: 1,
          limit: 20,
        },
      },
      authenticated: {
        summary: 'Authenticated listing',
        description:
          'Get ads with personal favorites. Include Authorization header with Bearer token to see your favorites.',
        value: {
          search: 'honda',
          minPrice: 10000,
          maxPrice: 1000000,
          latitude: 19.076,
          longitude: 72.8777,
          page: 1,
          limit: 20,
        },
      },
      property: {
        summary: 'Property ads',
        description: 'Get property ads in Mumbai with location-based filtering',
        value: {
          search: 'apartment',
          category: 'property',
          location: 'Mumbai',
          latitude: 19.076,
          longitude: 72.8777,
          minPrice: 100000,
          maxPrice: 5000000,
          minBedrooms: 2,
          maxBedrooms: 4,
          isFurnished: true,
          hasParking: true,
          page: 1,
          limit: 10,
        },
      },
      vehicle: {
        summary: 'Vehicle ads',
        description: 'Get vehicle ads with location-based filtering',
        value: {
          search: 'toyota',
          category: 'private_vehicle',
          latitude: 19.076,
          longitude: 72.8777,
          minPrice: 50000,
          maxPrice: 5000000,
          page: 1,
          limit: 20,
        },
      },
      two_wheeler: {
        summary: 'Two-wheeler ads',
        description:
          'Get two-wheeler ads with location-based and specific filters',
        value: {
          search: 'honda',
          category: 'two_wheeler',
          latitude: 9.3311,
          longitude: 76.9222,
          minPrice: 20000,
          maxPrice: 200000,
          fuelTypeIds: ['68b53a26933e8b3908eb5448', '68b53a26933e8b3908eb5449'],
          transmissionTypeIds: ['68b53a421f3fb49e93b9ef59'],
          manufacturerId: '68b53a26933e8b3908eb5448',
          minYear: 2020,
          maxYear: 2024,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Advertisements retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '507f1f77bcf86cd799439011' },
              title: { type: 'string', example: 'Beautiful 2BHK Apartment' },
              description: { type: 'string', example: 'Spacious apartment...' },
              price: { type: 'number', example: 5000000 },
              location: { type: 'string', example: 'Mumbai, Maharashtra' },
              latitude: { type: 'number', example: 19.076 },
              longitude: { type: 'number', example: 72.8777 },
              distance: {
                type: 'number',
                example: 2.5,
                description: 'Distance in kilometers from search location',
              },
              category: { type: 'string', example: 'property' },
              isActive: { type: 'boolean', example: true },
              status: { type: 'string', example: 'active' },
              postedAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              postedBy: { type: 'string', example: '507f1f77bcf86cd799439021' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  profilePic: { type: 'string' },
                },
              },
              propertyDetails: {
                type: 'object',
                description: 'Property-specific details (for property ads)',
                properties: {
                  propertyType: { type: 'string' },
                  bedrooms: { type: 'number' },
                  bathrooms: { type: 'number' },
                  areaSqft: { type: 'number' },
                  floor: { type: 'number' },
                  isFurnished: { type: 'boolean' },
                  hasParking: { type: 'boolean' },
                  hasGarden: { type: 'boolean' },
                  amenities: { type: 'array', items: { type: 'string' } },
                },
              },
              vehicleDetails: {
                type: 'object',
                description:
                  'Vehicle-specific details with manufacturer, model, fuel, and transmission info',
                properties: {
                  vehicleType: { type: 'string' },
                  year: { type: 'number' },
                  mileage: { type: 'number' },
                  color: { type: 'string' },
                  isFirstOwner: { type: 'boolean' },
                  hasInsurance: { type: 'boolean' },
                  hasRcBook: { type: 'boolean' },
                  additionalFeatures: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  manufacturer: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                  model: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                      vehicleType: { type: 'string' },
                      bodyType: { type: 'string' },
                    },
                  },
                  variant: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                      price: { type: 'number' },
                    },
                  },
                  fuelType: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                  transmissionType: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                },
              },
              commercialVehicleDetails: {
                type: 'object',
                description:
                  'Commercial vehicle-specific details with manufacturer, model, fuel, and transmission info',
                properties: {
                  commercialVehicleType: { type: 'string' },
                  bodyType: { type: 'string' },
                  year: { type: 'number' },
                  mileage: { type: 'number' },
                  payloadCapacity: { type: 'number' },
                  payloadUnit: { type: 'string' },
                  axleCount: { type: 'number' },
                  color: { type: 'string' },
                  hasInsurance: { type: 'boolean' },
                  hasFitness: { type: 'boolean' },
                  hasPermit: { type: 'boolean' },
                  seatingCapacity: { type: 'number' },
                  additionalFeatures: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  manufacturer: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                  model: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                      vehicleType: { type: 'string' },
                      bodyType: { type: 'string' },
                    },
                  },
                  variant: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                      price: { type: 'number' },
                    },
                  },
                  fuelType: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                  transmissionType: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                },
              },
              images: { type: 'array', items: { type: 'string' } },
              isFavorite: {
                type: 'boolean',
                description:
                  'Whether this ad is favorited by the current user. Always false for unauthenticated users.',
                example: false,
              },
            },
          },
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
  @ApiBadRequestResponse({
    description: 'Invalid request parameters',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async list(@Body() dto: ListAdsV2Dto, @Req() req: any) {
    try {
      // Get user ID from auth token if available
      const authHeader = req.headers.authorization;
      const userId = this.extractUserIdFromToken(authHeader);

      const result = await this.listAdsUc.exec(dto, userId || undefined);
      return result;
    } catch (error) {
      console.error('Error listing v2 advertisements:', error);
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get advertisement by ID with complete details and all relations (v2)',
    description: `
      Retrieve a single advertisement with comprehensive details including all relations.
      
      **Authentication:**
      - **Optional**: No authentication required (public endpoint)
      - **With Bearer Token**: If you provide a valid JWT token in Authorization header, the response will include your favorite status (isFavorite field) and chat relations
      - **Without Token**: All ads will show isFavorite: false and no chat relations
      
      **Features:**
      - Complete advertisement information
      - Enhanced user details (name, email, phone, profile picture, type)
      - Category-specific details (property, vehicle, commercial vehicle)
      - Vehicle inventory details (manufacturer, model, variant, transmission, fuel)
      - Chat relations (participants, last messages, chat count) - only for authenticated users
      - Engagement metrics (favorites count, view count, user's favorite status)
      - Ratings and reviews (when available)
      - View count tracking (increments on each request)
      
      **Response includes:**
      - Advertisement details
      - User information with enhanced profile data
      - Property details (for property ads)
      - Vehicle details with inventory information (for vehicle ads)
      - Commercial vehicle details (for commercial vehicle ads)
      - Related chat rooms and messages (authenticated users only)
      - Favorites and engagement metrics
      - View count and analytics data
    `,
  })
  @ApiHeader({
    name: 'Authorization',
    description:
      'Optional JWT Bearer token for personalized favorites and chat relations. Format: "Bearer <token>". If provided, isFavorite field will show your personal favorites.',
    required: false,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'Advertisement retrieved successfully with all relations',
    type: DetailedAdResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid advertisement ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Advertisement not found',
  })
  async getById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<DetailedAdResponseDto> {
    try {
      // Get user ID from auth token if available
      const authHeader = req.headers.authorization;
      const userId = this.extractUserIdFromToken(authHeader);

      const result = await this.getAdByIdUc.exec({
        adId: id,
        userId: userId || undefined,
      });
      return result;
    } catch (error) {
      console.error('Error getting v2 advertisement by ID:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }
}
