process.env.MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { UserType } from '../src/users/enums/user.types';

describe('Vehicle Manufacturers API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let userToken: string;
  let manufacturerId: string;

  const testAdmin = {
    name: 'Test Admin',
    email: 'admin@test.com',
    phoneNumber: '+919876543210',
    password: 'TestPassword123!',
    userType: UserType.ADMIN,
  };

  const testUser = {
    name: 'Test User',
    email: 'user@test.com',
    phoneNumber: '+919876543211',
    password: 'TestPassword123!',
    userType: UserType.USER,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());

    // Create test users and get tokens
    await createTestUsers();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up manufacturers collection before each test
    if (connection.db) {
      await connection.db.collection('manufacturers').deleteMany({
        name: { $regex: /^test-/ },
      });
    }
  });

  const createTestUsers = async () => {
    try {
      // Create admin user
      const adminResponse = await request(app.getHttpServer())
        .post('/users')
        .send(testAdmin)
        .expect(201);

      adminToken = `Bearer ${adminResponse.body.accessToken}`;

      // Create regular user
      const userResponse = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201);

      userToken = `Bearer ${userResponse.body.accessToken}`;

      console.log('✅ Test users created successfully');
    } catch (error) {
      console.error('❌ Failed to create test users:', error.response?.body || error.message);
      throw error;
    }
  };

  const cleanupTestData = async () => {
    try {
      // Clean up manufacturers
      if (connection.db) {
        await connection.db.collection('manufacturers').deleteMany({
          name: { $regex: /^test-/ },
        });

        // Clean up users
        await connection.db.collection('users').deleteMany({
          email: { $in: [testAdmin.email, testUser.email] },
        });
      }

      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Failed to cleanup test data:', error.message);
    }
  };

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
        .set('Authorization', adminToken)
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
          expect(res.body).toHaveProperty('isPremium');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');

          manufacturerId = res.body._id;
        });
    });

    it('should reject manufacturer creation without authentication', () => {
      const manufacturerData = {
        name: 'test-manufacturer-no-auth',
        displayName: 'Test Manufacturer No Auth',
        originCountry: 'India',
        description: 'A test manufacturer without auth',
        logo: 'https://example.com/logo.png',
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .send(manufacturerData)
        .expect(401);
    });

    it('should reject manufacturer creation with regular user token', () => {
      const manufacturerData = {
        name: 'test-manufacturer-user',
        displayName: 'Test Manufacturer User',
        originCountry: 'India',
        description: 'A test manufacturer with user token',
        logo: 'https://example.com/logo.png',
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', userToken)
        .send(manufacturerData)
        .expect(403);
    });

    it('should fail to create manufacturer with duplicate name', () => {
      const manufacturerData = {
        name: 'test-manufacturer-duplicate',
        displayName: 'Test Manufacturer Duplicate',
        originCountry: 'India',
        description: 'A test manufacturer for duplicate testing',
        logo: 'https://example.com/logo.png',
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', adminToken)
        .send(manufacturerData)
        .expect(201)
        .then(() => {
          return request(app.getHttpServer())
            .post('/vehicle-inventory/manufacturers')
            .set('Authorization', adminToken)
            .send(manufacturerData)
            .expect(400);
        });
    });

    it('should fail to create manufacturer with invalid data', () => {
      const invalidManufacturerData = {
        name: '', // Invalid empty name
        displayName: 'Test Manufacturer Invalid',
        originCountry: 'India',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', adminToken)
        .send(invalidManufacturerData)
        .expect(400);
    });

    it('should fail to create manufacturer with invalid logo URL', () => {
      const manufacturerData = {
        name: 'test-manufacturer-invalid-logo',
        displayName: 'Test Manufacturer Invalid Logo',
        originCountry: 'India',
        description: 'A test manufacturer with invalid logo',
        logo: 'invalid-url', // Invalid URL
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
      };

      return request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', adminToken)
        .send(manufacturerData)
        .expect(400);
    });
  });

  describe('GET /vehicle-inventory/manufacturers', () => {
    beforeAll(async () => {
      // Create a test manufacturer for listing tests
      const manufacturerData = {
        name: 'test-manufacturer-for-listing',
        displayName: 'Test Manufacturer For Listing',
        originCountry: 'India',
        description: 'A test manufacturer for listing tests',
        logo: 'https://example.com/logo.png',
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', adminToken)
        .send(manufacturerData)
        .expect(201);

      manufacturerId = response.body._id;
    });

    it('should get all manufacturers successfully', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
          expect(res.body).toHaveProperty('hasNext');
          expect(res.body).toHaveProperty('hasPrev');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should filter manufacturers by search term', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?search=test-manufacturer-for-listing')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          const found = res.body.data.some(
            (manufacturer: any) =>
              manufacturer.name === 'test-manufacturer-for-listing',
          );
          expect(found).toBe(true);
        });
    });

    it('should filter manufacturers by country', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?originCountry=India')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          const allFromIndia = res.body.data.every(
            (manufacturer: any) => manufacturer.originCountry === 'India',
          );
          expect(allFromIndia).toBe(true);
        });
    });

    it('should filter manufacturers by category', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?category=passenger_car')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter manufacturers by region', () => {
      return request(app.getHttpServer())
        .get('/vehicle-inventory/manufacturers?region=Asia')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
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
  });

  describe('GET /vehicle-inventory/manufacturers/:id', () => {
    it('should get manufacturer by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', manufacturerId);
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

  describe('PUT /vehicle-inventory/manufacturers/:id', () => {
    it('should update manufacturer successfully', () => {
      const updateData = {
        displayName: 'Updated Test Manufacturer',
        description: 'Updated description for testing',
        website: 'https://updated-testmanufacturer.com',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', adminToken)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', manufacturerId);
          expect(res.body).toHaveProperty('displayName', updateData.displayName);
          expect(res.body).toHaveProperty('description', updateData.description);
          expect(res.body).toHaveProperty('website', updateData.website);
          expect(res.body).toHaveProperty('name'); // Should remain unchanged
        });
    });

    it('should reject manufacturer update without authentication', () => {
      const updateData = {
        displayName: 'Unauthorized Update',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .send(updateData)
        .expect(401);
    });

    it('should reject manufacturer update with regular user token', () => {
      const updateData = {
        displayName: 'User Update Attempt',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', userToken)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent manufacturer', () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        displayName: 'Non-existent Update',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${fakeId}`)
        .set('Authorization', adminToken)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 for invalid update data', () => {
      const invalidUpdateData = {
        logo: 'invalid-url',
      };

      return request(app.getHttpServer())
        .put(`/vehicle-inventory/manufacturers/${manufacturerId}`)
        .set('Authorization', adminToken)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe('DELETE /vehicle-inventory/manufacturers/:id', () => {
    let deleteManufacturerId: string;

    beforeEach(async () => {
      // Create a manufacturer for deletion testing
      const manufacturerData = {
        name: `test-manufacturer-for-delete-${Date.now()}`,
        displayName: 'Test Manufacturer For Delete',
        originCountry: 'India',
        description: 'A test manufacturer for deletion testing',
        logo: 'https://example.com/logo.png',
        website: 'https://www.testmanufacturer.com',
        foundedYear: 1990,
        headquarters: 'Mumbai, India',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-inventory/manufacturers')
        .set('Authorization', adminToken)
        .send(manufacturerData)
        .expect(201);

      deleteManufacturerId = response.body._id;
    });

    it('should delete manufacturer successfully', () => {
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/manufacturers/${deleteManufacturerId}`)
        .set('Authorization', adminToken)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Manufacturer deleted successfully');
        })
        .then(() => {
          // Verify the manufacturer is no longer accessible
          return request(app.getHttpServer())
            .get(`/vehicle-inventory/manufacturers/${deleteManufacturerId}`)
            .expect(404);
        });
    });

    it('should reject manufacturer deletion without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/manufacturers/${deleteManufacturerId}`)
        .expect(401);
    });

    it('should reject manufacturer deletion with regular user token', () => {
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/manufacturers/${deleteManufacturerId}`)
        .set('Authorization', userToken)
        .expect(403);
    });

    it('should return 404 for non-existent manufacturer', () => {
      const fakeId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .delete(`/vehicle-inventory/manufacturers/${fakeId}`)
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', () => {
      return request(app.getHttpServer())
        .delete('/vehicle-inventory/manufacturers/invalid-id')
        .set('Authorization', adminToken)
        .expect(400);
    });
  });
});
