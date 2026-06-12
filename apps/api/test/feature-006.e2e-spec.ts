import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PlanStatus, SubscriptionStatus } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  PLANO_ASSINADO,
  PLANO_CANCELADO,
} from '../src/common/events/subscription.events';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 006 — Plans & Subscriptions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let accessToken: string;
  let tenantId: string;
  let loginIpCounter = 0;

  const adminEmail = 'admin@barbearia.example';
  const adminPassword = 'admin123';
  const internalApiKey = 'dev-internal-api-key-change-in-production';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    eventEmitter = app.get(EventEmitter2);

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
      .set('X-Forwarded-For', `10.6.${loginIpCounter}.1`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return res.body;
  }

  async function createCustomer(): Promise<string> {
    const phone = `116${Date.now().toString().slice(-8)}`;
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cliente Plano',
        phone,
        origin: 'MANUAL',
      })
      .expect(201);

    return res.body.id as string;
  }

  async function createPlan(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Plano Teste ${Date.now()}`,
        description: 'Plano para testes',
        priceCents: 9900,
        intervalDays: 30,
        benefits: ['2 cortes/mês'],
        active: true,
      })
      .expect(201);

    return res.body.id as string;
  }

  describe('T006-03 T006-04 T006-05 T006-06 T006-07 Plans CRUD', () => {
    it('creates, lists, updates and soft-disables a plan', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Plano Premium',
          description: 'Benefícios exclusivos',
          priceCents: 15000,
          intervalDays: 30,
          benefits: ['4 cortes/mês', 'Barba grátis'],
          active: true,
        })
        .expect(201);

      expect(createRes.body.priceCents).toBe(15000);
      expect(createRes.body.tenantId).toBe(tenantId);

      const listRes = await request(app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ active: 'true' })
        .expect(200);

      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const detailRes = await request(app.getHttpServer())
        .get(`/plans/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(detailRes.body.name).toBe('Plano Premium');

      const updateRes = await request(app.getHttpServer())
        .patch(`/plans/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ priceCents: 16000 })
        .expect(200);

      expect(updateRes.body.priceCents).toBe(16000);

      const disableRes = await request(app.getHttpServer())
        .delete(`/plans/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(disableRes.body.active).toBe(false);
    });
  });

  describe('T006-08 T006-09 T006-10 T006-11 T006-12 T006-13 Subscriptions', () => {
    it('creates active subscription via backoffice and emits PLANO_ASSINADO', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const res = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, planId })
        .expect(201);

      expect(res.body.status).toBe(SubscriptionStatus.ATIVO);
      expect(res.body.startedAt).toBeDefined();
      expect(res.body.nextBillingAt).toBeDefined();
      expect(res.body.plan).toMatchObject({ id: planId });
      expect(res.body.customer).toMatchObject({ id: customerId });

      expect(emitSpy).toHaveBeenCalledWith(
        PLANO_ASSINADO,
        expect.objectContaining({
          subscriptionId: res.body.id,
          tenantId,
          customerId,
          planId,
        }),
      );

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      expect(customer?.planStatus).toBe(PlanStatus.ACTIVE);

      emitSpy.mockRestore();
    });

    it('lists subscriptions with filters', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();

      const created = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, planId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          customerId,
          status: SubscriptionStatus.ATIVO,
          page: 1,
          perPage: 20,
        })
        .expect(200);

      const ids = res.body.data.map((item: { id: string }) => item.id);
      expect(ids).toContain(created.body.id);
    });

    it('activates, suspends and renews via internal API key', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();

      const pending = await prisma.subscription.create({
        data: {
          tenantId,
          customerId,
          planId,
          status: SubscriptionStatus.PENDENTE,
        },
      });

      await prisma.customer.update({
        where: { id: customerId },
        data: { planStatus: PlanStatus.PENDING },
      });

      const activated = await request(app.getHttpServer())
        .patch(`/subscriptions/${pending.id}/activate`)
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(activated.body.status).toBe(SubscriptionStatus.ATIVO);

      const suspended = await request(app.getHttpServer())
        .patch(`/subscriptions/${pending.id}/suspend`)
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(suspended.body.status).toBe(SubscriptionStatus.SUSPENSO);

      await request(app.getHttpServer())
        .patch(`/subscriptions/${pending.id}/activate`)
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      const beforeRenew = await prisma.subscription.findUnique({
        where: { id: pending.id },
      });

      const renewed = await request(app.getHttpServer())
        .patch(`/subscriptions/${pending.id}/renew`)
        .set('X-Internal-Key', internalApiKey)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(new Date(renewed.body.nextBillingAt).getTime()).toBeGreaterThan(
        beforeRenew!.nextBillingAt!.getTime(),
      );
    });
  });

  describe('T006-14 Duplicate active subscription returns 409', () => {
    it('prevents second active subscription for same customer', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();

      await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, planId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, planId })
        .expect(409);

      expect(res.body.message).toContain('Cliente já possui assinatura ativa');
    });
  });

  describe('T006-15 Cancel updates customer.planStatus', () => {
    it('cancels subscription and emits PLANO_CANCELADO', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const created = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, planId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/subscriptions/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.status).toBe(SubscriptionStatus.CANCELADO);
      expect(res.body.cancelledAt).toBeDefined();

      expect(emitSpy).toHaveBeenCalledWith(
        PLANO_CANCELADO,
        expect.objectContaining({
          subscriptionId: created.body.id,
          customerId,
          planId,
        }),
      );

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      expect(customer?.planStatus).toBe(PlanStatus.CANCELLED);

      await request(app.getHttpServer())
        .patch(`/subscriptions/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(422);

      emitSpy.mockRestore();
    });
  });
});
