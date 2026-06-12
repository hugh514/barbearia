import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, CustomerOrigin, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { BCRYPT_ROUNDS } from '../src/modules/auth/auth.constants';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 009 — Dashboard & Backoffice Metrics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let otherTenantId: string;
  let adminAccessToken: string;
  let barberAccessToken: string;
  let barberId: string;
  let loginIpCounter = 0;

  const adminEmail = 'admin@barbearia.example';
  const adminPassword = 'admin123';
  const barberEmail = 'barbeiro@barbearia.example';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'barbearia-modelo' },
    });
    expect(tenant).toBeTruthy();
    tenantId = tenant!.id;

    const barber = await prisma.user.findFirst({
      where: { tenantId, email: barberEmail },
    });
    expect(barber).toBeTruthy();
    barberId = barber!.id;

    const otherTenant = await prisma.tenant.upsert({
      where: { slug: 'other-barbearia-dashboard' },
      update: {},
      create: {
        name: 'Other Barbearia Dashboard',
        slug: 'other-barbearia-dashboard',
        active: true,
      },
    });
    otherTenantId = otherTenant.id;

    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: otherTenantId,
          email: 'admin@other-dashboard.com',
        },
      },
      update: {},
      create: {
        tenantId: otherTenantId,
        name: 'Other Admin',
        email: 'admin@other-dashboard.com',
        passwordHash,
        role: UserRole.ADMIN,
        active: true,
      },
    });

    await prisma.customer.create({
      data: {
        tenantId: otherTenantId,
        name: 'Cliente Other Tenant',
        phone: `119${Date.now().toString().slice(-8)}`,
        origin: CustomerOrigin.MANUAL,
      },
    });

    const adminLogin = await login(adminEmail, adminPassword);
    adminAccessToken = adminLogin.accessToken;

    const barberLogin = await login(barberEmail, adminPassword);
    barberAccessToken = barberLogin.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.9.${loginIpCounter}.1`)
      .send({ email, password })
      .expect(200);

    return res.body;
  }

  describe('T009-14 summary returns correct data for today/week/month', () => {
    it('returns summary for today', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary?period=today')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.period).toBe('today');
      expect(typeof res.body.totalAppointments).toBe('number');
      expect(Array.isArray(res.body.appointmentsByBarber)).toBe(true);
      expect(typeof res.body.newCustomers).toBe('number');
      expect(typeof res.body.revenue).toBe('number');
      expect(typeof res.body.occupancyRate).toBe('number');
    });

    it('returns summary for week', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary?period=week')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.period).toBe('week');
      expect(res.body.totalAppointments).toBeGreaterThanOrEqual(0);
    });

    it('returns summary for month', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.period).toBe('month');
      expect(res.body.totalAppointments).toBeGreaterThanOrEqual(1);
      expect(res.body.revenue).toBeGreaterThanOrEqual(55);
    });

    it('requires period query param', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(400);
    });
  });

  describe('T009-15 BARBEIRO cannot access dashboard', () => {
    it('returns 403 for barber on summary', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/summary?period=today')
        .set('Authorization', `Bearer ${barberAccessToken}`)
        .expect(403);
    });

    it('returns 403 for barber on customers', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/customers')
        .set('Authorization', `Bearer ${barberAccessToken}`)
        .expect(403);
    });
  });

  describe('T009-13 tenant isolation in aggregations', () => {
    it('does not include other tenant customers in metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/customers?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const otherTenantCustomers = await prisma.customer.count({
        where: { tenantId: otherTenantId, active: true },
      });

      const fkCustomers = await prisma.customer.count({
        where: { tenantId, active: true },
      });

      expect(res.body.totalCustomers).toBe(fkCustomers);
      expect(res.body.totalCustomers).not.toBe(
        fkCustomers + otherTenantCustomers,
      );
    });
  });

  describe('T009-16 all dashboard endpoints respond with valid structure', () => {
    it('GET /dashboard/customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/customers?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.totalCustomers).toBeGreaterThanOrEqual(5);
      expect(typeof res.body.recurringCustomers).toBe('number');
      expect(Array.isArray(res.body.topCustomersByFrequency)).toBe(true);
    });

    it('GET /dashboard/revenue', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/revenue?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.period).toBe('month');
      expect(typeof res.body.appointmentRevenue).toBe('number');
      expect(typeof res.body.planRevenue).toBe('number');
      expect(typeof res.body.totalRevenue).toBe('number');
      expect(Array.isArray(res.body.revenueByBarber)).toBe(true);
    });

    it('GET /dashboard/plans', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/plans?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.activeSubscribers).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.mrrCents).toBe('number');
      expect(typeof res.body.churnRate).toBe('number');
    });

    it('GET /dashboard/conversations', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/conversations?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(typeof res.body.openConversations).toBe('number');
      expect(typeof res.body.waitingForHuman).toBe('number');
      expect(res.body.messagesByChannel).toHaveLength(2);
    });

    it('GET /dashboard/barbers', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/barbers?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.barbers)).toBe(true);
      const demoBarber = res.body.barbers.find(
        (b: { barberId: string }) => b.barberId === barberId,
      );
      expect(demoBarber).toBeDefined();
      expect(demoBarber.totalAppointments).toBeGreaterThanOrEqual(1);
      expect(demoBarber.averageRating).toBeNull();
    });
  });

  describe('T009-12 performance with 1000+ records under 500ms', () => {
    const bulkCustomerIds: string[] = [];

    beforeAll(async () => {
      const batchId = Date.now().toString().slice(-6);
      const customers = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          prisma.customer.create({
            data: {
              tenantId,
              name: `Bulk Customer ${batchId}-${i}`,
              phone: `116${batchId}${String(i).padStart(2, '0')}`,
              origin: CustomerOrigin.MANUAL,
            },
          }),
        ),
      );
      bulkCustomerIds.push(...customers.map((c) => c.id));

      const now = new Date();
      const appointments = customers.flatMap((customer, customerIndex) =>
        Array.from({ length: 20 }, (_, apptIndex) => {
          const finishedAt = new Date(now);
          finishedAt.setHours(
            finishedAt.getHours() - apptIndex - customerIndex,
          );
          const startedAt = new Date(finishedAt);
          startedAt.setMinutes(startedAt.getMinutes() - 30);

          return {
            tenantId,
            customerId: customer.id,
            barberId,
            status: AppointmentStatus.FINALIZADO,
            services: ['Corte'],
            totalPrice: 40,
            startedAt,
            finishedAt,
          };
        }),
      );

      await prisma.appointment.createMany({ data: appointments });
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({
        where: { customerId: { in: bulkCustomerIds } },
      });
      await prisma.customer.deleteMany({
        where: { id: { in: bulkCustomerIds } },
      });
    });

    it('summary responds in under 500ms with bulk data', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/dashboard/summary?period=month')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });
});
