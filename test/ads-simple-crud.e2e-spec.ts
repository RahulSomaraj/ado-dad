import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ads API Simple CRUD (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;

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
      await mongoConnection.db.collection('ads').deleteMany({});
      await mongoConnection.db.collection('vehicleads').deleteMany({});
      await mongoConnection.db.collection('propertyads').deleteMany({});
      await mongoConnection.db
        .collection('commercialvehicleads')
        .deleteMany({});
    }
  });

  describe('POST /ads/list - List Ads', () => {
    it('should return empty list when no ads exist', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads/list')
        .send({})
        .expect(201);

      const duration = Date.now() - startTime;
      console.log(`POST /ads/list - empty: ${duration}ms`);

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

    it('should handle pagination parameters correctly', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          page: 2,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        })
        .expect(201);

      const duration = Date.now() - startTime;
      console.log(`POST /ads/list - with pagination: ${duration}ms`);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('page', 2);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('hasNext', false);
      expect(response.body).toHaveProperty('hasPrev', true);
    });

    it('should handle search parameter correctly', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          search: 'test search term',
          category: 'VEHICLE',
        })
        .expect(201);

      const duration = Date.now() - startTime;
      console.log(`POST /ads/list - with search: ${duration}ms`);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle category filtering correctly', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'PROPERTY',
          minPrice: 100000,
          maxPrice: 1000000,
        })
        .expect(201);

      const duration = Date.now() - startTime;
      console.log(`POST /ads/list - with category filter: ${duration}ms`);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /ads/:id - Get Ad by ID', () => {
    it('should return 404 for non-existent ad ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/ads/${fakeId}`)
        .expect(404);

      const duration = Date.now() - startTime;
      console.log(`GET /ads/:id - not found: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ad ID format', async () => {
      const invalidId = 'invalid-id-format';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/ads/${invalidId}`)
        .expect(400);

      const duration = Date.now() - startTime;
      console.log(`GET /ads/:id - invalid format: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid ad id');
    });
  });

  describe('POST /ads - Create Ad', () => {
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

      const duration = Date.now() - startTime;
      console.log(`POST /ads - unauthorized: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('PUT /ads/:id - Update Ad', () => {
    it('should return 401 for non-existent ad ID without authentication', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        title: 'Updated Title',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .put(`/ads/${fakeId}`)
        .send(updateData)
        .expect(401);

      const duration = Date.now() - startTime;
      console.log(`PUT /ads/:id - not found: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 for invalid ad ID format without authentication', async () => {
      const invalidId = 'invalid-id-format';
      const updateData = {
        title: 'Updated Title',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .put(`/ads/${invalidId}`)
        .send(updateData)
        .expect(401);

      const duration = Date.now() - startTime;
      console.log(`PUT /ads/:id - invalid format: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 without authentication', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        title: 'Unauthorized Update',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .put(`/ads/${fakeId}`)
        .send(updateData)
        .expect(401);

      const duration = Date.now() - startTime;
      console.log(`PUT /ads/:id - unauthorized: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('DELETE /ads/:id - Delete Ad', () => {
    it('should return 401 for non-existent ad ID without authentication', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .delete(`/ads/${fakeId}`)
        .expect(401);

      const duration = Date.now() - startTime;
      console.log(`DELETE /ads/:id - not found: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 for invalid ad ID format without authentication', async () => {
      const invalidId = 'invalid-id-format';

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .delete(`/ads/${invalidId}`)
        .expect(401);

      const duration = Date.now() - startTime;
      console.log(`DELETE /ads/:id - invalid format: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 without authentication', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .delete(`/ads/${fakeId}`)
        .expect(401);

      const duration = Date.now() - startTime;
      console.log(`DELETE /ads/:id - unauthorized: ${duration}ms`);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle multiple list requests efficiently', async () => {
      const requests: Promise<any>[] = [];
      const startTime = Date.now();

      // Make 10 concurrent list requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/ads/list')
            .send({
              page: 1,
              limit: 20,
              category: 'VEHICLE',
            })
            .expect(201),
        );
      }

      await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / 10;

      console.log(`\n📈 Performance Benchmark:`);
      console.log(`   Total time for 10 concurrent requests: ${totalTime}ms`);
      console.log(`   Average time per request: ${avgTime.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(avgTime).toBeLessThan(1000); // Average should be under 1 second
    });

    it('should handle different filter combinations efficiently', async () => {
      const filterCombinations = [
        { category: 'VEHICLE' },
        { category: 'PROPERTY' },
        { minPrice: 100000, maxPrice: 500000 },
        { search: 'test', category: 'VEHICLE' },
        { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'DESC' },
      ];

      const results: Array<{
        filters: string;
        time: number;
        dataCount: number;
      }> = [];
      const startTime = Date.now();

      for (const filters of filterCombinations) {
        const requestStart = Date.now();
        const response = await request(app.getHttpServer())
          .post('/ads/list')
          .send(filters)
          .expect(201);

        const requestTime = Date.now() - requestStart;
        results.push({
          filters: Object.keys(filters).join(','),
          time: requestTime,
          dataCount: response.body.data.length,
        });
      }

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / filterCombinations.length;

      console.log(`\n📈 Filter Performance:`);
      console.log(
        `   Total time for ${filterCombinations.length} filter combinations: ${totalTime}ms`,
      );
      console.log(`   Average time per filter: ${avgTime.toFixed(2)}ms`);

      results.forEach((result) => {
        console.log(
          `   ${result.filters}: ${result.time}ms (${result.dataCount} items)`,
        );
      });

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
