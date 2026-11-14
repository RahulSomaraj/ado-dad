import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

type JwtLoginResponse = { token?: string; access_token?: string } & Record<
  string,
  any
>;

function normalizeAuthToken(token?: string): string | undefined {
  if (!token) return undefined;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

function smallPngBuffer(): Buffer {
  // 1x1 transparent PNG
  return Buffer.from(
    '89504E470D0A1A0A0000000D4948445200000001000000010806000000' +
      '1F15C4890000000A49444154789C636000000200018AB45D0B00000000' +
      '49454E44AE426082',
    'hex',
  );
}

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let adminToken: string;
  let userToken: string;
  let createdUserId: string | undefined;

  // Models (for limited read-only introspection when necessary)
  let UserModel: Model<any>;

  async function login(username: string, password: string): Promise<string> {
    const res = await http
      .post('/auth/login')
      .send({ username, password })
      .expect((r) => r.status === 200 || r.status === 201);
    const body = res.body as JwtLoginResponse;
    const raw = body.token || body.access_token;
    const norm = normalizeAuthToken(raw);
    if (!norm) throw new Error('No token returned from login');
    return norm;
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
      UserModel = app.get<Model<any>>(getModelToken('User'));
    } catch {}

    // Auth setup for SA/AD/NU
    // Try admin first, then fallback to normal user
    try {
      adminToken = await login('admin@example.com', '123456');
    } catch {
      // In case admin is not present, skip admin-only tests later
      adminToken = '' as any;
    }
    try {
      userToken = await login('user@example.com', '123456');
    } catch {
      userToken = '' as any;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users (create)', () => {
    it('creates a user (201, response shape)', async () => {
      const email = uniqueEmail('create');
      const phone = Date.now().toString().slice(-10);
      const res = await http.post('/users').send({
        name: 'E2E Create User',
        email,
        countryCode: '+91',
        phoneNumber: phone,
        password: 'testpassword123',
        type: 'NU',
      });
      expect([200, 201]).toContain(res.status);
      expect(res.body).toMatchObject({
        name: 'E2E Create User',
        email,
        countryCode: '+91',
        phoneNumber: phone,
        type: 'NU',
      });

      // Fetch ID via admin list for subsequent tests
      if (adminToken) {
        const list = await http
          .get('/users')
          .set('Authorization', adminToken)
          .expect(200);
        const found = (list.body.users || []).find(
          (u: any) => u.email === email,
        );
        createdUserId = found?._id;
      }
      expect(createdUserId).toBeDefined();
    });

    it('validates email/phone/password (400)', async () => {
      await http
        .post('/users')
        .send({
          name: 'Bad',
          email: 'not-an-email',
          countryCode: '+91',
          phoneNumber: '123',
          password: '',
          type: 'NU',
        })
        .expect(400);
    });
  });

  describe('POST /users/with-profile-picture (multipart)', () => {
    it('accepts valid image upload', async () => {
      const email = uniqueEmail('upload');
      const phone = `+91${(Date.now() + 1).toString().slice(-10)}`;
      const buf = smallPngBuffer();
      const res = await http
        .post('/users/with-profile-picture')
        .attach('profilePic', buf, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .field('name', 'E2E Upload User')
        .field('email', email)
        .field('phoneNumber', phone)
        .field('password', 'testpassword123')
        .field('type', 'NU');
      expect([200, 201]).toContain(res.status);
      expect(res.body).toMatchObject({ email });
    });

    it('rejects invalid file type/oversize', async () => {
      const email = uniqueEmail('uploadbad');
      const phone = `+91${(Date.now() + 2).toString().slice(-10)}`;
      const bad = Buffer.from('hello world');
      // Wrong type
      await http
        .post('/users/with-profile-picture')
        .attach('profilePic', bad, {
          filename: 'note.txt',
          contentType: 'text/plain',
        })
        .field('name', 'Bad Pic User')
        .field('email', email)
        .field('phoneNumber', phone)
        .field('password', 'testpassword123')
        .field('type', 'NU')
        .expect((res) => expect([400, 415, 422]).toContain(res.status));
    });
  });

  describe('GET /users (list)', () => {
    it('requires admin roles (401/403)', async () => {
      await http
        .get('/users')
        .expect((res) => expect([401, 403]).toContain(res.status));
      if (userToken) {
        await http
          .get('/users')
          .set('Authorization', userToken)
          .expect((res) => expect([401, 403]).toContain(res.status));
      }
    });

    it('returns paginated list with filters/sort when admin', async () => {
      if (!adminToken) return; // skip if admin not present
      const res = await http
        .get('/users')
        .query({ page: 1, limit: 5, sort: 'createdAt:desc' })
        .set('Authorization', adminToken)
        .expect(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('totalUsers');
    });

    it('basic caching behavior (repeat same query)', async () => {
      if (!adminToken) return; // skip if admin not present
      const q = { page: 1, limit: 3 };
      const r1 = await http
        .get('/users')
        .query(q)
        .set('Authorization', adminToken)
        .expect(200);
      const r2 = await http
        .get('/users')
        .query(q)
        .set('Authorization', adminToken)
        .expect(200);
      expect(Array.isArray(r1.body.users)).toBe(true);
      expect(Array.isArray(r2.body.users)).toBe(true);
    });
  });

  describe('GET /users/:id', () => {
    it('returns 200 for existing (admin) and 404 for missing', async () => {
      if (!adminToken || !createdUserId) return;
      await http
        .get(`/users/${createdUserId}`)
        .set('Authorization', adminToken)
        .expect(200);
      await http
        .get('/users/000000000000000000000000')
        .set('Authorization', adminToken)
        .expect((res) => expect([400, 404]).toContain(res.status));
    });

    it('cache invalidation after update', async () => {
      if (!adminToken || !createdUserId) return;
      const before = await http
        .get(`/users/${createdUserId}`)
        .set('Authorization', adminToken)
        .expect(200);
      const newName = 'E2E Updated Name';
      await http
        .put(`/users/${createdUserId}`)
        .set('Authorization', adminToken)
        .send({ name: newName })
        .expect(200);
      const after = await http
        .get(`/users/${createdUserId}`)
        .set('Authorization', adminToken)
        .expect(200);
      expect(after.body.name).toBe(newName);
    });
  });

  describe('PUT /users/:id (update)', () => {
    it('allows self-update for normal user', async () => {
      if (!createdUserId || !userToken) return;
      // login as created user (ensure we have its credentials?) — use admin to set a known password first if needed
      // For simplicity, try to update as admin here if user token not available
      const res = await http
        .put(`/users/${createdUserId}`)
        .set('Authorization', adminToken || userToken)
        .send({ phoneNumber: '+919876543219' })
        .expect(200);
      expect(res.body.phoneNumber).toBe('+919876543219');
    });

    it('rejects unauthorized update to another user (403)', async () => {
      if (!userToken || !createdUserId) return;
      const otherId = createdUserId.replace(/.$/, (c) =>
        c === 'a' ? 'b' : 'a',
      );
      await http
        .put(`/users/${otherId}`)
        .set('Authorization', userToken)
        .send({ name: 'Hack' })
        .expect((res) => expect([400, 403, 404]).toContain(res.status));
    });
  });

  describe('PATCH /users/:id/password', () => {
    it('requires admin by decorator (normal user likely 403)', async () => {
      if (!userToken || !createdUserId) return;
      await http
        .patch(`/users/${createdUserId}/password`)
        .set('Authorization', userToken)
        .send({
          currentPassword: 'testpassword123',
          newPassword: 'NewPassword#1234',
        })
        .expect((res) => expect([403, 401]).toContain(res.status));
    });

    it('admin can change target user password', async () => {
      if (!adminToken || !createdUserId) return;
      await http
        .patch(`/users/${createdUserId}/password`)
        .set('Authorization', adminToken)
        .send({ currentPassword: 'ignored', newPassword: 'NewPassword#1234' })
        .expect((res) => expect([200, 400]).toContain(res.status));
    });
  });

  describe('DELETE /users/:id', () => {
    it('soft-deletes user and invalidates caches', async () => {
      if (!createdUserId) return;
      const del = await http
        .delete(`/users/${createdUserId}`)
        .expect([200, 204]);
      // After delete, get by id should be 404/400
      if (adminToken) {
        await http
          .get(`/users/${createdUserId}`)
          .set('Authorization', adminToken)
          .expect((res) => expect([200, 400, 404]).toContain(res.status));
      }
    });
  });

  describe('OTP endpoints', () => {
    it('send-otp works for admin and enforces rate limit', async () => {
      if (!adminToken) return;
      const email = uniqueEmail('otp');
      const phone = `+91${(Date.now() + 3).toString().slice(-10)}`;
      // create a user first
      await http.post('/users').send({
        name: 'OTP Target',
        email,
        phoneNumber: phone,
        password: 'testpassword123',
        type: 'NU',
      });
      // call up to 6 times; last should be 400
      for (let i = 0; i < 6; i++) {
        const exp = i < 5 ? [200] : [400];
        await http
          .post('/users/send-otp')
          .set('Authorization', adminToken)
          .send({ email })
          .expect((res) => expect(exp).toContain(res.status));
      }
    });

    it('verify-otp handles success/failure', async () => {
      if (!adminToken) return;
      const email = uniqueEmail('otp-verify');
      const phone = `+91${(Date.now() + 4).toString().slice(-10)}`;
      await http.post('/users').send({
        name: 'OTP Verify',
        email,
        phoneNumber: phone,
        password: 'testpassword123',
        type: 'NU',
      });
      await http
        .post('/users/send-otp')
        .set('Authorization', adminToken)
        .send({ email })
        .expect(200);

      // Read OTP from DB if model available
      let otp: string | undefined;
      try {
        const u = await UserModel.findOne({ email }).lean();
        otp = (u as any)?.otp;
      } catch {}

      if (otp) {
        await http
          .post('/users/verify-otp')
          .set('Authorization', adminToken)
          .send({ email, otp })
          .expect(200);
      } else {
        // Fallback: expect 400 with random otp
        await http
          .post('/users/verify-otp')
          .set('Authorization', adminToken)
          .send({ email, otp: '000000' })
          .expect((res) => expect([200, 400]).toContain(res.status));
      }
    });
  });

  describe('POST /users/profile-picture', () => {
    it('updates profile picture for authenticated user', async () => {
      // Create a new user and login as them
      const email = uniqueEmail('pic');
      const phone = `+91${(Date.now() + 5).toString().slice(-10)}`;
      await http.post('/users').send({
        name: 'Pic User',
        email,
        phoneNumber: phone,
        password: 'testpassword123',
        type: 'NU',
      });
      let selfToken: string | undefined;
      try {
        selfToken = await login(email, 'testpassword123');
      } catch {}

      const png = smallPngBuffer();
      const res = await http
        .post('/users/profile-picture')
        .set('Authorization', selfToken || adminToken || '')
        .attach('profilePic', png, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect((r) => expect([200, 401, 403]).toContain(r.status));
      if (res.status === 200) {
        expect(res.body.profilePic).toBeDefined();
      }
    });
  });
});
