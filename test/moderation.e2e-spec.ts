import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { disconnect } from 'mongoose';
import { AppModule } from '../src/app.module';

/**
 * Smoke + access-control e2e for the Moderation module. Verifies the routes
 * exist and are protected. (Full role-based flows require seeded admin tokens —
 * see test:setup-db.)
 */
describe('Moderation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await disconnect();
  });

  it('GET /moderation/suspensions requires authentication', () => {
    return request(app.getHttpServer()).get('/moderation/suspensions').expect(401);
  });

  it('GET /moderation/settings requires authentication', () => {
    return request(app.getHttpServer()).get('/moderation/settings').expect(401);
  });

  it('GET /moderation/audit-logs requires authentication', () => {
    return request(app.getHttpServer()).get('/moderation/audit-logs').expect(401);
  });

  it('POST /moderation/users/:id/strikes requires authentication', () => {
    return request(app.getHttpServer())
      .post('/moderation/users/507f1f77bcf86cd799439011/strikes')
      .send({ reason: 'test' })
      .expect(401);
  });

  it('GET /moderation/appeals requires authentication', () => {
    return request(app.getHttpServer()).get('/moderation/appeals').expect(401);
  });
});
