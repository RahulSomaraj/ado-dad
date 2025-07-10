process.env.MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Vehicle Inventory Manufacturers (Read-Only)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '1212121212', // Super Admin
        password: '123456',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /vehicle-inventory/manufacturers', () => {
    it('should get all manufacturers', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should filter manufacturers by search term', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?search=maruti')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Check if any manufacturer contains 'maruti' in name or displayName
          const hasMaruti = res.body.data.some(
            (manufacturer: any) =>
              manufacturer.name.toLowerCase().includes('maruti') ||
              manufacturer.displayName.toLowerCase().includes('maruti'),
          );
          expect(hasMaruti).toBe(true);
        });
    });

    it('should filter manufacturers by origin country', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?originCountry=India')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Check if all manufacturers are from India
          const allFromIndia = res.body.data.every(
            (manufacturer: any) => manufacturer.originCountry === 'India',
          );
          expect(allFromIndia).toBe(true);
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
          expect(res.body.data.length).toBeGreaterThan(0);
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
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 2);
        });
    });

    it('should sort manufacturers by name', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?sortBy=name&sortOrder=ASC')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(1);
          // Check if data is sorted by name in ascending order
          const names = res.body.data.map(
            (manufacturer: any) => manufacturer.name,
          );
          const sortedNames = [...names].sort();
          expect(names).toEqual(sortedNames);
        });
    });

    it('should sort manufacturers by founded year', () => {
      return request(app.getHttpServer())
        .get(
          '/vehicle-inventory/manufacturers?sortBy=foundedYear&sortOrder=DESC',
        )
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(1);
          // Check if data is sorted by foundedYear in descending order
          const years = res.body.data.map(
            (manufacturer: any) => manufacturer.foundedYear,
          );
          const sortedYears = [...years].sort((a, b) => b - a);
          expect(years).toEqual(sortedYears);
        });
    });
  });

  describe('GET /vehicle-inventory/manufacturers/:id', () => {
    it('should get manufacturer by ID successfully', async () => {
      // First get all manufacturers to find a valid ID
      const allManufacturersResponse = await request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken);

      const manufacturerId = allManufacturersResponse.body.data[0]._id;

      return request(app.getHttpServer())
        .get(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', manufacturerId);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('displayName');
          expect(res.body).toHaveProperty('originCountry');
          expect(res.body).toHaveProperty('isActive', true);
          expect(res.body).toHaveProperty('isDeleted', false);
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

  describe('GET /vehicle-inventory/models', () => {
    it('should get all vehicle models', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should filter vehicle models by manufacturer', async () => {
      // First get all manufacturers to find a valid manufacturer ID
      const allManufacturersResponse = await request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
        .set('Authorization', authToken);

      const manufacturerId = allManufacturersResponse.body.data[0]._id;

      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models?manufacturerId=${manufacturerId}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Check if all models belong to the specified manufacturer
          const allFromManufacturer = res.body.data.every(
            (model: any) => model.manufacturer._id === manufacturerId,
          );
          expect(allFromManufacturer).toBe(true);
        });
    });

    it('should filter vehicle models by vehicle type', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?vehicleType=HATCHBACK')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Check if all models are of type HATCHBACK
          const allHatchbacks = res.body.data.every(
            (model: any) => model.vehicleType === 'HATCHBACK',
          );
          expect(allHatchbacks).toBe(true);
        });
    });

    it('should search vehicle models by name', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?search=swift')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Check if any model contains 'swift' in name or displayName
          const hasSwift = res.body.data.some(
            (model: any) =>
              model.name.toLowerCase().includes('swift') ||
              model.displayName.toLowerCase().includes('swift'),
          );
          expect(hasSwift).toBe(true);
        });
    });

    it('should paginate vehicle models', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?page=1&limit=3')
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(3);
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 3);
        });
    });
  });

  describe('GET /vehicle-inventory/models/:id', () => {
    it('should get vehicle model by ID successfully', async () => {
      // First get all vehicle models to find a valid ID
      const allModelsResponse = await request(app.getHttpServer())
        .get('/vehicle-inventory/models')
        .set('Authorization', authToken);

      const modelId = allModelsResponse.body.data[0]._id;

      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models/${modelId}`)
        .set('Authorization', authToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', modelId);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('displayName');
          expect(res.body).toHaveProperty('vehicleType');
          expect(res.body).toHaveProperty('manufacturer');
          expect(res.body).toHaveProperty('isActive', true);
          expect(res.body).toHaveProperty('isDeleted', false);
        });
    });

    it('should return 404 for non-existent vehicle model', () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models/${nonExistentId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid vehicle model ID format', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });
});
