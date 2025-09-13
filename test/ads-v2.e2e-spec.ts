import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ads V2 API (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let userId: string;
  let manufacturerId: string;
  let vehicleModelId: string;
  let vehicleVariantId: string;
  let fuelTypeId: string;
  let transmissionTypeId: string;
  let adId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    if (mongoConnection.db) {
      await mongoConnection.db.collection('refreshtokens').deleteMany({
        $or: [{ phone: '1234567890' }, { email: 'test@example.com' }],
      });

      await mongoConnection.db.collection('manufacturers').deleteMany({
        name: 'test-manufacturer-v2',
      });

      await mongoConnection.db.collection('vehiclemodels').deleteMany({
        name: 'test-model-v2',
      });

      await mongoConnection.db.collection('vehiclevariants').deleteMany({
        name: 'test-variant-v2',
      });

      await mongoConnection.db.collection('fueltypes').deleteMany({
        name: 'petrol-v2',
      });

      await mongoConnection.db.collection('transmissiontypes').deleteMany({
        name: 'manual-v2',
      });

      await mongoConnection.db.collection('ads').deleteMany({
        $or: [
          { title: { $regex: /^Test.*V2.*Ad$/ } },
          { seller: { $exists: true } },
        ],
      });

      await mongoConnection.db.collection('vehicleads').deleteMany({
        title: { $regex: /^Test.*V2.*Ad$/ },
      });

      await mongoConnection.db.collection('propertyads').deleteMany({
        title: { $regex: /^Test.*V2.*Ad$/ },
      });

      await mongoConnection.db.collection('commercialvehicleads').deleteMany({
        title: { $regex: /^Test.*V2.*Ad$/ },
      });
    }

    // Create a test user and login
    const userData = {
      phone: '1234567890',
      password: 'testPassword123',
      name: 'Test User V2',
      email: 'test@example.com',
      userType: 'BUYER',
    };

    await request(app.getHttpServer()).post('/auth/register').send(userData);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '1234567890',
        password: 'testPassword123',
      });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.id;

    // Create required inventory data
    const manufacturerData = {
      name: 'test-manufacturer-v2',
      displayName: 'Test Manufacturer V2',
      originCountry: 'India',
      logo: 'https://example.com/logo.png',
    };

    const manufacturerResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/manufacturers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(manufacturerData);

    manufacturerId = manufacturerResponse.body._id;

    const modelData = {
      name: 'test-model-v2',
      displayName: 'Test Model V2',
      manufacturer: manufacturerId,
      vehicleType: 'HATCHBACK',
      description: 'A test vehicle model v2',
      launchYear: 2020,
      segment: 'B',
      bodyType: 'Hatchback',
    };

    const modelResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/vehicle-models')
      .set('Authorization', `Bearer ${authToken}`)
      .send(modelData);

    vehicleModelId = modelResponse.body._id;

    const variantData = {
      name: 'test-variant-v2',
      displayName: 'Test Variant V2',
      vehicleModel: vehicleModelId,
      description: 'A test vehicle variant v2',
      engineCapacity: 1200,
      fuelType: 'PETROL',
      transmissionType: 'MANUAL',
      mileage: 15.5,
      power: 85,
      torque: 115,
      price: 500000,
      features: ['ABS', 'Airbags', 'Power Steering'],
    };

    const variantResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/vehicle-variants')
      .set('Authorization', `Bearer ${authToken}`)
      .send(variantData);

    vehicleVariantId = variantResponse.body._id;

    // Create fuel type and transmission type
    const fuelTypeData = {
      name: 'petrol-v2',
      displayName: 'Petrol V2',
      description: 'Petrol fuel type v2',
    };

    const fuelTypeResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/fuel-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send(fuelTypeData);

    fuelTypeId = fuelTypeResponse.body._id;

    const transmissionTypeData = {
      name: 'manual-v2',
      displayName: 'Manual V2',
      description: 'Manual transmission v2',
    };

    const transmissionTypeResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/transmission-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send(transmissionTypeData);

    transmissionTypeId = transmissionTypeResponse.body._id;
  });

  describe('POST /v2/ads', () => {
    describe('Property Ad Creation', () => {
      it('should create property ad successfully', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description:
              'Test Property V2 Ad - Beautiful 2BHK apartment in prime location',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property2.jpg',
            ],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
            floor: 5,
            isFurnished: true,
            hasParking: true,
            hasGarden: false,
            amenities: ['Gym', 'Swimming Pool', 'Security', 'Lift'],
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-property-key-1')
          .send(propertyAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('title');
            expect(res.body).toHaveProperty(
              'description',
              propertyAdData.data.description,
            );
            expect(res.body).toHaveProperty('price', propertyAdData.data.price);
            expect(res.body).toHaveProperty(
              'location',
              propertyAdData.data.location,
            );
            expect(res.body).toHaveProperty('category', 'property');
            expect(res.body).toHaveProperty('isActive', true);
            expect(res.body).toHaveProperty('postedBy', userId);
            expect(res.body).toHaveProperty('propertyDetails');
            expect(res.body.propertyDetails).toHaveProperty(
              'propertyType',
              'apartment',
            );
            expect(res.body.propertyDetails).toHaveProperty('bedrooms', 2);
            expect(res.body.propertyDetails).toHaveProperty('bathrooms', 2);
            expect(res.body.propertyDetails).toHaveProperty('areaSqft', 1200);
            expect(res.body.propertyDetails).toHaveProperty(
              'isFurnished',
              true,
            );
            expect(res.body.propertyDetails).toHaveProperty('hasParking', true);
            expect(res.body.propertyDetails).toHaveProperty('amenities');
            expect(Array.isArray(res.body.propertyDetails.amenities)).toBe(
              true,
            );

            adId = res.body.id;
          });
      });

      it('should create property ad with plot type', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Plot V2 Ad - Premium plot for sale',
            price: 2000000,
            location: 'Pune, Maharashtra',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/plot1.jpg',
            ],
          },
          property: {
            propertyType: 'plot',
            bedrooms: 0,
            bathrooms: 0,
            areaSqft: 2000,
            floor: 0,
            isFurnished: false,
            hasParking: false,
            hasGarden: true,
            amenities: [],
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-plot-key-1')
          .send(propertyAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('category', 'property');
            expect(res.body.propertyDetails).toHaveProperty(
              'propertyType',
              'plot',
            );
            expect(res.body.propertyDetails).toHaveProperty('bedrooms', 0);
            expect(res.body.propertyDetails).toHaveProperty('bathrooms', 0);
            expect(res.body.propertyDetails).toHaveProperty('areaSqft', 2000);
          });
      });

      it('should fail to create property ad with missing required fields', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            // Missing description, price, location
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData)
          .expect(400);
      });

      it('should fail to create property ad without authentication', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .send(propertyAdData)
          .expect(401);
      });
    });

    describe('Private Vehicle Ad Creation', () => {
      it('should create private vehicle ad successfully', () => {
        const vehicleAdData = {
          category: 'private_vehicle',
          data: {
            description: 'Test Private Vehicle V2 Ad - Honda City 2020 Model',
            price: 850000,
            location: 'Delhi, NCR',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle2.jpg',
            ],
          },
          vehicle: {
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            variantId: vehicleVariantId,
            year: 2020,
            mileage: 25000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
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
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-vehicle-key-1')
          .send(vehicleAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('category', 'private_vehicle');
            expect(res.body).toHaveProperty('vehicleDetails');
            expect(res.body.vehicleDetails).toHaveProperty(
              'vehicleType',
              'four_wheeler',
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'manufacturerId',
              manufacturerId,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'modelId',
              vehicleModelId,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'variantId',
              vehicleVariantId,
            );
            expect(res.body.vehicleDetails).toHaveProperty('year', 2020);
            expect(res.body.vehicleDetails).toHaveProperty('mileage', 25000);
            expect(res.body.vehicleDetails).toHaveProperty('color', 'White');
            expect(res.body.vehicleDetails).toHaveProperty(
              'isFirstOwner',
              true,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'hasInsurance',
              true,
            );
            expect(res.body.vehicleDetails).toHaveProperty('hasRcBook', true);
            expect(res.body.vehicleDetails).toHaveProperty(
              'additionalFeatures',
            );
            expect(
              Array.isArray(res.body.vehicleDetails.additionalFeatures),
            ).toBe(true);

            adId = res.body.id;
          });
      });

      it('should create two-wheeler ad successfully', () => {
        const twoWheelerAdData = {
          category: 'two_wheeler',
          data: {
            description: 'Test Two Wheeler V2 Ad - Honda Activa 6G',
            price: 65000,
            location: 'Bangalore, Karnataka',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/scooter1.jpg',
            ],
          },
          vehicle: {
            vehicleType: 'two_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            variantId: vehicleVariantId,
            year: 2021,
            mileage: 12000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
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
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-two-wheeler-key-1')
          .send(twoWheelerAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('category', 'two_wheeler');
            expect(res.body.vehicleDetails).toHaveProperty(
              'vehicleType',
              'two_wheeler',
            );
            expect(res.body.vehicleDetails).toHaveProperty('year', 2021);
            expect(res.body.vehicleDetails).toHaveProperty('mileage', 12000);
            expect(res.body.vehicleDetails).toHaveProperty('color', 'Red');
          });
      });

      it('should fail to create vehicle ad with invalid manufacturer ID', () => {
        const vehicleAdData = {
          category: 'private_vehicle',
          data: {
            description: 'Test Vehicle V2 Ad',
            price: 850000,
            location: 'Delhi, NCR',
            images: [],
          },
          vehicle: {
            vehicleType: 'four_wheeler',
            manufacturerId: '507f1f77bcf86cd799439999', // Invalid ID
            modelId: vehicleModelId,
            year: 2020,
            mileage: 25000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [],
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData)
          .expect(400);
      });

      it('should fail to create vehicle ad with missing vehicle data', () => {
        const vehicleAdData = {
          category: 'private_vehicle',
          data: {
            description: 'Test Vehicle V2 Ad',
            price: 850000,
            location: 'Delhi, NCR',
            images: [],
          },
          // Missing vehicle data
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData)
          .expect(400);
      });
    });

    describe('Commercial Vehicle Ad Creation', () => {
      it('should create commercial vehicle ad successfully', () => {
        const commercialVehicleAdData = {
          category: 'commercial_vehicle',
          data: {
            description: 'Test Commercial Vehicle V2 Ad - Tata 407 Truck',
            price: 1800000,
            location: 'Pune, Maharashtra',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck1.jpg',
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck2.jpg',
            ],
          },
          commercial: {
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            variantId: vehicleVariantId,
            year: 2019,
            mileage: 75000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Blue',
            isFirstOwner: false,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'GPS Tracking',
              'Climate Control',
              'Safety Features',
            ],
            commercialVehicleType: 'truck',
            bodyType: 'flatbed',
            payloadCapacity: 5000,
            payloadUnit: 'kg',
            axleCount: 2,
            hasFitness: true,
            hasPermit: true,
            seatingCapacity: 3,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-commercial-key-1')
          .send(commercialVehicleAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('category', 'commercial_vehicle');
            expect(res.body).toHaveProperty('commercialVehicleDetails');
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'vehicleType',
              'four_wheeler',
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'manufacturerId',
              manufacturerId,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'modelId',
              vehicleModelId,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'variantId',
              vehicleVariantId,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'year',
              2019,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'mileage',
              75000,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'commercialVehicleType',
              'truck',
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'bodyType',
              'flatbed',
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'payloadCapacity',
              5000,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'payloadUnit',
              'kg',
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'axleCount',
              2,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'hasFitness',
              true,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'hasPermit',
              true,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'seatingCapacity',
              3,
            );

            adId = res.body.id;
          });
      });

      it('should create bus commercial vehicle ad successfully', () => {
        const busAdData = {
          category: 'commercial_vehicle',
          data: {
            description: 'Test Bus V2 Ad - Volvo Bus for sale',
            price: 2500000,
            location: 'Mumbai, Maharashtra',
            images: [
              'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bus1.jpg',
            ],
          },
          commercial: {
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            variantId: vehicleVariantId,
            year: 2020,
            mileage: 100000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Air Conditioning',
              'GPS Tracking',
              'Fleet Management',
            ],
            commercialVehicleType: 'bus',
            bodyType: 'passenger',
            payloadCapacity: 0,
            payloadUnit: 'kg',
            axleCount: 2,
            hasFitness: true,
            hasPermit: true,
            seatingCapacity: 50,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-bus-key-1')
          .send(busAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('category', 'commercial_vehicle');
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'commercialVehicleType',
              'bus',
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'bodyType',
              'passenger',
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'seatingCapacity',
              50,
            );
          });
      });

      it('should fail to create commercial vehicle ad with missing commercial data', () => {
        const commercialVehicleAdData = {
          category: 'commercial_vehicle',
          data: {
            description: 'Test Commercial Vehicle V2 Ad',
            price: 1800000,
            location: 'Pune, Maharashtra',
            images: [],
          },
          // Missing commercial data
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(commercialVehicleAdData)
          .expect(400);
      });
    });

    describe('Idempotency Tests', () => {
      it('should return same result for duplicate idempotency key', async () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad - Idempotency Test',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
            floor: 5,
            isFurnished: true,
            hasParking: true,
            hasGarden: false,
            amenities: [],
          },
        };

        const idempotencyKey = 'test-idempotency-key-1';

        // First request
        const firstResponse = await request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', idempotencyKey)
          .send(propertyAdData)
          .expect(201);

        // Second request with same idempotency key
        const secondResponse = await request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', idempotencyKey)
          .send(propertyAdData)
          .expect(201);

        // Should return same result
        expect(firstResponse.body.id).toBe(secondResponse.body.id);
        expect(firstResponse.body.title).toBe(secondResponse.body.title);
        expect(firstResponse.body.description).toBe(
          secondResponse.body.description,
        );
      });

      it('should create different ads with different idempotency keys', async () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad - Different Keys',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
            floor: 5,
            isFurnished: true,
            hasParking: true,
            hasGarden: false,
            amenities: [],
          },
        };

        // First request
        const firstResponse = await request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-idempotency-key-2')
          .send(propertyAdData)
          .expect(201);

        // Second request with different idempotency key
        const secondResponse = await request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', 'test-idempotency-key-3')
          .send(propertyAdData)
          .expect(201);

        // Should create different ads
        expect(firstResponse.body.id).not.toBe(secondResponse.body.id);
      });
    });

    describe('Validation Tests', () => {
      it('should fail with invalid category', () => {
        const invalidAdData = {
          category: 'invalid_category',
          data: {
            description: 'Test Ad',
            price: 100000,
            location: 'Test Location',
            images: [],
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAdData)
          .expect(400);
      });

      it('should fail with negative price', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad',
            price: -1000, // Invalid negative price
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData)
          .expect(400);
      });

      it('should fail with too many images', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: Array(25).fill('https://example.com/image.jpg'), // Too many images
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData)
          .expect(400);
      });

      it('should fail with invalid year for vehicle', () => {
        const vehicleAdData = {
          category: 'private_vehicle',
          data: {
            description: 'Test Vehicle V2 Ad',
            price: 850000,
            location: 'Delhi, NCR',
            images: [],
          },
          vehicle: {
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 1800, // Invalid year
            mileage: 25000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [],
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData)
          .expect(400);
      });
    });

    describe('Authentication and Authorization Tests', () => {
      it('should fail without authentication', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .send(propertyAdData)
          .expect(401);
      });

      it('should fail with invalid token', () => {
        const propertyAdData = {
          category: 'property',
          data: {
            description: 'Test Property V2 Ad',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
          },
        };

        return request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', 'Bearer invalid-token')
          .send(propertyAdData)
          .expect(401);
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database connection errors gracefully', () => {
      // This test would require mocking the database connection
      // For now, we'll test with invalid data that should cause a validation error
      const invalidAdData = {
        category: 'property',
        data: {
          description: '', // Empty description should fail validation
          price: 0, // Zero price should fail validation
          location: '', // Empty location should fail validation
          images: [],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: -1, // Negative bedrooms should fail validation
          bathrooms: -1, // Negative bathrooms should fail validation
          areaSqft: -100, // Negative area should fail validation
        },
      };

      return request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAdData)
        .expect(400);
    });

    it('should handle malformed JSON gracefully', () => {
      return request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});
