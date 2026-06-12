import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentMethod,
  PaymentStatus,
  PlanStatus,
  SubscriptionStatus,
} from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  PAGAMENTO_APROVADO,
  PAGAMENTO_RECUSADO,
} from '../src/common/events/payment.events';
import { PAYMENT_GATEWAY } from '../src/modules/payments/providers/payment-gateway.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  MockPaymentGateway,
  buildWebhookSignature,
  resetMockPaymentGateway,
  setMockPaymentStatus,
} from './mocks/mock-payment-gateway';

describe('Feature 007 — Payments Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let accessToken: string;
  let tenantId: string;
  let loginIpCounter = 0;

  const adminEmail = 'admin@barbearia.example';
  const adminPassword = 'admin123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_GATEWAY)
      .useClass(MockPaymentGateway)
      .compile();

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

  beforeEach(() => {
    resetMockPaymentGateway();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.7.${loginIpCounter}.1`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return res.body;
  }

  async function createCustomer(): Promise<string> {
    const phone = `117${Date.now().toString().slice(-8)}`;
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cliente Pagamento',
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
        name: `Plano Pagamento ${Date.now()}`,
        priceCents: 9900,
        intervalDays: 30,
        benefits: ['2 cortes/mês'],
        active: true,
      })
      .expect(201);

    return res.body.id as string;
  }

  async function waitForSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    timeoutMs = 5000,
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (subscription?.status === status) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(
      `Subscription ${subscriptionId} did not reach status ${status}`,
    );
  }

  async function createPendingSubscription(
    customerId: string,
    planId: string,
  ): Promise<string> {
    const subscription = await prisma.subscription.create({
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

    return subscription.id;
  }

  describe('T007-16 PIX payment creation returns QR code', () => {
    it('creates PIX payment with qrCode and paymentUrl', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const subscriptionId = await createPendingSubscription(
        customerId,
        planId,
      );

      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subscriptionId, method: PaymentMethod.PIX })
        .expect(201);

      expect(res.body.status).toBe(PaymentStatus.PENDENTE);
      expect(res.body.method).toBe(PaymentMethod.PIX);
      expect(res.body.qrCode).toBeDefined();
      expect(res.body.qrCode).toContain('PIXMOCK');
      expect(res.body.paymentUrl).toContain('https://pay.mock/');
      expect(res.body.externalId).toBeDefined();
      expect(res.body.amountCents).toBe(9900);
    });
  });

  describe('T007-17 Duplicate webhook is idempotent', () => {
    it('does not process approved webhook twice', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const subscriptionId = await createPendingSubscription(
        customerId,
        planId,
      );
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const paymentRes = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subscriptionId, method: PaymentMethod.PIX })
        .expect(201);

      const externalId = paymentRes.body.externalId as string;
      setMockPaymentStatus(externalId, 'approved');

      const requestId = 'req-duplicate-test';
      const signature = buildWebhookSignature(externalId, requestId);

      const payload = {
        action: 'payment.updated',
        type: 'payment',
        data: { id: externalId },
      };

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .query({ 'data.id': externalId })
        .set('x-signature', signature)
        .set('x-request-id', requestId)
        .send(payload)
        .expect(200);

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .query({ 'data.id': externalId })
        .set('x-signature', signature)
        .set('x-request-id', requestId)
        .send(payload)
        .expect(200);

      const approvedEvents = emitSpy.mock.calls.filter(
        ([event]) => event === PAGAMENTO_APROVADO,
      );
      expect(approvedEvents).toHaveLength(1);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentRes.body.id },
      });
      expect(payment?.status).toBe(PaymentStatus.APROVADO);

      await waitForSubscriptionStatus(subscriptionId, SubscriptionStatus.ATIVO);

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      expect(customer?.planStatus).toBe(PlanStatus.ACTIVE);

      emitSpy.mockRestore();
    });
  });

  describe('T007-18 Invalid webhook signature returns 401', () => {
    it('rejects webhook with invalid HMAC signature', async () => {
      await request(app.getHttpServer())
        .post('/payments/webhook')
        .query({ 'data.id': 'mp-invalid' })
        .set('x-signature', 'ts=123,v1=invalidhash')
        .set('x-request-id', 'req-invalid')
        .send({
          action: 'payment.updated',
          type: 'payment',
          data: { id: 'mp-invalid' },
        })
        .expect(401);
    });
  });

  describe('T007-11 T007-12 T007-14 T007-15 Additional flows', () => {
    it('rejects payment and emits PAGAMENTO_RECUSADO', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const subscriptionId = await createPendingSubscription(
        customerId,
        planId,
      );
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const paymentRes = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subscriptionId, method: PaymentMethod.BOLETO })
        .expect(201);

      const externalId = paymentRes.body.externalId as string;
      setMockPaymentStatus(externalId, 'rejected');

      const requestId = 'req-rejected';
      const signature = buildWebhookSignature(externalId, requestId);

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .query({ 'data.id': externalId })
        .set('x-signature', signature)
        .set('x-request-id', requestId)
        .send({
          type: 'payment',
          data: { id: externalId },
        })
        .expect(200);

      expect(emitSpy).toHaveBeenCalledWith(
        PAGAMENTO_RECUSADO,
        expect.objectContaining({
          paymentId: paymentRes.body.id,
          subscriptionId,
          customerId,
        }),
      );

      const payment = await prisma.payment.findUnique({
        where: { id: paymentRes.body.id },
      });
      expect(payment?.status).toBe(PaymentStatus.RECUSADO);

      emitSpy.mockRestore();
    });

    it('lists payments with filters and customer payment history', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const subscriptionId = await createPendingSubscription(
        customerId,
        planId,
      );

      const created = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subscriptionId, method: PaymentMethod.PIX })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          subscriptionId,
          customerId,
          status: PaymentStatus.PENDENTE,
        })
        .expect(200);

      const ids = listRes.body.data.map((item: { id: string }) => item.id);
      expect(ids).toContain(created.body.id);

      const detailRes = await request(app.getHttpServer())
        .get(`/payments/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(detailRes.body.gatewayData).toBeDefined();

      const customerPayments = await request(app.getHttpServer())
        .get(`/customers/${customerId}/payments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const customerIds = customerPayments.body.data.map(
        (item: { id: string }) => item.id,
      );
      expect(customerIds).toContain(created.body.id);
      expect(customerPayments.body.data[0].plan).toBeDefined();
    });

    it('prevents second pending payment for same subscription', async () => {
      const customerId = await createCustomer();
      const planId = await createPlan();
      const subscriptionId = await createPendingSubscription(
        customerId,
        planId,
      );

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subscriptionId, method: PaymentMethod.PIX })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subscriptionId, method: PaymentMethod.PIX })
        .expect(409);

      expect(res.body.message).toContain(
        'pagamento pendente para esta assinatura',
      );
    });
  });
});
