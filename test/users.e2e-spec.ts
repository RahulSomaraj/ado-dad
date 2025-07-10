import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let userId: string;

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
      await mongoConnection.db.collection('users').deleteMany({});
      await mongoConnection.db.collection('refreshtokens').deleteMany({});
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
        username: '1212121212',
        password: '123456',
      });

    authToken = loginResponse.body.access_token;
    userId = loginResponse.body.user._id;
  });

  describe('GET /users', () => {
    it('should get all users successfully', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('_id');
          expect(res.body[0]).toHaveProperty('phone');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('email');
          expect(res.body[0]).toHaveProperty('userType');
          expect(res.body[0]).not.toHaveProperty('password');
        });
    });

    it('should fail to get users without authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should get users with pagination', () => {
      return request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter users by userType', () => {
      return request(app.getHttpServer())
        .get('/users?userType=BUYER')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((user) => {
            expect(user.userType).toBe('BUYER');
          });
        });
    });

    it('should search users by name', () => {
      return request(app.getHttpServer())
        .get('/users?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((user) => {
            expect(user.name).toMatch(/Test/i);
          });
        });
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', userId);
          expect(res.body).toHaveProperty('phone', '1234567890');
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).toHaveProperty('email', 'test@example.com');
          expect(res.body).toHaveProperty('userType', 'BUYER');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail to get user with invalid ID', () => {
      return request(app.getHttpServer())
        .get('/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should fail to get non-existent user', () => {
      const fakeId = '507f1f77bcf86cd799439011';
      return request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should fail to get user without authentication', () => {
      return request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user successfully', () => {
      const updateData = {
        name: 'Updated Test User',
        email: 'updated@example.com',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      };

      return request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', userId);
          expect(res.body).toHaveProperty('name', updateData.name);
          expect(res.body).toHaveProperty('email', updateData.email);
          expect(res.body).toHaveProperty('address', updateData.address);
          expect(res.body).toHaveProperty('city', updateData.city);
          expect(res.body).toHaveProperty('state', updateData.state);
          expect(res.body).toHaveProperty('pincode', updateData.pincode);
        });
    });

    it('should fail to update user with invalid data', () => {
      const updateData = {
        email: 'invalid-email',
      };

      return request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should fail to update non-existent user', () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        name: 'Updated Test User',
      };

      return request(app.getHttpServer())
        .put(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail to update user without authentication', () => {
      const updateData = {
        name: 'Updated Test User',
      };

      return request(app.getHttpServer())
        .put(`/users/${userId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('GET /users/profile/me', () => {
    it('should get current user profile successfully', () => {
      return request(app.getHttpServer())
        .get('/users/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', userId);
          expect(res.body).toHaveProperty('phone', '1234567890');
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).toHaveProperty('email', 'test@example.com');
          expect(res.body).toHaveProperty('userType', 'BUYER');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail to get profile without authentication', () => {
      return request(app.getHttpServer()).get('/users/profile/me').expect(401);
    });
  });

  describe('PUT /users/profile/me', () => {
    it('should update current user profile successfully', () => {
      const updateData = {
        name: 'Updated Test User',
        email: 'updated@example.com',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      };

      return request(app.getHttpServer())
        .put('/users/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id', userId);
          expect(res.body).toHaveProperty('name', updateData.name);
          expect(res.body).toHaveProperty('email', updateData.email);
          expect(res.body).toHaveProperty('address', updateData.address);
          expect(res.body).toHaveProperty('city', updateData.city);
          expect(res.body).toHaveProperty('state', updateData.state);
          expect(res.body).toHaveProperty('pincode', updateData.pincode);
        });
    });

    it('should fail to update profile with invalid data', () => {
      const updateData = {
        email: 'invalid-email',
      };

      return request(app.getHttpServer())
        .put('/users/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should fail to update profile without authentication', () => {
      const updateData = {
        name: 'Updated Test User',
      };

      return request(app.getHttpServer())
        .put('/users/profile/me')
        .send(updateData)
        .expect(401);
    });
  });
});
