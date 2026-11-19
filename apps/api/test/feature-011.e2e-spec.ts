import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, CustomerOrigin, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Queue } from 'bullmq';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  CHECKIN_REALIZADO,
  CheckinRealizadoPayload,
} from '../src/common/events/checkin.events';
import { REDIS_CLIENT } from '../src/common/redis/redis.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QUEUE_CHECKIN } from '../src/queue/queue.constants';
import Redis from 'ioredis';

describe('Feature 011 — QR Check-in (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let eventEmitter: EventEmitter2;
  let checkinQueue: Queue;
  let tenantId: string;
  let clienteToken: string;
  let barberToken: string;
  let adminToken: string;
  let otherTenantBarberToken: string;
  let clienteCustomerId: string;
  let clienteWithoutLinkToken: string;
  let loginIpCounter = 0;

  const password = 'admin123';
  const barberEmail = 'barbeiro@barbearia.example';
  const adminEmail = 'admin@barbearia.example';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    redis = app.get(REDIS_CLIENT);
    eventEmitter = app.get(EventEmitter2);
    checkinQueue = app.get(getQueueToken(QUEUE_CHECKIN));

    await redis.connect();
    await app.init();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'barbearia-modelo' },
    });
    expect(tenant).toBeTruthy();
    tenantId = tenant!.id;

    const passwordHash = await bcrypt.hash(password, 12);

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: 'Cliente Check-in',
        phone: `114${Date.now().toString().slice(-8)}`,
        origin: CustomerOrigin.MANUAL,
        active: true,
      },
    });
    clienteCustomerId = customer.id;

    const clienteUser = await prisma.user.create({
      data: {
        tenantId,
        name: 'User Cliente Check-in',
        email: `cliente-checkin-${Date.now()}@test.example`,
        passwordHash,
        role: UserRole.CLIENTE,
        customerId: customer.id,
        active: true,
      },
    });
    const clienteWithoutLink = await prisma.user.create({
      data: {
        tenantId,
        name: 'Cliente Sem Vínculo',
        email: `cliente-sem-vinculo-${Date.now()}@test.example`,
        passwordHash,
        role: UserRole.CLIENTE,
        active: true,
      },
    });

    const otherTenant = await prisma.tenant.upsert({
      where: { slug: 'other-tenant-011' },
      update: {},
      create: {
        name: 'Other Tenant 011',
        slug: 'other-tenant-011',
        active: true,
      },
    });

    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: otherTenant.id,
          email: 'admin@other-011.example',
        },
      },
      update: {},
      create: {
        tenantId: otherTenant.id,
        name: 'Admin Other 011',
        email: 'admin@other-011.example',
        passwordHash,
        role: UserRole.ADMIN,
        active: true,
      },
    });

    clienteToken = (await login(clienteUser.email)).accessToken;
    clienteWithoutLinkToken = (await login(clienteWithoutLink.email))
      .accessToken;
    barberToken = (await login(barberEmail)).accessToken;
    adminToken = (await login(adminEmail)).accessToken;
    otherTenantBarberToken = (await login('admin@other-011.example')).accessToken;
  });

  afterAll(async () => {
    await checkinQueue.close();
    await app.close();
  });

  async function login(email: string): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.11.${loginIpCounter}.1`)
      .send({ email, password })
      .expect(200);

    return res.body;
  }

  async function generateToken(token: string = clienteToken): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/checkin/token')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    return res.body.token as string;
  }

  function consumeToken(checkinToken: string, authToken: string = barberToken) {
    return request(app.getHttpServer())
      .post('/checkin/consume')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ token: checkinToken });
  }

  describe('US1 — Geração de token', () => {
    it('US1-AC1: CLIENTE gera token com 64 chars e expiresInSeconds 60', async () => {
      const res = await request(app.getHttpServer())
        .post('/checkin/token')
        .set('Authorization', `Bearer ${clienteToken}`)
        .expect(201);

      expect(res.body.token).toMatch(/^[a-f0-9]{64}$/);
      expect(res.body.expiresInSeconds).toBe(60);
    });

    it('US1-AC2: segundo token invalida o anterior', async () => {
      const firstToken = await generateToken();
      const secondToken = await generateToken();

      expect(firstToken).not.toBe(secondToken);

      await consumeToken(firstToken).expect(404);
      await consumeToken(secondToken).expect(200);
    });

    it('US1-AC3: ADMIN/GERENTE/BARBEIRO recebem 403 em POST /checkin/token', async () => {
      await request(app.getHttpServer())
        .post('/checkin/token')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/checkin/token')
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(403);
    });
  });

  describe('US2 — Consumo de token', () => {
    it('US2-AC1: token válido cria Appointment AGUARDANDO com queuePosition', async () => {
      const freshCustomer = await prisma.customer.create({
        data: {
          tenantId,
          name: 'Cliente US2 AC1',
          phone: `110${Date.now().toString().slice(-8)}`,
          origin: CustomerOrigin.MANUAL,
          active: true,
        },
      });

      const freshUser = await prisma.user.create({
        data: {
          tenantId,
          name: 'Cliente US2 AC1 User',
          email: `us2ac1-${Date.now()}@test.example`,
          passwordHash: await bcrypt.hash(password, 12),
          role: UserRole.CLIENTE,
          customerId: freshCustomer.id,
          active: true,
        },
      });

      const freshToken = (await login(freshUser.email)).accessToken;
      const checkinToken = await generateToken(freshToken);
      const res = await consumeToken(checkinToken).expect(200);

      expect(res.body.appointment.status).toBe(AppointmentStatus.AGUARDANDO);
      expect(res.body.appointment.customerId).toBe(freshCustomer.id);
      expect(res.body.queuePosition).toBeGreaterThanOrEqual(1);
      expect(res.body.reused).toBe(false);
    });

    it('US2-AC2: token expirado retorna 404', async () => {
      const token = await generateToken();
      await redis.del(`checkin:${tenantId}:${token}`);

      await consumeToken(token).expect(404);
    });

    it('US2-AC3: token já consumido retorna 404 na segunda tentativa', async () => {
      const token = await generateToken();

      await consumeToken(token).expect(200);
      await consumeToken(token).expect(404);
    });

    it('US2-AC4: cross-tenant bloqueado com 404', async () => {
      const token = await generateToken();

      await consumeToken(token, otherTenantBarberToken).expect(404);
    });

    it('US2-AC5: emite evento CHECKIN_REALIZADO', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');
      const token = await generateToken();

      const res = await consumeToken(token).expect(200);

      expect(emitSpy).toHaveBeenCalledWith(
        CHECKIN_REALIZADO,
        expect.objectContaining<Partial<CheckinRealizadoPayload>>({
          tenantId,
          customerId: clienteCustomerId,
          appointmentId: res.body.appointment.id,
          reused: expect.any(Boolean),
          checkedInAt: expect.any(Date),
        }),
      );

      emitSpy.mockRestore();
    });
  });

  describe('US3 — Idempotência de fila', () => {
    it('US3-AC1: segundo check-in retorna reused true sem novo Appointment', async () => {
      const isolatedCustomer = await prisma.customer.create({
        data: {
          tenantId,
          name: 'Cliente Idempotência',
          phone: `113${Date.now().toString().slice(-8)}`,
          origin: CustomerOrigin.MANUAL,
          active: true,
        },
      });

      const isolatedCliente = await prisma.user.create({
        data: {
          tenantId,
          name: 'Cliente Idempotência User',
          email: `idempotencia-${Date.now()}@test.example`,
          passwordHash: await bcrypt.hash(password, 12),
          role: UserRole.CLIENTE,
          customerId: isolatedCustomer.id,
          active: true,
        },
      });

      const isolatedToken = (await login(isolatedCliente.email)).accessToken;

      const firstCheckinToken = await generateToken(isolatedToken);
      const firstRes = await consumeToken(firstCheckinToken).expect(200);
      const appointmentId = firstRes.body.appointment.id;

      const secondCheckinToken = await generateToken(isolatedToken);
      const secondRes = await consumeToken(secondCheckinToken).expect(200);

      expect(secondRes.body.reused).toBe(true);
      expect(secondRes.body.appointment.id).toBe(appointmentId);

      const count = await prisma.appointment.count({
        where: {
          tenantId,
          customerId: isolatedCustomer.id,
          status: {
            in: [
              AppointmentStatus.AGUARDANDO,
              AppointmentStatus.EM_ATENDIMENTO,
            ],
          },
          deletedAt: null,
        },
      });

      expect(count).toBe(1);
    });

    it('US3-AC2: atendimento finalizado permite novo Appointment', async () => {
      const finishedCustomer = await prisma.customer.create({
        data: {
          tenantId,
          name: 'Cliente Finalizado',
          phone: `112${Date.now().toString().slice(-8)}`,
          origin: CustomerOrigin.MANUAL,
          active: true,
        },
      });

      const finishedUser = await prisma.user.create({
        data: {
          tenantId,
          name: 'Cliente Finalizado User',
          email: `finalizado-${Date.now()}@test.example`,
          passwordHash: await bcrypt.hash(password, 12),
          role: UserRole.CLIENTE,
          customerId: finishedCustomer.id,
          active: true,
        },
      });

      const finishedAppointment = await prisma.appointment.create({
        data: {
          tenantId,
          customerId: finishedCustomer.id,
          status: AppointmentStatus.FINALIZADO,
          services: ['Corte'],
          finishedAt: new Date(),
        },
      });

      const finishedClienteToken = (await login(finishedUser.email))
        .accessToken;
      const token = await generateToken(finishedClienteToken);
      const res = await consumeToken(token).expect(200);

      expect(res.body.reused).toBe(false);
      expect(res.body.appointment.id).not.toBe(finishedAppointment.id);
      expect(res.body.appointment.status).toBe(AppointmentStatus.AGUARDANDO);
    });
  });

  describe('Edge cases', () => {
    it('cliente inativo entre geração e consumo retorna 422', async () => {
      const inactiveCustomer = await prisma.customer.create({
        data: {
          tenantId,
          name: 'Cliente Inativo',
          phone: `111${Date.now().toString().slice(-8)}`,
          origin: CustomerOrigin.MANUAL,
          active: true,
        },
      });

      const inactiveUser = await prisma.user.create({
        data: {
          tenantId,
          name: 'Cliente Inativo User',
          email: `inativo-${Date.now()}@test.example`,
          passwordHash: await bcrypt.hash(password, 12),
          role: UserRole.CLIENTE,
          customerId: inactiveCustomer.id,
          active: true,
        },
      });

      const inactiveClienteToken = (await login(inactiveUser.email))
        .accessToken;
      const token = await generateToken(inactiveClienteToken);

      await prisma.customer.update({
        where: { id: inactiveCustomer.id },
        data: { active: false },
      });

      await consumeToken(token).expect(422);
    });

    it('CLIENTE sem customerId vinculado retorna 422 em POST /checkin/token', async () => {
      await request(app.getHttpServer())
        .post('/checkin/token')
        .set('Authorization', `Bearer ${clienteWithoutLinkToken}`)
        .expect(422);
    });
  });
});
