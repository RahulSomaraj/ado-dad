import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ads API (e2e)', () => {
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
    // Clear test data before each test - ONLY test data
    if (mongoConnection.db) {
      // Only delete data created by tests (with test-specific identifiers)
      await mongoConnection.db.collection('refreshtokens').deleteMany({
        $or: [{ phone: '1234567890' }, { email: 'test@example.com' }],
      });

      await mongoConnection.db.collection('manufacturers').deleteMany({
        name: 'test-manufacturer',
      });

      await mongoConnection.db.collection('vehiclemodels').deleteMany({
        name: 'test-model',
      });

      await mongoConnection.db.collection('vehiclevariants').deleteMany({
        name: 'test-variant',
      });

      await mongoConnection.db.collection('fueltypes').deleteMany({
        name: 'petrol',
      });

      await mongoConnection.db.collection('transmissiontypes').deleteMany({
        name: 'manual',
      });

      // Only delete ads created by test user
      await mongoConnection.db.collection('ads').deleteMany({
        $or: [
          { title: { $regex: /^Test.*Ad$/ } },
          { seller: { $exists: true } }, // This will be set to test user ID
        ],
      });

      await mongoConnection.db.collection('vehicleads').deleteMany({
        title: { $regex: /^Test.*Ad$/ },
      });

      await mongoConnection.db.collection('propertyads').deleteMany({
        title: { $regex: /^Test.*Ad$/ },
      });

      await mongoConnection.db.collection('commercialvehicleads').deleteMany({
        title: { $regex: /^Test.*Ad$/ },
      });
    }

    // Create a test user and login for authenticated tests
    const userData = {
      phone: '1234567890',
      password: 'testPassword123',
      name: 'Test User',
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
      name: 'test-manufacturer',
      displayName: 'Test Manufacturer',
      originCountry: 'India',
      logo: 'https://example.com/logo.png',
    };

    const manufacturerResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/manufacturers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(manufacturerData);

    manufacturerId = manufacturerResponse.body._id;

    const modelData = {
      name: 'test-model',
      displayName: 'Test Model',
      manufacturer: manufacturerId,
      vehicleType: 'HATCHBACK',
      description: 'A test vehicle model',
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
      name: 'test-variant',
      displayName: 'Test Variant',
      vehicleModel: vehicleModelId,
      description: 'A test vehicle variant',
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
      name: 'petrol',
      displayName: 'Petrol',
      description: 'Petrol fuel type',
    };

    const fuelTypeResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/fuel-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send(fuelTypeData);

    fuelTypeId = fuelTypeResponse.body._id;

    const transmissionTypeData = {
      name: 'manual',
      displayName: 'Manual',
      description: 'Manual transmission',
    };

    const transmissionTypeResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/transmission-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send(transmissionTypeData);

    transmissionTypeId = transmissionTypeResponse.body._id;
  });

  describe('Vehicle Ads API', () => {
    describe('POST /ads/vehicle', () => {
      it('should create vehicle ad successfully', () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        return request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('title', vehicleAdData.title);
            expect(res.body).toHaveProperty(
              'description',
              vehicleAdData.description,
            );
            expect(res.body).toHaveProperty('price', vehicleAdData.price);
            expect(res.body).toHaveProperty('location', vehicleAdData.location);
            expect(res.body).toHaveProperty('category', vehicleAdData.category);
            expect(res.body).toHaveProperty(
              'condition',
              vehicleAdData.condition,
            );
            expect(res.body).toHaveProperty('seller', userId);
            expect(res.body).toHaveProperty('vehicleDetails');
            expect(res.body.vehicleDetails).toHaveProperty(
              'vehicleType',
              vehicleAdData.vehicleType,
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
            expect(res.body.vehicleDetails).toHaveProperty(
              'year',
              vehicleAdData.year,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'mileage',
              vehicleAdData.mileage,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'transmissionTypeId',
              transmissionTypeId,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'fuelTypeId',
              fuelTypeId,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'color',
              vehicleAdData.color,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'isFirstOwner',
              vehicleAdData.isFirstOwner,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'hasInsurance',
              vehicleAdData.hasInsurance,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'hasRcBook',
              vehicleAdData.hasRcBook,
            );

            adId = res.body._id;
          });
      });

      it('should fail to create vehicle ad with invalid data', () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          // Missing required fields
        };

        return request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData)
          .expect(400);
      });

      it('should fail to create vehicle ad without authentication', () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
        };

        return request(app.getHttpServer())
          .post('/ads/vehicle')
          .send(vehicleAdData)
          .expect(401);
      });
    });

    describe('GET /ads/vehicle', () => {
      beforeEach(async () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        const response = await request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData);

        adId = response.body._id;
      });

      it('should get all vehicle ads successfully', () => {
        return request(app.getHttpServer())
          .get('/ads/vehicle')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('title');
            expect(res.body[0]).toHaveProperty('description');
            expect(res.body[0]).toHaveProperty('price');
            expect(res.body[0]).toHaveProperty('location');
            expect(res.body[0]).toHaveProperty('category');
            expect(res.body[0]).toHaveProperty('condition');
            expect(res.body[0]).toHaveProperty('seller');
            expect(res.body[0]).toHaveProperty('vehicleDetails');
          });
      });

      it('should filter vehicle ads by price range', () => {
        return request(app.getHttpServer())
          .get('/ads/vehicle?minPrice=400000&maxPrice=600000')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.price).toBeGreaterThanOrEqual(400000);
              expect(ad.price).toBeLessThanOrEqual(600000);
            });
          });
      });

      it('should filter vehicle ads by location', () => {
        return request(app.getHttpServer())
          .get('/ads/vehicle?location=Mumbai')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.location).toMatch(/Mumbai/i);
            });
          });
      });

      it('should filter vehicle ads by vehicle type', () => {
        return request(app.getHttpServer())
          .get('/ads/vehicle?vehicleType=four_wheeler')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.vehicleDetails.vehicleType).toBe('four_wheeler');
            });
          });
      });

      it('should filter vehicle ads by manufacturer', () => {
        return request(app.getHttpServer())
          .get(`/ads/vehicle?manufacturerId=${manufacturerId}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.vehicleDetails.manufacturerId).toBe(manufacturerId);
            });
          });
      });

      it('should search vehicle ads by title', () => {
        return request(app.getHttpServer())
          .get('/ads/vehicle?search=Test')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.title).toMatch(/Test/i);
            });
          });
      });
    });

    describe('GET /ads/vehicle/:id', () => {
      beforeEach(async () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        const response = await request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData);

        adId = response.body._id;
      });

      it('should get vehicle ad by ID successfully', () => {
        return request(app.getHttpServer())
          .get(`/ads/vehicle/${adId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id', adId);
            expect(res.body).toHaveProperty('title', 'Test Vehicle Ad');
            expect(res.body).toHaveProperty(
              'description',
              'A test vehicle advertisement',
            );
            expect(res.body).toHaveProperty('price', 500000);
            expect(res.body).toHaveProperty('location', 'Mumbai, Maharashtra');
            expect(res.body).toHaveProperty('category', 'VEHICLE');
            expect(res.body).toHaveProperty('condition', 'USED');
            expect(res.body).toHaveProperty('seller', userId);
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
            expect(res.body.vehicleDetails).toHaveProperty('mileage', 15000);
            expect(res.body.vehicleDetails).toHaveProperty(
              'transmissionTypeId',
              transmissionTypeId,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'fuelTypeId',
              fuelTypeId,
            );
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
          });
      });

      it('should fail to get vehicle ad with invalid ID', () => {
        return request(app.getHttpServer())
          .get('/ads/vehicle/invalid-id')
          .expect(400);
      });

      it('should fail to get non-existent vehicle ad', () => {
        const fakeId = '507f1f77bcf86cd799439011';
        return request(app.getHttpServer())
          .get(`/ads/vehicle/${fakeId}`)
          .expect(404);
      });
    });

    describe('PUT /ads/vehicle/:id', () => {
      beforeEach(async () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        const response = await request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData);

        adId = response.body._id;
      });

      it('should update vehicle ad successfully', () => {
        const updateData = {
          title: 'Updated Test Vehicle Ad',
          description: 'Updated test vehicle advertisement',
          price: 550000,
          location: 'Pune, Maharashtra',
          color: 'Black',
          isFirstOwner: false,
          additionalFeatures: 'ABS, Airbags, Power Steering, Sunroof',
        };

        return request(app.getHttpServer())
          .put(`/ads/vehicle/${adId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id', adId);
            expect(res.body).toHaveProperty('title', updateData.title);
            expect(res.body).toHaveProperty(
              'description',
              updateData.description,
            );
            expect(res.body).toHaveProperty('price', updateData.price);
            expect(res.body).toHaveProperty('location', updateData.location);
            expect(res.body.vehicleDetails).toHaveProperty(
              'color',
              updateData.color,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'isFirstOwner',
              updateData.isFirstOwner,
            );
            expect(res.body.vehicleDetails).toHaveProperty(
              'additionalFeatures',
              updateData.additionalFeatures,
            );
          });
      });

      it('should fail to update vehicle ad with invalid data', () => {
        const updateData = {
          price: -1000, // Invalid negative price
        };

        return request(app.getHttpServer())
          .put(`/ads/vehicle/${adId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(400);
      });

      it('should fail to update vehicle ad without authentication', () => {
        const updateData = {
          title: 'Updated Test Vehicle Ad',
        };

        return request(app.getHttpServer())
          .put(`/ads/vehicle/${adId}`)
          .send(updateData)
          .expect(401);
      });
    });
  });

  describe('Property Ads API', () => {
    describe('POST /ads/property', () => {
      it('should create property ad successfully', () => {
        const propertyAdData = {
          title: 'Test Property Ad',
          description: 'A test property advertisement',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          category: 'PROPERTY',
          condition: 'NEW',
          propertyType: 'APARTMENT',
          area: 1200,
          areaUnit: 'sqft',
          bedrooms: 2,
          bathrooms: 2,
          parking: 1,
          floor: 5,
          totalFloors: 15,
          furnished: 'SEMI_FURNISHED',
          amenities: ['Gym', 'Swimming Pool', 'Garden'],
          address: '123 Test Street, Test Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        };

        return request(app.getHttpServer())
          .post('/ads/property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('title', propertyAdData.title);
            expect(res.body).toHaveProperty(
              'description',
              propertyAdData.description,
            );
            expect(res.body).toHaveProperty('price', propertyAdData.price);
            expect(res.body).toHaveProperty(
              'location',
              propertyAdData.location,
            );
            expect(res.body).toHaveProperty(
              'category',
              propertyAdData.category,
            );
            expect(res.body).toHaveProperty(
              'condition',
              propertyAdData.condition,
            );
            expect(res.body).toHaveProperty('seller', userId);
            expect(res.body).toHaveProperty('propertyDetails');
            expect(res.body.propertyDetails).toHaveProperty(
              'propertyType',
              propertyAdData.propertyType,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'area',
              propertyAdData.area,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'areaUnit',
              propertyAdData.areaUnit,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'bedrooms',
              propertyAdData.bedrooms,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'bathrooms',
              propertyAdData.bathrooms,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'parking',
              propertyAdData.parking,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'floor',
              propertyAdData.floor,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'totalFloors',
              propertyAdData.totalFloors,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'furnished',
              propertyAdData.furnished,
            );
            expect(res.body.propertyDetails).toHaveProperty('amenities');
            expect(Array.isArray(res.body.propertyDetails.amenities)).toBe(
              true,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'address',
              propertyAdData.address,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'city',
              propertyAdData.city,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'state',
              propertyAdData.state,
            );
            expect(res.body.propertyDetails).toHaveProperty(
              'pincode',
              propertyAdData.pincode,
            );

            adId = res.body._id;
          });
      });

      it('should fail to create property ad with invalid data', () => {
        const propertyAdData = {
          title: 'Test Property Ad',
          // Missing required fields
        };

        return request(app.getHttpServer())
          .post('/ads/property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData)
          .expect(400);
      });
    });

    describe('GET /ads/property', () => {
      beforeEach(async () => {
        const propertyAdData = {
          title: 'Test Property Ad',
          description: 'A test property advertisement',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          category: 'PROPERTY',
          condition: 'NEW',
          propertyType: 'APARTMENT',
          area: 1200,
          areaUnit: 'sqft',
          bedrooms: 2,
          bathrooms: 2,
          parking: 1,
          floor: 5,
          totalFloors: 15,
          furnished: 'SEMI_FURNISHED',
          amenities: ['Gym', 'Swimming Pool', 'Garden'],
          address: '123 Test Street, Test Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        };

        const response = await request(app.getHttpServer())
          .post('/ads/property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData);

        adId = response.body._id;
      });

      it('should get all property ads successfully', () => {
        return request(app.getHttpServer())
          .get('/ads/property')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('title');
            expect(res.body[0]).toHaveProperty('description');
            expect(res.body[0]).toHaveProperty('price');
            expect(res.body[0]).toHaveProperty('location');
            expect(res.body[0]).toHaveProperty('category');
            expect(res.body[0]).toHaveProperty('condition');
            expect(res.body[0]).toHaveProperty('seller');
            expect(res.body[0]).toHaveProperty('propertyDetails');
          });
      });

      it('should filter property ads by price range', () => {
        return request(app.getHttpServer())
          .get('/ads/property?minPrice=4000000&maxPrice=6000000')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.price).toBeGreaterThanOrEqual(4000000);
              expect(ad.price).toBeLessThanOrEqual(6000000);
            });
          });
      });

      it('should filter property ads by property type', () => {
        return request(app.getHttpServer())
          .get('/ads/property?propertyType=APARTMENT')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.propertyDetails.propertyType).toBe('APARTMENT');
            });
          });
      });

      it('should filter property ads by bedrooms', () => {
        return request(app.getHttpServer())
          .get('/ads/property?bedrooms=2')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.propertyDetails.bedrooms).toBe(2);
            });
          });
      });
    });
  });

  describe('Commercial Vehicle Ads API', () => {
    describe('POST /ads/commercial-vehicle', () => {
      it('should create commercial vehicle ad successfully', () => {
        const commercialVehicleAdData = {
          title: 'Test Commercial Vehicle Ad',
          description: 'A test commercial vehicle advertisement',
          price: 1500000,
          location: 'Mumbai, Maharashtra',
          category: 'COMMERCIAL_VEHICLE',
          condition: 'USED',
          vehicleType: 'truck',
          bodyType: 'flatbed',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2018,
          mileage: 50000,
          payloadCapacity: 5000,
          payloadUnit: 'kg',
          axleCount: 2,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          hasInsurance: true,
          hasFitness: true,
          hasPermit: true,
          seatingCapacity: 3,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        return request(app.getHttpServer())
          .post('/ads/commercial-vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(commercialVehicleAdData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty(
              'title',
              commercialVehicleAdData.title,
            );
            expect(res.body).toHaveProperty(
              'description',
              commercialVehicleAdData.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              commercialVehicleAdData.price,
            );
            expect(res.body).toHaveProperty(
              'location',
              commercialVehicleAdData.location,
            );
            expect(res.body).toHaveProperty(
              'category',
              commercialVehicleAdData.category,
            );
            expect(res.body).toHaveProperty(
              'condition',
              commercialVehicleAdData.condition,
            );
            expect(res.body).toHaveProperty('seller', userId);
            expect(res.body).toHaveProperty('commercialVehicleDetails');
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'vehicleType',
              commercialVehicleAdData.vehicleType,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'bodyType',
              commercialVehicleAdData.bodyType,
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
              commercialVehicleAdData.year,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'mileage',
              commercialVehicleAdData.mileage,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'payloadCapacity',
              commercialVehicleAdData.payloadCapacity,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'payloadUnit',
              commercialVehicleAdData.payloadUnit,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'axleCount',
              commercialVehicleAdData.axleCount,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'transmissionTypeId',
              transmissionTypeId,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'fuelTypeId',
              fuelTypeId,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'color',
              commercialVehicleAdData.color,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'hasInsurance',
              commercialVehicleAdData.hasInsurance,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'hasFitness',
              commercialVehicleAdData.hasFitness,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'hasPermit',
              commercialVehicleAdData.hasPermit,
            );
            expect(res.body.commercialVehicleDetails).toHaveProperty(
              'seatingCapacity',
              commercialVehicleAdData.seatingCapacity,
            );

            adId = res.body._id;
          });
      });

      it('should fail to create commercial vehicle ad with invalid data', () => {
        const commercialVehicleAdData = {
          title: 'Test Commercial Vehicle Ad',
          // Missing required fields
        };

        return request(app.getHttpServer())
          .post('/ads/commercial-vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(commercialVehicleAdData)
          .expect(400);
      });
    });

    describe('GET /ads/commercial-vehicle', () => {
      beforeEach(async () => {
        const commercialVehicleAdData = {
          title: 'Test Commercial Vehicle Ad',
          description: 'A test commercial vehicle advertisement',
          price: 1500000,
          location: 'Mumbai, Maharashtra',
          category: 'COMMERCIAL_VEHICLE',
          condition: 'USED',
          vehicleType: 'truck',
          bodyType: 'flatbed',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2018,
          mileage: 50000,
          payloadCapacity: 5000,
          payloadUnit: 'kg',
          axleCount: 2,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          hasInsurance: true,
          hasFitness: true,
          hasPermit: true,
          seatingCapacity: 3,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        const response = await request(app.getHttpServer())
          .post('/ads/commercial-vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(commercialVehicleAdData);

        adId = response.body._id;
      });

      it('should get all commercial vehicle ads successfully', () => {
        return request(app.getHttpServer())
          .get('/ads/commercial-vehicle')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('title');
            expect(res.body[0]).toHaveProperty('description');
            expect(res.body[0]).toHaveProperty('price');
            expect(res.body[0]).toHaveProperty('location');
            expect(res.body[0]).toHaveProperty('category');
            expect(res.body[0]).toHaveProperty('condition');
            expect(res.body[0]).toHaveProperty('seller');
            expect(res.body[0]).toHaveProperty('commercialVehicleDetails');
          });
      });

      it('should filter commercial vehicle ads by vehicle type', () => {
        return request(app.getHttpServer())
          .get('/ads/commercial-vehicle?vehicleType=truck')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.commercialVehicleDetails.vehicleType).toBe('truck');
            });
          });
      });

      it('should filter commercial vehicle ads by body type', () => {
        return request(app.getHttpServer())
          .get('/ads/commercial-vehicle?bodyType=flatbed')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.commercialVehicleDetails.bodyType).toBe('flatbed');
            });
          });
      });

      it('should filter commercial vehicle ads by payload capacity', () => {
        return request(app.getHttpServer())
          .get(
            '/ads/commercial-vehicle?minPayloadCapacity=4000&maxPayloadCapacity=6000',
          )
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(
                ad.commercialVehicleDetails.payloadCapacity,
              ).toBeGreaterThanOrEqual(4000);
              expect(
                ad.commercialVehicleDetails.payloadCapacity,
              ).toBeLessThanOrEqual(6000);
            });
          });
      });
    });
  });

  describe('General Ads API', () => {
    describe('GET /ads', () => {
      beforeEach(async () => {
        // Create different types of ads
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        await request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData);

        const propertyAdData = {
          title: 'Test Property Ad',
          description: 'A test property advertisement',
          price: 5000000,
          location: 'Mumbai, Maharashtra',
          category: 'PROPERTY',
          condition: 'NEW',
          propertyType: 'APARTMENT',
          area: 1200,
          areaUnit: 'sqft',
          bedrooms: 2,
          bathrooms: 2,
          parking: 1,
          floor: 5,
          totalFloors: 15,
          furnished: 'SEMI_FURNISHED',
          amenities: ['Gym', 'Swimming Pool', 'Garden'],
          address: '123 Test Street, Test Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        };

        await request(app.getHttpServer())
          .post('/ads/property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyAdData);
      });

      it('should get all ads successfully', () => {
        return request(app.getHttpServer())
          .get('/ads')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('title');
            expect(res.body[0]).toHaveProperty('description');
            expect(res.body[0]).toHaveProperty('price');
            expect(res.body[0]).toHaveProperty('location');
            expect(res.body[0]).toHaveProperty('category');
            expect(res.body[0]).toHaveProperty('condition');
            expect(res.body[0]).toHaveProperty('seller');
          });
      });

      it('should filter ads by category', () => {
        return request(app.getHttpServer())
          .get('/ads?category=VEHICLE')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.category).toBe('VEHICLE');
            });
          });
      });

      it('should filter ads by condition', () => {
        return request(app.getHttpServer())
          .get('/ads?condition=USED')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.condition).toBe('USED');
            });
          });
      });

      it('should search ads by title', () => {
        return request(app.getHttpServer())
          .get('/ads?search=Test')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((ad) => {
              expect(ad.title).toMatch(/Test/i);
            });
          });
      });

      it('should get ads with pagination', () => {
        return request(app.getHttpServer())
          .get('/ads?page=1&limit=10')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      });
    });

    describe('GET /ads/my-ads', () => {
      beforeEach(async () => {
        const vehicleAdData = {
          title: 'Test Vehicle Ad',
          description: 'A test vehicle advertisement',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          category: 'VEHICLE',
          condition: 'USED',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 15000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'White',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: 'ABS, Airbags, Power Steering',
        };

        await request(app.getHttpServer())
          .post('/ads/vehicle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicleAdData);
      });

      it("should get user's ads successfully", () => {
        return request(app.getHttpServer())
          .get('/ads/my-ads')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach((ad) => {
              expect(ad.seller).toBe(userId);
            });
          });
      });

      it("should fail to get user's ads without authentication", () => {
        return request(app.getHttpServer()).get('/ads/my-ads').expect(401);
      });
    });
  });
});
