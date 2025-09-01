import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ads API CRUD & Performance (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let userId: string;
  let manufacturerId: string;
  let vehicleModelId: string;
  let vehicleVariantId: string;
  let fuelTypeId: string;
  let transmissionTypeId: string;
  let createdAdId: string;

  // Performance tracking
  const performanceMetrics: {
    [key: string]: { startTime: number; endTime: number; duration: number }[];
  } = {};

  const trackPerformance = (operation: string, startTime: number) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!performanceMetrics[operation]) {
      performanceMetrics[operation] = [];
    }

    performanceMetrics[operation].push({ startTime, endTime, duration });
  };

  const getAveragePerformance = (operation: string): number => {
    const metrics = performanceMetrics[operation];
    if (!metrics || metrics.length === 0) return 0;

    const totalDuration = metrics.reduce(
      (sum, metric) => sum + metric.duration,
      0,
    );
    return totalDuration / metrics.length;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    // Log performance summary
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log('========================');
    Object.keys(performanceMetrics).forEach((operation) => {
      const avg = getAveragePerformance(operation);
      const count = performanceMetrics[operation].length;
      console.log(`${operation}: ${avg.toFixed(2)}ms avg (${count} tests)`);
    });

    await disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    if (mongoConnection.db) {
      await mongoConnection.db.collection('refreshtokens').deleteMany({});
      await mongoConnection.db.collection('manufacturers').deleteMany({});
      await mongoConnection.db.collection('vehiclemodels').deleteMany({});
      await mongoConnection.db.collection('vehiclevariants').deleteMany({});
      await mongoConnection.db.collection('fueltypes').deleteMany({});
      await mongoConnection.db.collection('transmissiontypes').deleteMany({});
      await mongoConnection.db.collection('ads').deleteMany({});
      await mongoConnection.db.collection('vehicleads').deleteMany({});
      await mongoConnection.db.collection('propertyads').deleteMany({});
      await mongoConnection.db
        .collection('commercialvehicleads')
        .deleteMany({});
    }

    // Create a test user and login for authenticated tests
    const userData = {
      phone: '1234567890',
      password: 'testPassword123',
      name: 'Test User',
      email: 'test@example.com',
      userType: 'BUYER',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData);

    // If registration fails (user might already exist), try to login directly
    let loginResponse;
    try {
      loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '1234567890',
          password: 'testPassword123',
        });
    } catch (error) {
      console.log('Login failed, using fallback authentication');
      // Use a fallback approach for testing
      authToken = 'test-token';
      userId = 'test-user-id';
      return;
    }

    authToken = loginResponse.body.access_token;
    userId = loginResponse.body.user?._id || 'test-user-id';

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

  describe('POST /ads/list - List Ads with Filtering', () => {
    it('should return empty list when no ads exist', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads/list')
        .send({})
        .expect(200);

      trackPerformance('POST /ads/list - empty', startTime);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total', 0);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
      expect(response.body).toHaveProperty('totalPages', 0);
      expect(response.body).toHaveProperty('hasNext', false);
      expect(response.body).toHaveProperty('hasPrev', false);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should list ads with basic filtering', async () => {
      // First create a test ad
      const adData = {
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
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(adData)
        .expect(201);

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'VEHICLE',
          page: 1,
          limit: 10,
        })
        .expect(200);

      trackPerformance('POST /ads/list - with filter', startTime);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify the ad data
      const ad = response.body.data[0];
      expect(ad).toHaveProperty('_id');
      expect(ad).toHaveProperty('title', adData.title);
      expect(ad).toHaveProperty('category', adData.category);
    });
  });

  describe('GET /ads/:id - Get Ad by ID', () => {
    beforeEach(async () => {
      // Create a test ad for ID-based tests
      const adData = {
        title: 'Test Vehicle Ad for ID',
        description: 'A test vehicle advertisement for ID testing',
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

      const createResponse = await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(adData)
        .expect(201);

      createdAdId = createResponse.body._id;
    });

    it('should get ad by ID successfully', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/ads/${createdAdId}`)
        .expect(200);

      trackPerformance('GET /ads/:id - success', startTime);

      expect(response.body).toHaveProperty('_id', createdAdId);
      expect(response.body).toHaveProperty('title', 'Test Vehicle Ad for ID');
      expect(response.body).toHaveProperty('category', 'VEHICLE');
      expect(response.body).toHaveProperty('price', 500000);
      expect(response.body).toHaveProperty('seller');
      expect(response.body).toHaveProperty('vehicleDetails');
    });

    it('should return 404 for non-existent ad ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/ads/${fakeId}`)
        .expect(404);

      trackPerformance('GET /ads/:id - not found', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ad ID format', async () => {
      const invalidId = 'invalid-id-format';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/ads/${invalidId}`)
        .expect(400);

      trackPerformance('GET /ads/:id - invalid format', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid ad ID');
    });
  });

  describe('POST /ads - Create Ad', () => {
    it('should create vehicle ad successfully', async () => {
      const adData = {
        title: 'New Test Vehicle Ad',
        description: 'A new test vehicle advertisement',
        price: 750000,
        location: 'Delhi, India',
        category: 'VEHICLE',
        condition: 'USED',
        vehicleType: 'four_wheeler',
        manufacturerId: manufacturerId,
        modelId: vehicleModelId,
        variantId: vehicleVariantId,
        year: 2021,
        mileage: 12000,
        transmissionTypeId: transmissionTypeId,
        fuelTypeId: fuelTypeId,
        color: 'Blue',
        isFirstOwner: true,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: 'ABS, Airbags, Power Steering, Sunroof',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(adData)
        .expect(201);

      trackPerformance('POST /ads - create vehicle', startTime);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('title', adData.title);
      expect(response.body).toHaveProperty('description', adData.description);
      expect(response.body).toHaveProperty('price', adData.price);
      expect(response.body).toHaveProperty('location', adData.location);
      expect(response.body).toHaveProperty('category', adData.category);
      expect(response.body).toHaveProperty('condition', adData.condition);
      expect(response.body).toHaveProperty('seller', userId);
      expect(response.body).toHaveProperty('vehicleDetails');
      expect(response.body.vehicleDetails).toHaveProperty(
        'vehicleType',
        adData.vehicleType,
      );
      expect(response.body.vehicleDetails).toHaveProperty('year', adData.year);
      expect(response.body.vehicleDetails).toHaveProperty(
        'mileage',
        adData.mileage,
      );
      expect(response.body.vehicleDetails).toHaveProperty(
        'color',
        adData.color,
      );
    });

    it('should return 401 without authentication', async () => {
      const adData = {
        title: 'Unauthorized Ad',
        description: 'This should fail',
        price: 500000,
        location: 'Mumbai, Maharashtra',
        category: 'VEHICLE',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads')
        .send(adData)
        .expect(401);

      trackPerformance('POST /ads - unauthorized', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('PUT /ads/:id - Update Ad', () => {
    beforeEach(async () => {
      // Create a test ad for update tests
      const adData = {
        title: 'Original Test Ad',
        description: 'Original description',
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

      const createResponse = await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(adData)
        .expect(201);

      createdAdId = createResponse.body._id;
    });

    it('should update ad successfully', async () => {
      const updateData = {
        title: 'Updated Test Ad',
        description: 'Updated description',
        price: 600000,
        location: 'Delhi, India',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .put(`/ads/${createdAdId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      trackPerformance('PUT /ads/:id - success', startTime);

      expect(response.body).toHaveProperty('_id', createdAdId);
      expect(response.body).toHaveProperty('title', updateData.title);
      expect(response.body).toHaveProperty(
        'description',
        updateData.description,
      );
      expect(response.body).toHaveProperty('price', updateData.price);
      expect(response.body).toHaveProperty('location', updateData.location);
    });

    it('should return 404 for non-existent ad ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        title: 'Updated Title',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .put(`/ads/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      trackPerformance('PUT /ads/:id - not found', startTime);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 401 without authentication', async () => {
      const updateData = {
        title: 'Unauthorized Update',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .put(`/ads/${createdAdId}`)
        .send(updateData)
        .expect(401);

      trackPerformance('PUT /ads/:id - unauthorized', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('DELETE /ads/:id - Delete Ad', () => {
    beforeEach(async () => {
      // Create a test ad for delete tests
      const adData = {
        title: 'Ad to Delete',
        description: 'This ad will be deleted',
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

      const createResponse = await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(adData)
        .expect(201);

      createdAdId = createResponse.body._id;
    });

    it('should delete ad successfully', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .delete(`/ads/${createdAdId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      trackPerformance('DELETE /ads/:id - success', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');

      // Verify the ad is no longer accessible
      await request(app.getHttpServer()).get(`/ads/${createdAdId}`).expect(404);
    });

    it('should return 404 for non-existent ad ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .delete(`/ads/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      trackPerformance('DELETE /ads/:id - not found', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 401 without authentication', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .delete(`/ads/${createdAdId}`)
        .expect(401);

      trackPerformance('DELETE /ads/:id - unauthorized', startTime);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle bulk operations efficiently', async () => {
      // Create 20 ads for bulk testing
      const adPromises: Promise<any>[] = [];
      for (let i = 1; i <= 20; i++) {
        const adData = {
          title: `Bulk Test Ad ${i}`,
          description: `Bulk test advertisement ${i}`,
          price: 500000 + i * 1000,
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

        adPromises.push(
          request(app.getHttpServer())
            .post('/ads')
            .set('Authorization', `Bearer ${authToken}`)
            .send(adData)
            .expect(201),
        );
      }

      const startTime = Date.now();
      await Promise.all(adPromises);
      const bulkCreateTime = Date.now() - startTime;

      console.log(
        `\n📈 Bulk Create Performance: ${bulkCreateTime}ms for 20 ads`,
      );

      // Test bulk listing performance
      const listStartTime = Date.now();
      const listResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'VEHICLE',
          page: 1,
          limit: 20,
        })
        .expect(200);

      const listTime = Date.now() - listStartTime;
      console.log(`📈 Bulk List Performance: ${listTime}ms for 20 ads`);

      expect(listResponse.body.data.length).toBe(20);
      expect(listTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should demonstrate cache effectiveness', async () => {
      // Create a test ad
      const adData = {
        title: 'Cache Test Ad',
        description: 'Testing cache performance',
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

      const createResponse = await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(adData)
        .expect(201);

      const adId = createResponse.body._id;

      // First request (cache miss)
      const firstRequestStart = Date.now();
      await request(app.getHttpServer()).get(`/ads/${adId}`).expect(200);
      const firstRequestTime = Date.now() - firstRequestStart;

      // Second request (cache hit)
      const secondRequestStart = Date.now();
      await request(app.getHttpServer()).get(`/ads/${adId}`).expect(200);
      const secondRequestTime = Date.now() - secondRequestStart;

      console.log(`\n📈 Cache Performance:`);
      console.log(`   First request (cache miss): ${firstRequestTime}ms`);
      console.log(`   Second request (cache hit): ${secondRequestTime}ms`);
      console.log(
        `   Cache improvement: ${(((firstRequestTime - secondRequestTime) / firstRequestTime) * 100).toFixed(1)}%`,
      );

      // Cache hit should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
    });
  });
});
