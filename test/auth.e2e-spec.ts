import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, connect, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Authentication API (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let refreshToken: string;

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
    if (!mongoConnection.db)
      throw new Error('Mongo connection not initialized');
    await mongoConnection.db.collection('users').deleteMany({});
    await mongoConnection.db.collection('refreshtokens').deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', () => {
      const userData = {
        phone: '1234567890',
        password: 'testPassword123',
        name: 'Test User',
        email: 'test@example.com',
        userType: 'BUYER',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('User registered successfully');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('phone', userData.phone);
          expect(res.body.user).toHaveProperty('name', userData.name);
          expect(res.body.user).toHaveProperty('email', userData.email);
          expect(res.body.user).toHaveProperty('userType', userData.userType);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should fail to register with invalid phone number', () => {
      const userData = {
        phone: 'invalid',
        password: 'testPassword123',
        name: 'Test User',
        email: 'test@example.com',
        userType: 'BUYER',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should fail to register with weak password', () => {
      const userData = {
        phone: '1234567890',
        password: '123',
        name: 'Test User',
        email: 'test@example.com',
        userType: 'BUYER',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should fail to register with duplicate phone number', async () => {
      const userData = {
        phone: '1234567890',
        password: 'testPassword123',
        name: 'Test User',
        email: 'test@example.com',
        userType: 'BUYER',
      };

      // Register first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same phone number
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        phone: '1234567890',
        password: 'testPassword123',
        name: 'Test User',
        email: 'test@example.com',
        userType: 'BUYER',
      };

      await request(app.getHttpServer()).post('/auth/register').send(userData);
    });

    it('should login successfully with valid credentials', () => {
      const loginData = {
        phone: '1234567890',
        password: 'testPassword123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('phone', loginData.phone);
          expect(res.body.user).not.toHaveProperty('password');

          // Store tokens for other tests
          authToken = res.body.access_token;
          refreshToken = res.body.refresh_token;
        });
    });

    it('should fail to login with invalid phone number', () => {
      const loginData = {
        phone: '9999999999',
        password: 'testPassword123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail to login with wrong password', () => {
      const loginData = {
        phone: '1234567890',
        password: 'wrongPassword',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail to login with missing credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      // Create a test user and login
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

      refreshToken = loginResponse.body.refresh_token;
    });

    it('should refresh access token successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body.access_token).not.toBe(refreshToken);
        });
    });

    it('should fail to refresh with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid_token' })
        .expect(401);
    });

    it('should fail to refresh with missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      // Create a test user and login
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
      refreshToken = loginResponse.body.refresh_token;
    });

    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ refresh_token: refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should fail to logout without authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    beforeEach(async () => {
      // Create a test user and login
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

    it('should get user profile successfully', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('phone', '1234567890');
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).toHaveProperty('email', 'test@example.com');
          expect(res.body).toHaveProperty('userType', 'BUYER');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail to get profile without authentication', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail to get profile with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });
});
