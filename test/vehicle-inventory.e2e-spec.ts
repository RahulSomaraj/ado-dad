import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Vehicle Inventory API (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let manufacturerId: string;
  let vehicleModelId: string;
  let vehicleVariantId: string;

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
    await mongoConnection.db.collection('users').deleteMany({});
    await mongoConnection.db.collection('refreshtokens').deleteMany({});
    await mongoConnection.db.collection('manufacturers').deleteMany({});
    await mongoConnection.db.collection('vehiclemodels').deleteMany({});
    await mongoConnection.db.collection('vehiclevariants').deleteMany({});
    await mongoConnection.db.collection('fueltypes').deleteMany({});
    await mongoConnection.db.collection('transmissiontypes').deleteMany({});

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
        phone: '1234567890',
        password: 'testPassword123',
      });

    authToken = loginResponse.body.access_token;
  });

  describe('Manufacturers API', () => {
    describe('POST /vehicle-inventory/manufacturers', () => {
      it('should create manufacturer successfully', () => {
        const manufacturerData = {
          name: 'test-manufacturer',
          displayName: 'Test Manufacturer',
          originCountry: 'India',
          description: 'A test manufacturer for testing purposes',
          logo: 'https://example.com/logo.png',
          website: 'https://testmanufacturer.com',
          foundedYear: 1990,
          headquarters: 'Mumbai, India',
        };

        return request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('name', manufacturerData.name);
            expect(res.body).toHaveProperty(
              'displayName',
              manufacturerData.displayName,
            );
            expect(res.body).toHaveProperty(
              'originCountry',
              manufacturerData.originCountry,
            );
            expect(res.body).toHaveProperty(
              'description',
              manufacturerData.description,
            );
            expect(res.body).toHaveProperty('logo', manufacturerData.logo);
            expect(res.body).toHaveProperty(
              'website',
              manufacturerData.website,
            );
            expect(res.body).toHaveProperty(
              'foundedYear',
              manufacturerData.foundedYear,
            );
            expect(res.body).toHaveProperty(
              'headquarters',
              manufacturerData.headquarters,
            );
            expect(res.body).toHaveProperty('isActive', true);

            manufacturerId = res.body._id;
          });
      });

      it('should fail to create manufacturer with invalid data', () => {
        const manufacturerData = {
          name: 'test-manufacturer',
          // Missing required fields
        };

        return request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData)
          .expect(400);
      });

      it('should fail to create manufacturer with duplicate name', async () => {
        const manufacturerData = {
          name: 'test-manufacturer',
          displayName: 'Test Manufacturer',
          originCountry: 'India',
          logo: 'https://example.com/logo.png',
        };

        // Create first manufacturer
        await request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData)
          .expect(201);

        // Try to create duplicate
        return request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData)
          .expect(409);
      });
    });

    describe('GET /vehicle-inventory/manufacturers', () => {
      beforeEach(async () => {
        // Create a test manufacturer
        const manufacturerData = {
          name: 'test-manufacturer',
          displayName: 'Test Manufacturer',
          originCountry: 'India',
          logo: 'https://example.com/logo.png',
        };

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData);

        manufacturerId = response.body._id;
      });

      it('should get all manufacturers successfully', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/manufacturers')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('displayName');
            expect(res.body[0]).toHaveProperty('originCountry');
            expect(res.body[0]).toHaveProperty('logo');
          });
      });

      it('should get manufacturers with pagination', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/manufacturers?page=1&limit=10')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      });

      it('should filter manufacturers by origin country', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/manufacturers?originCountry=India')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((manufacturer) => {
              expect(manufacturer.originCountry).toBe('India');
            });
          });
      });

      it('should search manufacturers by name', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/manufacturers?search=Test')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((manufacturer) => {
              expect(manufacturer.displayName).toMatch(/Test/i);
            });
          });
      });
    });

    describe('GET /vehicle-inventory/manufacturers/:id', () => {
      beforeEach(async () => {
        const manufacturerData = {
          name: 'test-manufacturer',
          displayName: 'Test Manufacturer',
          originCountry: 'India',
          logo: 'https://example.com/logo.png',
        };

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData);

        manufacturerId = response.body._id;
      });

      it('should get manufacturer by ID successfully', () => {
        return request(app.getHttpServer())
          .get(`/vehicle-inventory/manufacturers/${manufacturerId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id', manufacturerId);
            expect(res.body).toHaveProperty('name', 'test-manufacturer');
            expect(res.body).toHaveProperty('displayName', 'Test Manufacturer');
            expect(res.body).toHaveProperty('originCountry', 'India');
          });
      });

      it('should fail to get manufacturer with invalid ID', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/manufacturers/invalid-id')
          .expect(400);
      });

      it('should fail to get non-existent manufacturer', () => {
        const fakeId = '507f1f77bcf86cd799439011';
        return request(app.getHttpServer())
          .get(`/vehicle-inventory/manufacturers/${fakeId}`)
          .expect(404);
      });
    });

    describe('PUT /vehicle-inventory/manufacturers/:id', () => {
      beforeEach(async () => {
        const manufacturerData = {
          name: 'test-manufacturer',
          displayName: 'Test Manufacturer',
          originCountry: 'India',
          logo: 'https://example.com/logo.png',
        };

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(manufacturerData);

        manufacturerId = response.body._id;
      });

      it('should update manufacturer successfully', () => {
        const updateData = {
          displayName: 'Updated Test Manufacturer',
          description: 'Updated description',
          website: 'https://updated.com',
        };

        return request(app.getHttpServer())
          .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id', manufacturerId);
            expect(res.body).toHaveProperty(
              'displayName',
              updateData.displayName,
            );
            expect(res.body).toHaveProperty(
              'description',
              updateData.description,
            );
            expect(res.body).toHaveProperty('website', updateData.website);
          });
      });

      it('should fail to update manufacturer with invalid data', () => {
        const updateData = {
          logo: 'invalid-url',
        };

        return request(app.getHttpServer())
          .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(400);
      });
    });
  });

  describe('Vehicle Models API', () => {
    beforeEach(async () => {
      // Create a manufacturer first
      const manufacturerData = {
        name: 'test-manufacturer',
        displayName: 'Test Manufacturer',
        originCountry: 'India',
        logo: 'https://example.com/logo.png',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(manufacturerData);

      manufacturerId = response.body._id;
    });

    describe('POST /vehicle-inventory/vehicle-models', () => {
      it('should create vehicle model successfully', () => {
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

        return request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-models')
          .set('Authorization', `Bearer ${authToken}`)
          .send(modelData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('name', modelData.name);
            expect(res.body).toHaveProperty(
              'displayName',
              modelData.displayName,
            );
            expect(res.body).toHaveProperty('manufacturer', manufacturerId);
            expect(res.body).toHaveProperty(
              'vehicleType',
              modelData.vehicleType,
            );
            expect(res.body).toHaveProperty(
              'description',
              modelData.description,
            );
            expect(res.body).toHaveProperty('launchYear', modelData.launchYear);
            expect(res.body).toHaveProperty('segment', modelData.segment);
            expect(res.body).toHaveProperty('bodyType', modelData.bodyType);
            expect(res.body).toHaveProperty('isActive', true);

            vehicleModelId = res.body._id;
          });
      });

      it('should fail to create vehicle model with invalid manufacturer', () => {
        const modelData = {
          name: 'test-model',
          displayName: 'Test Model',
          manufacturer: 'invalid-manufacturer-id',
          vehicleType: 'HATCHBACK',
        };

        return request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-models')
          .set('Authorization', `Bearer ${authToken}`)
          .send(modelData)
          .expect(400);
      });
    });

    describe('GET /vehicle-inventory/vehicle-models', () => {
      beforeEach(async () => {
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

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-models')
          .set('Authorization', `Bearer ${authToken}`)
          .send(modelData);

        vehicleModelId = response.body._id;
      });

      it('should get all vehicle models successfully', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/vehicle-models')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('displayName');
            expect(res.body[0]).toHaveProperty('manufacturer');
            expect(res.body[0]).toHaveProperty('vehicleType');
          });
      });

      it('should filter vehicle models by manufacturer', () => {
        return request(app.getHttpServer())
          .get(
            `/vehicle-inventory/vehicle-models?manufacturerId=${manufacturerId}`,
          )
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((model) => {
              expect(model.manufacturer).toBe(manufacturerId);
            });
          });
      });

      it('should filter vehicle models by vehicle type', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/vehicle-models?vehicleType=HATCHBACK')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((model) => {
              expect(model.vehicleType).toBe('HATCHBACK');
            });
          });
      });

      it('should filter vehicle models by segment', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/vehicle-models?segment=B')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((model) => {
              expect(model.segment).toBe('B');
            });
          });
      });
    });

    describe('GET /vehicle-inventory/vehicle-models/:id', () => {
      beforeEach(async () => {
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

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-models')
          .set('Authorization', `Bearer ${authToken}`)
          .send(modelData);

        vehicleModelId = response.body._id;
      });

      it('should get vehicle model by ID successfully', () => {
        return request(app.getHttpServer())
          .get(`/vehicle-inventory/vehicle-models/${vehicleModelId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id', vehicleModelId);
            expect(res.body).toHaveProperty('name', 'test-model');
            expect(res.body).toHaveProperty('displayName', 'Test Model');
            expect(res.body).toHaveProperty('manufacturer', manufacturerId);
            expect(res.body).toHaveProperty('vehicleType', 'HATCHBACK');
          });
      });
    });
  });

  describe('Vehicle Variants API', () => {
    beforeEach(async () => {
      // Create a manufacturer and model first
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
    });

    describe('POST /vehicle-inventory/vehicle-variants', () => {
      it('should create vehicle variant successfully', () => {
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

        return request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-variants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(variantData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('name', variantData.name);
            expect(res.body).toHaveProperty(
              'displayName',
              variantData.displayName,
            );
            expect(res.body).toHaveProperty('vehicleModel', vehicleModelId);
            expect(res.body).toHaveProperty(
              'description',
              variantData.description,
            );
            expect(res.body).toHaveProperty(
              'engineCapacity',
              variantData.engineCapacity,
            );
            expect(res.body).toHaveProperty('fuelType', variantData.fuelType);
            expect(res.body).toHaveProperty(
              'transmissionType',
              variantData.transmissionType,
            );
            expect(res.body).toHaveProperty('mileage', variantData.mileage);
            expect(res.body).toHaveProperty('power', variantData.power);
            expect(res.body).toHaveProperty('torque', variantData.torque);
            expect(res.body).toHaveProperty('price', variantData.price);
            expect(res.body).toHaveProperty('features');
            expect(Array.isArray(res.body.features)).toBe(true);
            expect(res.body).toHaveProperty('isActive', true);

            vehicleVariantId = res.body._id;
          });
      });

      it('should fail to create vehicle variant with invalid model', () => {
        const variantData = {
          name: 'test-variant',
          displayName: 'Test Variant',
          vehicleModel: 'invalid-model-id',
          engineCapacity: 1200,
          fuelType: 'PETROL',
          transmissionType: 'MANUAL',
        };

        return request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-variants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(variantData)
          .expect(400);
      });
    });

    describe('GET /vehicle-inventory/vehicle-variants', () => {
      beforeEach(async () => {
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

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-variants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(variantData);

        vehicleVariantId = response.body._id;
      });

      it('should get all vehicle variants successfully', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/vehicle-variants')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('_id');
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('displayName');
            expect(res.body[0]).toHaveProperty('vehicleModel');
            expect(res.body[0]).toHaveProperty('engineCapacity');
            expect(res.body[0]).toHaveProperty('fuelType');
            expect(res.body[0]).toHaveProperty('transmissionType');
          });
      });

      it('should filter vehicle variants by model', () => {
        return request(app.getHttpServer())
          .get(
            `/vehicle-inventory/vehicle-variants?vehicleModelId=${vehicleModelId}`,
          )
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((variant) => {
              expect(variant.vehicleModel).toBe(vehicleModelId);
            });
          });
      });

      it('should filter vehicle variants by fuel type', () => {
        return request(app.getHttpServer())
          .get('/vehicle-inventory/vehicle-variants?fuelType=PETROL')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((variant) => {
              expect(variant.fuelType).toBe('PETROL');
            });
          });
      });

      it('should filter vehicle variants by price range', () => {
        return request(app.getHttpServer())
          .get(
            '/vehicle-inventory/vehicle-variants?minPrice=400000&maxPrice=600000',
          )
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((variant) => {
              expect(variant.price).toBeGreaterThanOrEqual(400000);
              expect(variant.price).toBeLessThanOrEqual(600000);
            });
          });
      });
    });

    describe('GET /vehicle-inventory/vehicle-variants/:id', () => {
      beforeEach(async () => {
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

        const response = await request(app.getHttpServer())
          .post('/vehicle-inventory/vehicle-variants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(variantData);

        vehicleVariantId = response.body._id;
      });

      it('should get vehicle variant by ID successfully', () => {
        return request(app.getHttpServer())
          .get(`/vehicle-inventory/vehicle-variants/${vehicleVariantId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('_id', vehicleVariantId);
            expect(res.body).toHaveProperty('name', 'test-variant');
            expect(res.body).toHaveProperty('displayName', 'Test Variant');
            expect(res.body).toHaveProperty('vehicleModel', vehicleModelId);
            expect(res.body).toHaveProperty('engineCapacity', 1200);
            expect(res.body).toHaveProperty('fuelType', 'PETROL');
            expect(res.body).toHaveProperty('transmissionType', 'MANUAL');
          });
      });
    });
  });
});
