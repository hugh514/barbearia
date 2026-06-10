import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AppointmentStatus,
  CustomerOrigin,
} from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  ATENDIMENTO_FINALIZADO,
  ATENDIMENTO_INICIADO,
} from '../src/common/events/appointment.events';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 005 — Appointments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let accessToken: string;
  let tenantId: string;
  let adminUserId: string;
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

    await app.init();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'barbearia-modelo' },
    });
    expect(tenant).toBeTruthy();
    tenantId = tenant!.id;

    const admin = await prisma.user.findFirst({
      where: { tenantId, email: adminEmail },
    });
    expect(admin).toBeTruthy();
    adminUserId = admin!.id;

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
      .set('X-Forwarded-For', `10.5.${loginIpCounter}.1`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return res.body;
  }

  async function createCustomer(): Promise<string> {
    const phone = `115${Date.now().toString().slice(-8)}`;
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cliente Fila',
        phone,
        origin: CustomerOrigin.MANUAL,
      })
      .expect(201);

    return res.body.id as string;
  }

  async function createAppointment(
    customerId: string,
    services: string[] = ['Corte'],
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ customerId, services })
      .expect(201);

    return res.body.id as string;
  }

  describe('T005-05 T005-06 T005-07 T005-08 CRUD and queue', () => {
    it('registers walk-in with AGUARDANDO status', async () => {
      const customerId = await createCustomer();

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId,
          services: ['Corte', 'Barba'],
        })
        .expect(201);

      expect(res.body.status).toBe(AppointmentStatus.AGUARDANDO);
      expect(res.body.tenantId).toBe(tenantId);
      expect(res.body.services).toEqual(['Corte', 'Barba']);
      expect(res.body.createdAt).toBeDefined();
    });

    it('returns 404 when customer does not exist', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: '00000000-0000-4000-8000-000000009999',
          services: ['Corte'],
        })
        .expect(404);
    });

    it('returns queue ordered by arrival time', async () => {
      const firstCustomer = await createCustomer();
      const secondCustomer = await createCustomer();

      const first = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId: firstCustomer, services: ['Corte'] })
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId: secondCustomer, services: ['Barba'] })
        .expect(201);

      const queue = await request(app.getHttpServer())
        .get('/appointments/queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const ids = queue.body.data.map((item: { id: string }) => item.id);
      const firstIndex = ids.indexOf(first.body.id);
      const secondIndex = ids.indexOf(second.body.id);

      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(secondIndex).toBeGreaterThanOrEqual(0);
      expect(firstIndex).toBeLessThan(secondIndex);

      const waiting = queue.body.data.find(
        (item: { id: string }) => item.id === first.body.id,
      );
      expect(waiting.customer).toMatchObject({
        id: firstCustomer,
        name: 'Cliente Fila',
      });
      expect(waiting.waitTimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('lists history with pagination and filters', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/finish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totalPrice: 45.5, notes: 'Ok' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          customerId,
          status: AppointmentStatus.FINALIZADO,
          page: 1,
          perPage: 20,
        })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.data[0].totalPrice).toBe('45.5');
      expect(res.body.data[0].durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it('returns appointment details for tenant', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId);

      const res = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(appointmentId);
      expect(res.body.customerId).toBe(customerId);
    });
  });

  describe('T005-09 T005-10 T005-11 T005-12 T005-13 Status transitions and events', () => {
    it('starts appointment and emits ATENDIMENTO_INICIADO', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId);
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const res = await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.status).toBe(AppointmentStatus.EM_ATENDIMENTO);
      expect(res.body.barberId).toBe(adminUserId);
      expect(res.body.startedAt).toBeDefined();

      expect(emitSpy).toHaveBeenCalledWith(
        ATENDIMENTO_INICIADO,
        expect.objectContaining({
          appointmentId,
          tenantId,
          customerId,
          barberId: adminUserId,
        }),
      );

      emitSpy.mockRestore();
    });

    it('finishes appointment, emits ATENDIMENTO_FINALIZADO and updates lastVisit', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId);
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/finish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totalPrice: 60, notes: 'Degradê' })
        .expect(200);

      expect(res.body.status).toBe(AppointmentStatus.FINALIZADO);
      expect(res.body.finishedAt).toBeDefined();
      expect(res.body.notes).toBe('Degradê');
      expect(res.body.totalPrice).toBe('60');

      expect(emitSpy).toHaveBeenCalledWith(
        ATENDIMENTO_FINALIZADO,
        expect.objectContaining({
          appointmentId,
          tenantId,
          customerId,
          services: ['Corte'],
        }),
      );

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      expect(customer?.lastVisit).toBeTruthy();

      emitSpy.mockRestore();
    });

    it('cancels appointment from AGUARDANDO', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId);

      const res = await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Cliente desistiu' })
        .expect(200);

      expect(res.body.status).toBe(AppointmentStatus.CANCELADO);
      expect(res.body.cancelReason).toBe('Cliente desistiu');
    });
  });

  describe('T005-16 T005-17 Conflict and invalid transitions', () => {
    it('returns 409 when barber already has active appointment', async () => {
      const firstCustomer = await createCustomer();
      const secondCustomer = await createCustomer();

      const firstAppointment = await createAppointment(firstCustomer);
      const secondAppointment = await createAppointment(secondCustomer);

      await request(app.getHttpServer())
        .patch(`/appointments/${firstAppointment}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/appointments/${secondAppointment}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.message).toContain('Barbeiro já está em atendimento');

      await request(app.getHttpServer())
        .patch(`/appointments/${firstAppointment}/finish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);
    });

    it('returns 422 when cancelling FINALIZADO appointment', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/finish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Tarde demais' })
        .expect(422);
    });
  });

  describe('T005-15 T005-23 Customer history integration', () => {
    it('returns real appointments in customer history', async () => {
      const customerId = await createCustomer();
      const appointmentId = await createAppointment(customerId, ['Corte', 'Barba']);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/finish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ totalPrice: 70 })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/customers/${customerId}/history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toMatchObject({
        id: appointmentId,
        status: AppointmentStatus.FINALIZADO,
        services: ['Corte', 'Barba'],
      });
    });
  });
});
