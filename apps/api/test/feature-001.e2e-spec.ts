import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature 001 — Core Foundation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('V001-15 GET /health', () => {
    it('returns 200 with database and redis up', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.info?.database?.status).toBe('up');
      expect(res.body.info?.redis?.status).toBe('up');
    });
  });

  describe('V001-18 V001-19 Correlation ID', () => {
    it('sets x-correlation-id when absent', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(typeof res.headers['x-correlation-id']).toBe('string');
    });

    it('echoes custom x-correlation-id', async () => {
      const customId = 'e2e-correlation-001';
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', customId)
        .expect(200);

      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('V001-20 Standard error response', () => {
    it('POST /tenants/validate with empty body returns 400 with correlationId', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants/validate')
        .send({})
        .expect(400);

      expect(res.body.correlationId).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.path).toBe('/tenants/validate');
    });
  });
});
