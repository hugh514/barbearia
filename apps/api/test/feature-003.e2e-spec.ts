import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomerOrigin } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Env } from '../src/common/config/env.schema';
import { CLIENTE_CADASTRADO } from '../src/common/events/customer.events';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 003 — Customer CRM (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let accessToken: string;
  let tenantId: string;
  let internalApiKey: string;
  let loginIpCounter = 0;

  const adminEmail = 'admin@barbearia.example';
  const adminPassword = 'admin123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    eventEmitter = app.get(EventEmitter2);
    internalApiKey = app
      .get(ConfigService<Env, true>)
      .get('INTERNAL_API_KEY', { infer: true });

    await app.init();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'barbearia-modelo' },
    });
    expect(tenant).toBeTruthy();
    tenantId = tenant!.id;

    const loginRes = await login();
    accessToken = loginRes.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.1.${loginIpCounter}.1`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return res.body;
  }

  describe('T003-06 T003-07 CRUD — create customer', () => {
    it('creates customer with tenant inferred from JWT', async () => {
      const phone = `119${Date.now().toString().slice(-8)}`;

      const res = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Cliente Teste',
          phone,
          instagram: '@clienteteste',
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.tenantId).toBe(tenantId);
      expect(res.body.phone).toBe(phone);
      expect(res.body.instagramUser).toBe('@clienteteste');
    });

    it('T003-12 returns 409 for duplicate phone in tenant', async () => {
      const phone = `118${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Primeiro Cliente',
          phone,
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Segundo Cliente',
          phone,
          origin: CustomerOrigin.MANUAL,
        })
        .expect(409);
    });
  });

  describe('T003-08 T003-09 T003-13 Search and pagination', () => {
    const searchPhone = '11933332222';

    beforeAll(async () => {
      await prisma.customer.upsert({
        where: {
          tenantId_phone: { tenantId, phone: searchPhone },
        },
        update: {},
        create: {
          tenantId,
          name: 'Busca Parcial',
          phone: searchPhone,
          origin: CustomerOrigin.MANUAL,
        },
      });
    });

    it('finds customer by partial phone', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: '3333' })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        res.body.data.some((c: { phone: string }) => c.phone === searchPhone),
      ).toBe(true);
    });

    it('returns paginated response with meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, perPage: 2 })
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toMatchObject({
        page: 1,
        perPage: 2,
        total: expect.any(Number),
        lastPage: expect.any(Number),
      });
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('T003-10 T003-14 Tenant isolation', () => {
    it('returns 404 when accessing customer from another tenant', async () => {
      const otherTenant = await prisma.tenant.upsert({
        where: { slug: 'other-tenant-003' },
        update: {},
        create: {
          name: 'Other Tenant 003',
          slug: 'other-tenant-003',
          active: true,
        },
      });

      const otherCustomer = await prisma.customer.create({
        data: {
          tenantId: otherTenant.id,
          name: 'Other Tenant Customer',
          phone: `117${Date.now().toString().slice(-8)}`,
          origin: CustomerOrigin.MANUAL,
        },
      });

      await request(app.getHttpServer())
        .get(`/customers/${otherCustomer.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('T003-11 PATCH customer', () => {
    it('updates only provided fields', async () => {
      const phone = `116${Date.now().toString().slice(-8)}`;

      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Antes do Patch',
          phone,
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Depois do Patch' })
        .expect(200);

      expect(updated.body.name).toBe('Depois do Patch');
      expect(updated.body.phone).toBe(phone);
    });
  });

  describe('T003-15 T003-16 T003-18 T003-19 Upsert CRM', () => {
    it('returns existing customer without duplicate on upsert', async () => {
      const phone = `115${Date.now().toString().slice(-8)}`;

      const created = await request(app.getHttpServer())
        .post('/customers/upsert')
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .send({
          phone,
          name: 'Upsert Original',
          origin: CustomerOrigin.WHATSAPP,
        })
        .expect(201);

      expect(created.body.created).toBe(true);

      const existing = await request(app.getHttpServer())
        .post('/customers/upsert')
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .send({
          phone,
          name: 'Nome Diferente',
          origin: CustomerOrigin.WHATSAPP,
        })
        .expect(201);

      expect(existing.body.created).toBe(false);
      expect(existing.body.id).toBe(created.body.id);
      expect(existing.body.name).toBe('Upsert Original');

      const count = await prisma.customer.count({
        where: { tenantId, phone },
      });
      expect(count).toBe(1);
    });

    it('creates customer and emits CLIENTE_CADASTRADO event', async () => {
      const phone = `114${Date.now().toString().slice(-8)}`;
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const res = await request(app.getHttpServer())
        .post('/customers/upsert')
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .send({
          phone,
          name: 'Novo via CRM',
          origin: CustomerOrigin.INSTAGRAM,
        })
        .expect(201);

      expect(res.body.created).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        CLIENTE_CADASTRADO,
        expect.objectContaining({
          customerId: res.body.id,
          tenantId,
          phone,
        }),
      );

      emitSpy.mockRestore();
    });

    it('rejects upsert without valid internal API key', async () => {
      await request(app.getHttpServer())
        .post('/customers/upsert')
        .set('X-Internal-Key', 'invalid-key')
        .set('X-Tenant-Id', tenantId)
        .send({
          phone: '11300000000',
          origin: CustomerOrigin.WHATSAPP,
        })
        .expect(401);
    });
  });

  describe('T003-20 T003-21 History and conversations stubs', () => {
    it('returns empty paginated history', async () => {
      const phone = `112${Date.now().toString().slice(-8)}`;

      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Histórico Stub',
          phone,
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/customers/${created.body.id}/history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('returns empty paginated conversations', async () => {
      const phone = `111${Date.now().toString().slice(-8)}`;

      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Conversas Stub',
          phone,
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/customers/${created.body.id}/conversations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('T003-24 T003-25 T003-26 T003-27 T003-28 Final validation', () => {
    it('GET /customers/:id returns full profile', async () => {
      const phone = `110${Date.now().toString().slice(-8)}`;

      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Perfil Completo',
          phone,
          instagram: '@perfil',
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.name).toBe('Perfil Completo');
      expect(res.body.origin).toBe(CustomerOrigin.MANUAL);
      expect(res.body.recentAppointments).toEqual([]);
      expect(res.body.activePlan).toBeNull();
    });

    it('search works across name and instagram', async () => {
      const uniqueName = `UniqueSearch${Date.now()}`;

      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: uniqueName,
          phone: `109${Date.now().toString().slice(-8)}`,
          instagram: '@uniqueinsta',
          origin: CustomerOrigin.MANUAL,
        })
        .expect(201);

      const byName = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: uniqueName })
        .expect(200);

      expect(byName.body.data.length).toBeGreaterThanOrEqual(1);

      const byInstagram = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: 'uniqueinsta' })
        .expect(200);

      expect(byInstagram.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
