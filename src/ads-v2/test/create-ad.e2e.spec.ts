import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { Types } from 'mongoose';

// App modules
import { AppModule } from '../app.module';
import { AdsV2Module } from './ads.v2.module';

// Schemas
import { User, UserSchema } from '../users/schemas/user.schema';
import { Ad, AdSchema } from '../ads/schemas/ad.schema';
import {
  PropertyAd,
  PropertyAdSchema,
} from '../ads/schemas/property-ad.schema';
import { VehicleAd, VehicleAdSchema } from '../ads/schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdSchema,
} from '../ads/schemas/commercial-vehicle-ad.schema';

// DTOs
import { CreateAdV2Dto, AdCategoryV2 } from './dto/create-ad-v2.dto';

describe('Ads V2 - Create Advertisement (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(
          process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad-test',
        ),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Ad.name, schema: AdSchema },
          { name: PropertyAd.name, schema: PropertyAdSchema },
          { name: VehicleAd.name, schema: VehicleAdSchema },
          { name: CommercialVehicleAd.name, schema: CommercialVehicleAdSchema },
        ]),
        AdsV2Module,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: true,
      }),
    );

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test user and get auth token
    const testUser = {
      _id: new Types.ObjectId(),
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      userType: 'USER',
    };

    authToken = jwtService.sign({
      id: testUser._id.toString(),
      userType: testUser.userType,
    });
    userId = testUser._id.toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v2/ads - Property Advertisement', () => {
    it('should create property advertisement with valid data', async () => {
      const propertyAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Beautiful 2BHK Apartment in Prime Location',
          price: 8500000,
          location: 'Bandra West, Mumbai, Maharashtra',
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          areaSqft: 1200,
          floor: 8,
          isFurnished: true,
          hasParking: true,
          hasGarden: false,
          amenities: ['Gym', 'Swimming Pool', 'Security'],
        },
      };

      const response = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyAd)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.category).toBe('property');
      expect(response.body.description).toBe(
        'Beautiful 2BHK Apartment in Prime Location',
      );
      expect(response.body.price).toBe(8500000);
      expect(response.body.propertyDetails).toBeDefined();
      expect(response.body.propertyDetails.propertyType).toBe('apartment');
      expect(response.body.propertyDetails.bedrooms).toBe(2);
      expect(response.body.propertyDetails.bathrooms).toBe(2);
      expect(response.body.propertyDetails.areaSqft).toBe(1200);
    });

    it('should fail with missing property data', async () => {
      const invalidAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Beautiful 2BHK Apartment',
          price: 8500000,
          location: 'Mumbai, Maharashtra',
        },
        // Missing property data
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAd)
        .expect(400);
    });

    it('should fail with invalid property data', async () => {
      const invalidAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Beautiful 2BHK Apartment',
          price: -1000, // Invalid negative price
          location: 'Mumbai, Maharashtra',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: -1, // Invalid negative bedrooms
          bathrooms: 2,
          areaSqft: 1200,
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAd)
        .expect(400);
    });
  });

  describe('POST /v2/ads - Vehicle Advertisement', () => {
    it('should create vehicle advertisement with valid data', async () => {
      const vehicleAd: CreateAdV2Dto = {
        category: AdCategoryV2.PRIVATE_VEHICLE,
        data: {
          description: 'Honda City 2020 Model - Single Owner',
          price: 850000,
          location: 'Delhi, NCR',
          images: ['https://example.com/vehicle1.jpg'],
        },
        vehicle: {
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
      };

      const response = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleAd)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.category).toBe('private_vehicle');
      expect(response.body.vehicleDetails).toBeDefined();
      expect(response.body.vehicleDetails.manufacturerId).toBe(
        '507f1f77bcf86cd799439031',
      );
      expect(response.body.vehicleDetails.modelId).toBe(
        '507f1f77bcf86cd799439041',
      );
      expect(response.body.vehicleDetails.year).toBe(2020);
      expect(response.body.vehicleDetails.color).toBe('White');
    });

    it('should fail with missing vehicle data', async () => {
      const invalidAd: CreateAdV2Dto = {
        category: AdCategoryV2.PRIVATE_VEHICLE,
        data: {
          description: 'Honda City 2020',
          price: 850000,
          location: 'Delhi, NCR',
        },
        // Missing vehicle data
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAd)
        .expect(400);
    });
  });

  describe('POST /v2/ads - Commercial Vehicle Advertisement', () => {
    it('should create commercial vehicle advertisement with valid data', async () => {
      const commercialAd: CreateAdV2Dto = {
        category: AdCategoryV2.COMMERCIAL_VEHICLE,
        data: {
          description: 'Tata 407 Truck - Excellent Condition',
          price: 1800000,
          location: 'Pune, Maharashtra',
          images: ['https://example.com/truck1.jpg'],
        },
        commercial: {
          vehicleType: 'four_wheeler',
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
          additionalFeatures: ['GPS Tracking', 'Climate Control'],
          seatingCapacity: 3,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commercialAd)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.category).toBe('commercial_vehicle');
      expect(response.body.commercialVehicleDetails).toBeDefined();
      expect(response.body.commercialVehicleDetails.commercialVehicleType).toBe(
        'truck',
      );
      expect(response.body.commercialVehicleDetails.bodyType).toBe('flatbed');
      expect(response.body.commercialVehicleDetails.payloadCapacity).toBe(5000);
      expect(response.body.commercialVehicleDetails.axleCount).toBe(2);
    });

    it('should fail with missing commercial-specific fields', async () => {
      const invalidAd: CreateAdV2Dto = {
        category: AdCategoryV2.COMMERCIAL_VEHICLE,
        data: {
          description: 'Commercial Vehicle',
          price: 1800000,
          location: 'Pune, Maharashtra',
        },
        commercial: {
          vehicleType: 'four_wheeler',
          manufacturerId: '507f1f77bcf86cd799439034',
          modelId: '507f1f77bcf86cd799439044',
          year: 2019,
          mileage: 75000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439072',
          color: 'Blue',
          // Missing all commercial-specific fields
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAd)
        .expect(400);
    });
  });

  describe('POST /v2/ads - Idempotency', () => {
    it('should return same result for duplicate idempotency key', async () => {
      const idempotencyKey = 'test-idempotency-key-123';
      const propertyAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Idempotency Test Property',
          price: 5000000,
          location: 'Test Location',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(propertyAd)
        .expect(201);

      // Second request with same key
      const response2 = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(propertyAd)
        .expect(201);

      // Should return same result
      expect(response1.body.id).toBe(response2.body.id);
      expect(response1.body.description).toBe(response2.body.description);
    });
  });

  describe('POST /v2/ads - Authentication', () => {
    it('should require authentication', async () => {
      const propertyAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property',
          price: 5000000,
          location: 'Test Location',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .send(propertyAd)
        .expect(401);
    });

    it('should require valid JWT token', async () => {
      const propertyAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property',
          price: 5000000,
          location: 'Test Location',
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', 'Bearer invalid-token')
        .send(propertyAd)
        .expect(401);
    });
  });

  describe('POST /v2/ads - Validation', () => {
    it('should validate required fields', async () => {
      const invalidAd = {
        category: 'property',
        data: {
          // Missing description, price, location
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAd)
        .expect(400);
    });

    it('should validate image count limit', async () => {
      const tooManyImages = Array(25).fill('https://example.com/image.jpg');

      const propertyAd: CreateAdV2Dto = {
        category: AdCategoryV2.PROPERTY,
        data: {
          description: 'Test Property',
          price: 5000000,
          location: 'Test Location',
          images: tooManyImages,
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 800,
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyAd)
        .expect(400);
    });

    it('should validate year range', async () => {
      const vehicleAd: CreateAdV2Dto = {
        category: AdCategoryV2.PRIVATE_VEHICLE,
        data: {
          description: 'Test Vehicle',
          price: 500000,
          location: 'Test Location',
        },
        vehicle: {
          vehicleType: 'four_wheeler',
          manufacturerId: '507f1f77bcf86cd799439031',
          modelId: '507f1f77bcf86cd799439041',
          year: 1800, // Invalid year
          mileage: 10000,
          transmissionTypeId: '507f1f77bcf86cd799439061',
          fuelTypeId: '507f1f77bcf86cd799439071',
          color: 'White',
        },
      };

      await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleAd)
        .expect(400);
    });
  });
});
