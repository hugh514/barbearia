import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, CustomerOrigin } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
  QUEUE_POST_ATTENDANCE,
} from '../src/queue/queue.constants';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 008 — Event System & Queues (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let postAttendanceQueue: Queue;
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
    postAttendanceQueue = app.get(getQueueToken(QUEUE_POST_ATTENDANCE));

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
    await postAttendanceQueue.close();
    await app.close();
  });

  async function login(): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.8.${loginIpCounter}.1`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return res.body;
  }

  async function createCustomer(): Promise<string> {
    const phone = `118${Date.now().toString().slice(-8)}`;
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cliente Queue',
        phone,
        origin: CustomerOrigin.MANUAL,
      })
      .expect(201);

    return res.body.id as string;
  }

  async function finishAppointment(appointmentId: string): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/appointments/${appointmentId}/start`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/appointments/${appointmentId}/finish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ totalPrice: 50 })
      .expect(200);
  }

  async function clearActiveAppointmentsForBarber(
    barberId: string,
  ): Promise<void> {
    await prisma.appointment.updateMany({
      where: {
        tenantId,
        barberId,
        status: AppointmentStatus.EM_ATENDIMENTO,
      },
      data: {
        status: AppointmentStatus.FINALIZADO,
        finishedAt: new Date(),
      },
    });
  }

  beforeEach(async () => {
    await clearActiveAppointmentsForBarber(adminUserId);
  });

  describe('T008-20 finishing appointment enqueues post-attendance job', () => {
    it('creates a job in post-attendance queue after finish', async () => {
      const customerId = await createCustomer();

      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, services: ['Corte'] })
        .expect(201);

      const appointmentId = created.body.id as string;
      await finishAppointment(appointmentId);

      await expectJobInQueue(appointmentId);
    });
  });

  describe('T008-21 retry configuration', () => {
    it('enqueued jobs use 3 attempts with exponential backoff', async () => {
      const customerId = await createCustomer();

      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ customerId, services: ['Barba'] })
        .expect(201);

      const appointmentId = created.body.id as string;
      await finishAppointment(appointmentId);

      const job = await findJobByAppointmentId(appointmentId);
      expect(job).toBeDefined();
      expect(job!.opts.attempts).toBe(DEFAULT_JOB_OPTIONS.attempts);
      expect(job!.opts.backoff).toEqual(DEFAULT_JOB_OPTIONS.backoff);
    });

    it('retries failed jobs up to 3 times', async () => {
      const testQueueName = `test-retry-${Date.now()}`;
      const connection = {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      };

      const queue = new Queue(testQueueName, { connection });
      const worker = new Worker(
        testQueueName,
        async () => {
          throw new Error('forced failure');
        },
        { connection },
      );

      const job = await queue.add(
        'fail',
        { test: true },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 50 },
        },
      );

      const deadline = Date.now() + 10_000;
      let attemptsMade = 0;

      while (Date.now() < deadline) {
        const current = await queue.getJob(job.id!);
        attemptsMade = current?.attemptsMade ?? 0;
        if (attemptsMade >= 3) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(attemptsMade).toBe(3);

      await worker.close();
      await queue.obliterate({ force: true });
      await queue.close();
    });
  });

  describe('T008-22 GET /queues/stats', () => {
    it('returns queue counters for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/queues/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(QUEUE_NAMES.length);

      const postAttendance = res.body.find(
        (item: { name: string }) => item.name === QUEUE_POST_ATTENDANCE,
      );
      expect(postAttendance).toMatchObject({
        name: QUEUE_POST_ATTENDANCE,
        waiting: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        delayed: expect.any(Number),
      });
    });

    it('denies access to non-admin roles', async () => {
      await request(app.getHttpServer()).get('/queues/stats').expect(401);
    });
  });

  async function findJobByAppointmentId(
    appointmentId: string,
  ): Promise<ReturnType<Queue['getJob']> extends Promise<infer T> ? T : never> {
    const states = ['waiting', 'active', 'completed', 'delayed'] as const;

    for (const state of states) {
      const jobs = await postAttendanceQueue.getJobs([state], 0, 50);
      const match = jobs.find(
        (item) =>
          (item.data as { appointmentId?: string }).appointmentId ===
          appointmentId,
      );
      if (match) {
        return match;
      }
    }

    return undefined;
  }

  async function expectJobInQueue(appointmentId: string): Promise<void> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const job = await findJobByAppointmentId(appointmentId);
      if (job) {
        expect(job.name).toBe('process');
        expect(job.data).toMatchObject({
          appointmentId,
          tenantId,
          customerId: expect.any(String),
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(
      `No post-attendance job found for appointment ${appointmentId}`,
    );
  }
});
