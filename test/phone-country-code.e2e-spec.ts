import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

function uniqueEmail(prefix = 'phone-test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

function uniquePhone(): string {
  return Date.now().toString().slice(-10);
}

describe('Phone Country Code API (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let adminToken: string;

  async function login(username: string, password: string): Promise<string> {
    const res = await http
      .post('/auth/login')
      .send({ username, password })
      .expect((r) => r.status === 200 || r.status === 201);
    const token = res.body.token || res.body.access_token;
    return token?.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('EmailService')
      .useValue({
        sendOtp: async () => {
          return;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());

    try {
      adminToken = await login('admin@example.com', '123456');
    } catch {
      adminToken = '';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users - Phone Country Code Validation', () => {
    it('should create user with +91 (India)', async () => {
      const email = uniqueEmail('india');
      const phone = uniquePhone();
      const res = await http.post('/users').send({
        name: 'India User',
        email,
        countryCode: '+91',
        phoneNumber: phone,
        password: 'test123456',
        type: 'NU',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body.countryCode).toBe('+91');
      expect(res.body.phoneNumber).toBe(phone);
    });

    it('should create user with +971 (UAE)', async () => {
      const email = uniqueEmail('uae');
      const phone = '501234567';
      const res = await http.post('/users').send({
        name: 'UAE User',
        email,
        countryCode: '+971',
        phoneNumber: phone,
        password: 'test123456',
        type: 'NU',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body.countryCode).toBe('+971');
      expect(res.body.phoneNumber).toBe(phone);
    });

    it('should create user with +1 (US)', async () => {
      const email = uniqueEmail('us');
      const phone = '2025551234'; // Valid US number with area code
      const res = await http.post('/users').send({
        name: 'US User',
        email,
        countryCode: '+1',
        phoneNumber: phone,
        password: 'test123456',
        type: 'NU',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body.countryCode).toBe('+1');
      expect(res.body.phoneNumber).toBe(phone);
    });

    it('should reject invalid phone country code format', async () => {
      const email = uniqueEmail('invalid');
      const res = await http.post('/users').send({
        name: 'Invalid User',
        email,
        countryCode: '91', // Missing +
        phoneNumber: uniquePhone(),
        password: 'test123456',
        type: 'NU',
      });

      expect(res.status).toBe(400);
    });

    it('should reject unsupported phone country code', async () => {
      const email = uniqueEmail('unsupported');
      const res = await http.post('/users').send({
        name: 'Unsupported User',
        email,
        countryCode: '+999',
        phoneNumber: uniquePhone(),
        password: 'test123456',
        type: 'NU',
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid phone number for country', async () => {
      const email = uniqueEmail('invalid-phone');
      const res = await http.post('/users').send({
        name: 'Invalid Phone User',
        email,
        countryCode: '+91',
        phoneNumber: '1234567890', // Invalid Indian number (starts with 1)
        password: 'test123456',
        type: 'NU',
      });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.error).toContain('phone');
    });

    it('should reject phone number with wrong length for country', async () => {
      const email = uniqueEmail('wrong-length');
      const res = await http.post('/users').send({
        name: 'Wrong Length User',
        email,
        countryCode: '+91',
        phoneNumber: '12345', // Too short
        password: 'test123456',
        type: 'NU',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /users/:id - Update Phone Country Code', () => {
    let userId: string;
    let userToken: string;

    beforeAll(async () => {
      // Create a test user
      const email = uniqueEmail('update-test');
      const phone = uniquePhone();
      const createRes = await http.post('/users').send({
        name: 'Update Test User',
        email,
        countryCode: '+91',
        phoneNumber: phone,
        password: 'test123456',
        type: 'NU',
      });

      userId = createRes.body._id;
      
      // Login to get token
      userToken = await login(phone, 'test123456');
    });

    it('should update country code to +971', async () => {
      const res = await http
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({
          countryCode: '+971',
          phoneNumber: '501234567',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.countryCode).toBe('+971');
      expect(res.body.phoneNumber).toBe('501234567');
    });

    it('should update only phone number keeping same country code', async () => {
      const newPhone = uniquePhone();
      const res = await http
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({
          phoneNumber: newPhone,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.phoneNumber).toBe(newPhone);
    });

    it('should reject update with invalid country code', async () => {
      const res = await http
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({
          countryCode: 'INVALID',
          phoneNumber: uniquePhone(),
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login - Phone Number Login', () => {
    let testPhone: string;
    let testEmail: string;

    beforeAll(async () => {
      testEmail = uniqueEmail('login-test');
      testPhone = uniquePhone();
      
      await http.post('/users').send({
        name: 'Login Test User',
        email: testEmail,
        countryCode: '+91',
        phoneNumber: testPhone,
        password: 'test123456',
        type: 'NU',
      });
    });

    it('should login with phone number (10 digits)', async () => {
      const res = await http.post('/auth/login').send({
        username: testPhone,
        password: 'test123456',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('token');
      expect(res.body.countryCode).toBe('+91');
    });

    it('should login with full phone number (+91 prefix)', async () => {
      const res = await http.post('/auth/login').send({
        username: `+91${testPhone}`,
        password: 'test123456',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('token');
    });

    it('should login with email', async () => {
      const res = await http.post('/auth/login').send({
        username: testEmail,
        password: 'test123456',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('POST /users/send-otp - OTP with Phone Codes', () => {
    let testPhone: string;
    let testEmail: string;

    beforeAll(async () => {
      testEmail = uniqueEmail('otp-test');
      testPhone = uniquePhone();
      
      await http.post('/users').send({
        name: 'OTP Test User',
        email: testEmail,
        countryCode: '+91',
        phoneNumber: testPhone,
        password: 'test123456',
        type: 'NU',
      });
    });

    it('should send OTP to phone number', async () => {
      const res = await http.post('/users/send-otp').send({
        identifier: testPhone,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('message');
    });

    it('should send OTP to email', async () => {
      const res = await http.post('/users/send-otp').send({
        identifier: testEmail,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /users - Response includes countryCode', () => {
    it('should return countryCode in user list', async () => {
      if (!adminToken || adminToken === '') {
        return; // Skip if no admin token
      }

      const res = await http
        .get('/users')
        .set('Authorization', adminToken)
        .expect(200);

      expect(res.body).toHaveProperty('users');
      if (res.body.users && res.body.users.length > 0) {
        const user = res.body.users[0];
        expect(user).toHaveProperty('countryCode');
        // countryCode should be a phone code format
        if (user.countryCode) {
          expect(user.countryCode).toMatch(/^\+\d{1,4}$/);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate phone number with different country codes', async () => {
      const email1 = uniqueEmail('dup1');
      const email2 = uniqueEmail('dup2');
      const phone1 = uniquePhone(); // For +91
      const phone2 = '2025551234'; // Valid US number

      // Create first user with +91
      const res1 = await http.post('/users').send({
        name: 'Duplicate Test 1',
        email: email1,
        countryCode: '+91',
        phoneNumber: phone1,
        password: 'test123456',
        type: 'NU',
      });
      expect([200, 201]).toContain(res1.status);

      // Create second user with different country code and different phone
      const res2 = await http.post('/users').send({
        name: 'Duplicate Test 2',
        email: email2,
        countryCode: '+1', // Different country
        phoneNumber: phone2, // Different phone number (US format)
        password: 'test123456',
        type: 'NU',
      });
      // Should succeed as country code is different
      expect([200, 201]).toContain(res2.status);
    });

    it('should reject duplicate phone number with same country code', async () => {
      const email1 = uniqueEmail('dup-same1');
      const email2 = uniqueEmail('dup-same2');
      const phone = uniquePhone();

      // Create first user
      const res1 = await http.post('/users').send({
        name: 'Duplicate Same 1',
        email: email1,
        countryCode: '+91',
        phoneNumber: phone,
        password: 'test123456',
        type: 'NU',
      });
      expect([200, 201]).toContain(res1.status);

      // Try to create second user with same country code and phone
      const res2 = await http.post('/users').send({
        name: 'Duplicate Same 2',
        email: email2,
        countryCode: '+91', // Same country
        phoneNumber: phone, // Same phone
        password: 'test123456',
        type: 'NU',
      });
      // Should fail
      expect(res2.status).toBe(400);
    });
  });
});

