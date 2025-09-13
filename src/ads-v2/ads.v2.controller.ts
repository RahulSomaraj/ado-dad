import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
  BadRequestException,
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
import { CreateAdUc } from './application/use-cases/create-ad.uc';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../auth/guard/roles.guards';
import { Roles } from '../auth/guard/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { DetailedAdResponseDto } from '../ads/dto/common/ad-response.dto';

@ApiTags('Ads v2')
@ApiBearerAuth()
@Controller('v2/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.USER, UserType.ADMIN, UserType.SUPER_ADMIN)
export class AdsV2Controller {
  constructor(private readonly createAdUc: CreateAdUc) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
}
