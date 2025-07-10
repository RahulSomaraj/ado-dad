import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Vehicle Models API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;
  let manufacturerId: string;
  let modelId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());

    // Login to get auth token using provided credentials
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '1212121212',
        password: '123456',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    // Create a test manufacturer
    const manufacturerData = {
      name: 'test-manufacturer',
      displayName: 'Test Manufacturer',
      originCountry: 'India',
      logo: 'https://example.com/logo.png',
    };

    const manufacturerResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/manufacturers')
      .set('Authorization', authToken)
      .send(manufacturerData);

    manufacturerId = manufacturerResponse.body._id;
  });

  describe('POST /vehicle-inventory/models', () => {
    it('should create a regular vehicle model successfully', () => {
      const modelData = {
        name: 'test-model',
        displayName: 'Test Model',
        manufacturer: manufacturerId,
        vehicleType: 'HATCHBACK',
        description: 'A test vehicle model',
        launchYear: 2020,
        segment: 'B',
        bodyType: 'Hatchback',
        images: ['https://example.com/model1.jpg'],
        brochureUrl: 'https://example.com/brochure.pdf',
        isActive: true,
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('name', modelData.name);
          expect(res.body).toHaveProperty('displayName', modelData.displayName);
          expect(res.body).toHaveProperty('manufacturer', manufacturerId);
          expect(res.body).toHaveProperty('vehicleType', modelData.vehicleType);
          expect(res.body).toHaveProperty('description', modelData.description);
          expect(res.body).toHaveProperty('launchYear', modelData.launchYear);
          expect(res.body).toHaveProperty('segment', modelData.segment);
          expect(res.body).toHaveProperty('bodyType', modelData.bodyType);
          expect(res.body).toHaveProperty('images', modelData.images);
          expect(res.body).toHaveProperty('brochureUrl', modelData.brochureUrl);
          expect(res.body).toHaveProperty('isActive', modelData.isActive);
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');

          modelId = res.body._id;
        });
    });

    it('should create a commercial vehicle model successfully', () => {
      const commercialModelData = {
        name: 'tata-407',
        displayName: 'Tata 407',
        manufacturer: manufacturerId,
        vehicleType: 'TRUCK',
        description: 'Heavy duty commercial truck for logistics',
        launchYear: 1986,
        segment: 'Commercial',
        bodyType: 'Truck',
        images: ['https://example.com/tata407.jpg'],
        brochureUrl: 'https://example.com/tata407-brochure.pdf',
        isCommercialVehicle: true,
        commercialVehicleType: 'truck',
        commercialBodyType: 'flatbed',
        defaultPayloadCapacity: 4000,
        defaultPayloadUnit: 'kg',
        defaultAxleCount: 2,
        defaultSeatingCapacity: 3,
        isActive: true,
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(commercialModelData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('name', commercialModelData.name);
          expect(res.body).toHaveProperty(
            'displayName',
            commercialModelData.displayName,
          );
          expect(res.body).toHaveProperty('manufacturer', manufacturerId);
          expect(res.body).toHaveProperty(
            'vehicleType',
            commercialModelData.vehicleType,
          );
          expect(res.body).toHaveProperty(
            'isCommercialVehicle',
            commercialModelData.isCommercialVehicle,
          );
          expect(res.body).toHaveProperty(
            'commercialVehicleType',
            commercialModelData.commercialVehicleType,
          );
          expect(res.body).toHaveProperty(
            'commercialBodyType',
            commercialModelData.commercialBodyType,
          );
          expect(res.body).toHaveProperty(
            'defaultPayloadCapacity',
            commercialModelData.defaultPayloadCapacity,
          );
          expect(res.body).toHaveProperty(
            'defaultPayloadUnit',
            commercialModelData.defaultPayloadUnit,
          );
          expect(res.body).toHaveProperty(
            'defaultAxleCount',
            commercialModelData.defaultAxleCount,
          );
          expect(res.body).toHaveProperty(
            'defaultSeatingCapacity',
            commercialModelData.defaultSeatingCapacity,
          );
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');

          modelId = res.body._id;
        });
    });

    it('should fail to create model with duplicate name for same manufacturer', async () => {
      const modelData = {
        name: 'duplicate-model',
        displayName: 'Duplicate Model',
        manufacturer: manufacturerId,
        vehicleType: 'HATCHBACK',
      };

      // Create first model
      await request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData)
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData)
        .expect(400);
    });

    it('should fail to create model with invalid manufacturer', () => {
      const modelData = {
        name: 'test-model',
        displayName: 'Test Model',
        manufacturer: 'invalid-manufacturer-id',
        vehicleType: 'HATCHBACK',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData)
        .expect(400);
    });

    it('should fail to create model with invalid vehicle type', () => {
      const modelData = {
        name: 'test-model',
        displayName: 'Test Model',
        manufacturer: manufacturerId,
        vehicleType: 'INVALID_TYPE',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData)
        .expect(400);
    });

    it('should fail to create model with missing required fields', () => {
      const invalidData = {
        displayName: 'Test Model',
        // Missing name, manufacturer, vehicleType
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /vehicle-inventory/models', () => {
    beforeEach(async () => {
      // Create test models
      const models = [
        {
          name: 'model-1',
          displayName: 'Model 1',
          manufacturer: manufacturerId,
          vehicleType: 'HATCHBACK',
          segment: 'A',
          bodyType: 'Hatchback',
        },
        {
          name: 'model-2',
          displayName: 'Model 2',
          manufacturer: manufacturerId,
          vehicleType: 'SEDAN',
          segment: 'B',
          bodyType: 'Sedan',
        },
        {
          name: 'model-3',
          displayName: 'Model 3',
          manufacturer: manufacturerId,
          vehicleType: 'TRUCK',
          segment: 'Commercial',
          bodyType: 'Truck',
          isCommercialVehicle: true,
          commercialVehicleType: 'truck',
          commercialBodyType: 'flatbed',
        },
      ];

      for (const model of models) {
        await request(app.getHttpServer())
          .post('/vehicle-inventory/models')
          .set('Authorization', authToken)
          .send(model);
      }
    });

    it('should get all models successfully', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3);
          expect(res.body[0]).toHaveProperty('_id');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('displayName');
          expect(res.body[0]).toHaveProperty('manufacturer');
          expect(res.body[0]).toHaveProperty('vehicleType');
        });
    });

    it('should filter models by search term', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?search=Model 1')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].displayName).toBe('Model 1');
        });
    });

    it('should filter models by manufacturer', () => {
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models?manufacturerId=${manufacturerId}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);
        });
    });

    it('should filter models by vehicle type', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?vehicleType=HATCHBACK')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].vehicleType).toBe('HATCHBACK');
        });
    });

    it('should filter models by segment', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?segment=A')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].segment).toBe('A');
        });
    });

    it('should filter models by body type', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?bodyType=Hatchback')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].bodyType).toBe('Hatchback');
        });
    });

    it('should filter models by launch year range', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?minLaunchYear=2019&maxLaunchYear=2021')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter commercial vehicle models', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?isCommercialVehicle=true')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].isCommercialVehicle).toBe(true);
        });
    });

    it('should paginate models', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?page=1&limit=2')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });
  });

  describe('GET /vehicle-inventory/models/:id', () => {
    beforeEach(async () => {
      // Create a test model
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
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData);

      modelId = response.body._id;
    });

    it('should get model by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models/${modelId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', modelId);
          expect(res.body).toHaveProperty('name', 'test-model');
          expect(res.body).toHaveProperty('displayName', 'Test Model');
          expect(res.body).toHaveProperty('manufacturer', manufacturerId);
          expect(res.body).toHaveProperty('vehicleType', 'HATCHBACK');
          expect(res.body).toHaveProperty(
            'description',
            'A test vehicle model',
          );
          expect(res.body).toHaveProperty('launchYear', 2020);
          expect(res.body).toHaveProperty('segment', 'B');
          expect(res.body).toHaveProperty('bodyType', 'Hatchback');
        });
    });

    it('should return 404 for non-existent model', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models/${nonExistentId}`)
        .expect(404);
    });

    it('should return 400 for invalid ID format', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models/invalid-id')
        .expect(400);
    });
  });

  describe('PUT /vehicle-inventory/models/:id', () => {
    beforeEach(async () => {
      // Create a test model
      const modelData = {
        name: 'test-model',
        displayName: 'Test Model',
        manufacturer: manufacturerId,
        vehicleType: 'HATCHBACK',
        description: 'A test vehicle model',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData);

      modelId = response.body._id;
    });

    it('should update model successfully', () => {
      const updateData = {
        displayName: 'Updated Model',
        description: 'Updated description',
        launchYear: 2021,
        segment: 'A',
        bodyType: 'Sedan',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/models/${modelId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', modelId);
          expect(res.body).toHaveProperty(
            'displayName',
            updateData.displayName,
          );
          expect(res.body).toHaveProperty(
            'description',
            updateData.description,
          );
          expect(res.body).toHaveProperty('launchYear', updateData.launchYear);
          expect(res.body).toHaveProperty('segment', updateData.segment);
          expect(res.body).toHaveProperty('bodyType', updateData.bodyType);
        });
    });

    it('should update commercial vehicle model successfully', async () => {
      // Create a commercial vehicle model first
      const commercialModelData = {
        name: 'commercial-model',
        displayName: 'Commercial Model',
        manufacturer: manufacturerId,
        vehicleType: 'TRUCK',
        isCommercialVehicle: true,
        commercialVehicleType: 'truck',
        commercialBodyType: 'flatbed',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(commercialModelData);

      const commercialModelId = response.body._id;

      const updateData = {
        displayName: 'Updated Commercial Model',
        defaultPayloadCapacity: 5000,
        defaultPayloadUnit: 'tons',
        defaultAxleCount: 3,
        defaultSeatingCapacity: 4,
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/models/${commercialModelId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', commercialModelId);
          expect(res.body).toHaveProperty(
            'displayName',
            updateData.displayName,
          );
          expect(res.body).toHaveProperty(
            'defaultPayloadCapacity',
            updateData.defaultPayloadCapacity,
          );
          expect(res.body).toHaveProperty(
            'defaultPayloadUnit',
            updateData.defaultPayloadUnit,
          );
          expect(res.body).toHaveProperty(
            'defaultAxleCount',
            updateData.defaultAxleCount,
          );
          expect(res.body).toHaveProperty(
            'defaultSeatingCapacity',
            updateData.defaultSeatingCapacity,
          );
        });
    });

    it('should return 404 for non-existent model', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updateData = {
        displayName: 'Updated Model',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/models/${nonExistentId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 for invalid update data', () => {
      const invalidData = {
        vehicleType: 'INVALID_TYPE',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/models/${modelId}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /vehicle-inventory/models/:id', () => {
    beforeEach(async () => {
      // Create a test model
      const modelData = {
        name: 'test-model',
        displayName: 'Test Model',
        manufacturer: manufacturerId,
        vehicleType: 'HATCHBACK',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .send(modelData);

      modelId = response.body._id;
    });

    it('should delete model successfully', () => {
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/models/${modelId}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Vehicle model deleted successfully',
          );
        });
    });

    it('should return 404 for non-existent model', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/models/${nonExistentId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', () => {
      return request(app.getHttpServer())
        .delete('/vehicle-inventory/models/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });
});
