process.env.MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Vehicle Inventory Manufacturers (Read-Only)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('GET /vehicle-inventory/manufacturers', () => {
    it('should get all manufacturers', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
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
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should paginate manufacturers', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?page=1&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 5);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    it('should sort manufacturers by name', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?sortBy=name&sortOrder=ASC')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Verify sorting (first item should come before second item alphabetically)
          if (res.body.data.length > 1) {
            expect(res.body.data[0].name <= res.body.data[1].name).toBe(true);
          }
        });
    });

    it('should sort manufacturers by founded year', () => {
      return request(app.getHttpServer())
        .get(
          '/vehicle-inventory/manufacturers?sortBy=foundedYear&sortOrder=DESC',
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          // Verify sorting (first item should have higher founded year than second item)
          if (res.body.data.length > 1) {
            expect(
              res.body.data[0].foundedYear >= res.body.data[1].foundedYear,
            ).toBe(true);
          }
        });
    });
  });

  describe('GET /vehicle-inventory/manufacturers/:id', () => {
    let testManufacturerId: string;

    beforeAll(async () => {
      // Get a manufacturer ID from the listing for testing
      const response = await request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
        .expect(200);

      if (response.body.data.length > 0) {
        testManufacturerId = response.body.data[0]._id;
      } else {
        // If no manufacturers exist, create a test one
        const adminUser = {
          name: 'Test Admin',
          email: 'admin@test.com',
          phoneNumber: '+919876543210',
          password: 'TestPassword123!',
          userType: 'ADMIN',
        };

        // Create admin user
        const adminResponse = await request(app.getHttpServer())
          .post('/users')
          .send(adminUser)
          .expect(201);

        const adminToken = `Bearer ${adminResponse.body.accessToken}`;

        // Create test manufacturer
        const manufacturerData = {
          name: 'test-manufacturer-for-readonly',
          displayName: 'Test Manufacturer For Readonly',
          originCountry: 'India',
          description: 'A test manufacturer for readonly testing',
          logo: 'https://example.com/logo.png',
          website: 'https://www.testmanufacturer.com',
          foundedYear: 1990,
          headquarters: 'Mumbai, India',
        };

        const manufacturerResponse = await request(app.getHttpServer())
          .post('/vehicle-inventory/manufacturers')
          .set('Authorization', adminToken)
          .send(manufacturerData)
          .expect(201);

        testManufacturerId = manufacturerResponse.body._id;

        // Clean up admin user
        if (connection.db) {
          await connection.db
            .collection('users')
            .deleteOne({ email: adminUser.email });
        }
      }
    });

    it('should get manufacturer by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/manufacturers/${testManufacturerId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', testManufacturerId);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('displayName');
          expect(res.body).toHaveProperty('originCountry');
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('logo');
          expect(res.body).toHaveProperty('website');
          expect(res.body).toHaveProperty('foundedYear');
          expect(res.body).toHaveProperty('headquarters');
          expect(res.body).toHaveProperty('isActive');
          expect(res.body).toHaveProperty('isPremium');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
        });
    });

    it('should return 404 for non-existent manufacturer', () => {
      const fakeId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/manufacturers/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid ID format', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers/invalid-id')
        .expect(400);
    });
  });

  describe('GET /vehicle-inventory/models', () => {
    it('should get all vehicle models', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter vehicle models by manufacturer', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?manufacturer=maruti_suzuki')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          if (res.body.data.length > 0) {
            const allFromMaruti = res.body.data.every(
              (model: any) => model.manufacturer === 'maruti_suzuki',
            );
            expect(allFromMaruti).toBe(true);
          }
        });
    });

    it('should filter vehicle models by vehicle type', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?vehicleType=passenger_car')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          if (res.body.data.length > 0) {
            const allPassengerCars = res.body.data.every(
              (model: any) => model.vehicleType === 'passenger_car',
            );
            expect(allPassengerCars).toBe(true);
          }
        });
    });

    it('should search vehicle models by name', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?search=swift')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          if (res.body.data.length > 0) {
            const hasSwift = res.body.data.some(
              (model: any) =>
                model.name.toLowerCase().includes('swift') ||
                model.displayName.toLowerCase().includes('swift'),
            );
            expect(hasSwift).toBe(true);
          }
        });
    });

    it('should paginate vehicle models', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models?page=1&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 5);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('GET /vehicle-inventory/models/:id', () => {
    let testModelId: string | undefined;

    beforeAll(async () => {
      // Get a model ID from the listing for testing
      const response = await request(app.getHttpServer())
        .get('/vehicle-inventory/models')
        .expect(200);

      if (response.body.data.length > 0) {
        testModelId = response.body.data[0]._id;
      } else {
        // If no models exist, we'll skip the test
        testModelId = undefined;
      }
    });

    it('should get vehicle model by ID successfully', () => {
      if (!testModelId) {
        console.log('⚠️ No vehicle models found, skipping test');
        return Promise.resolve();
      }

      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models/${testModelId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', testModelId);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('displayName');
          expect(res.body).toHaveProperty('manufacturer');
          expect(res.body).toHaveProperty('vehicleType');
          expect(res.body).toHaveProperty('isActive');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
        });
    });

    it('should return 404 for non-existent vehicle model', () => {
      const fakeId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/models/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid vehicle model ID format', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/models/invalid-id')
        .expect(400);
    });
  });
});
