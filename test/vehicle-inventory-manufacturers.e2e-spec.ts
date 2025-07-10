process.env.MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Vehicle Manufacturers API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;
  let manufacturerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());

    // Login with existing super admin user
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '1212121212',
        password: '123456',
      });

    console.log('🔍 Login response:', {
      status: loginResponse.status,
      body: loginResponse.body,
    });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up manufacturers collection before each test
    if (connection.db) {
      await connection.db.collection('manufacturers').deleteMany({});
    }
  });

  describe('POST /vehicle-inventory/manufacturers', () => {
    it('should create a manufacturer successfully', () => {
      const manufacturerData = {
        name: 'test-manufacturer',
        displayName: 'Test Manufacturer',
        originCountry: 'India',
        description: 'A test manufacturer for testing purposes',
        logo: 'https://example.com/logo.png',
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
        isActive: true,
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
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
          expect(res.body).toHaveProperty('website', manufacturerData.website);
          expect(res.body).toHaveProperty(
            'foundedYear',
            manufacturerData.foundedYear,
          );
          expect(res.body).toHaveProperty(
            'headquarters',
            manufacturerData.headquarters,
          );
          expect(res.body).toHaveProperty(
            'isActive',
            manufacturerData.isActive,
          );
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');

          manufacturerId = res.body._id;
        });
    });

    it('should fail to create manufacturer with duplicate name', async () => {
      const manufacturerData = {
        name: 'duplicate-manufacturer',
        displayName: 'Duplicate Manufacturer',
        originCountry: 'India',
        logo: 'https://example.com/logo.png',
      };

      // Create first manufacturer
      await request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
        .send(manufacturerData)
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
        .send(manufacturerData)
        .expect(400);
    });

    it('should fail to create manufacturer with invalid data', () => {
      const invalidData = {
        // Missing required fields
        displayName: 'Test Manufacturer',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });

    it('should fail to create manufacturer with invalid logo URL', () => {
      const manufacturerData = {
        name: 'test-manufacturer',
        displayName: 'Test Manufacturer',
        originCountry: 'India',
        logo: 'invalid-url',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
        .send(manufacturerData)
        .expect(400);
    });
  });

  describe('GET /vehicle-inventory/manufacturers', () => {
    beforeEach(async () => {
      // Create test manufacturers
      const manufacturers = [
        {
          name: 'manufacturer-1',
          displayName: 'Manufacturer 1',
          originCountry: 'India',
          logo: 'https://example.com/logo1.png',
        },
        {
          name: 'manufacturer-2',
          displayName: 'Manufacturer 2',
          originCountry: 'Japan',
          logo: 'https://example.com/logo2.png',
        },
        {
          name: 'manufacturer-3',
          displayName: 'Manufacturer 3',
          originCountry: 'Germany',
          logo: 'https://example.com/logo3.png',
        },
      ];

      for (const manufacturer of manufacturers) {
        await request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', authToken)
          .send(manufacturer);
      }
    });

    it('should get all manufacturers successfully', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(3);
          expect(res.body.data[0]).toHaveProperty('_id');
          expect(res.body.data[0]).toHaveProperty('name');
          expect(res.body.data[0]).toHaveProperty('displayName');
          expect(res.body.data[0]).toHaveProperty('originCountry');
          expect(res.body.data[0]).toHaveProperty('logo');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
        });
    });

    it('should filter manufacturers by search term', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?search=Manufacturer 1')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].displayName).toBe('Manufacturer 1');
        });
    });

    it('should filter manufacturers by country', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?originCountry=India')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].originCountry).toBe('India');
        });
    });

    it('should filter manufacturers by category', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?category=passenger_car')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter manufacturers by region', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?region=Asia')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should paginate manufacturers', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?page=1&limit=2')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(2);
        });
    });
  });

  describe('GET /vehicle-inventory/manufacturers/:id', () => {
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
        .set('Authorization', authToken)
        .send(manufacturerData);

      manufacturerId = response.body._id;
    });

    it('should get manufacturer by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', manufacturerId);
          expect(res.body).toHaveProperty('name', 'test-manufacturer');
          expect(res.body).toHaveProperty('displayName', 'Test Manufacturer');
          expect(res.body).toHaveProperty('originCountry', 'India');
          expect(res.body).toHaveProperty(
            'logo',
            'https://example.com/logo.png',
          );
        });
    });

    it('should return 404 for non-existent manufacturer', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/manufacturers/${nonExistentId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('PUT /vehicle-inventory/manufacturers/:id', () => {
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
        .set('Authorization', authToken)
        .send(manufacturerData);

      manufacturerId = response.body._id;
    });

    it('should update manufacturer successfully', () => {
      const updateData = {
        displayName: 'Updated Manufacturer',
        description: 'Updated description',
        website: 'https://www.updatedmanufacturer.com',
        foundedYear: 1995,
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', authToken)
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
          expect(res.body).toHaveProperty(
            'foundedYear',
            updateData.foundedYear,
          );
        });
    });

    it('should return 404 for non-existent manufacturer', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updateData = {
        displayName: 'Updated Manufacturer',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${nonExistentId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 for invalid update data', () => {
      const invalidData = {
        logo: 'invalid-url',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /vehicle-inventory/manufacturers/:id', () => {
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
        .set('Authorization', authToken)
        .send(manufacturerData);

      manufacturerId = response.body._id;
    });

    it('should delete manufacturer successfully', () => {
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Manufacturer deleted successfully',
          );
        });
    });

    it('should return 404 for non-existent manufacturer', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/manufacturers/${nonExistentId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', () => {
      return request(app.getHttpServer())
        .delete('/vehicle-inventory/manufacturers/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });
});
