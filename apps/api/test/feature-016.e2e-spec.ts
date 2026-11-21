import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AppointmentStatus,
  CustomerOrigin,
  PaymentMethod,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 016: gestão no painel (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ipCounter = 0;

  const run = Date.now();
  const ipBase = `10.${(run + 16) % 250}`;
  const password = 'Senha1234';

  let tenantId: string;
  let otherTenantId: string;
  let adminToken: string;
  let gerenteToken: string;
  let barberToken: string;
  let clienteToken: string;
  let otherAdminToken: string;
  let planId: string;
  let customerA: string;
  let customerB: string;

  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function login(email: string) {
    ipCounter += 1;
    const res = await http()
      .post('/auth/login')
      .set('X-Forwarded-For', `${ipBase}.${ipCounter}.1`)
      .send({ email, password });
    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  }

  async function mkCustomer(tid: string, name: string) {
    const c = await prisma.customer.create({
      data: {
        tenantId: tid,
        name,
        phone: `1160${String(run).slice(-6)}${ipCounter++ % 100}`,
        origin: CustomerOrigin.MANUAL,
      },
    });
    return c.id;
  }

  async function mkUser(tid: string, role: UserRole, name: string) {
    const email = `${name.toLowerCase()}-${run}@t016.example`;
    const customerId =
      role === UserRole.CLIENTE ? await mkCustomer(tid, name) : undefined;
    await prisma.user.create({
      data: {
        tenantId: tid,
        name,
        email,
        passwordHash: await bcrypt.hash(password, 4),
        role,
        customerId,
      },
    });
    return login(email);
  }

  async function waitFor<T>(fn: () => Promise<T | undefined>) {
    for (let i = 0; i < 50; i++) {
      const v = await fn();
      if (v) return v;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout aguardando condição');
  }

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    tenantId = (
      await prisma.tenant.create({
        data: { name: 'Tenant 016', slug: `t016-${run}` },
      })
    ).id;
    otherTenantId = (
      await prisma.tenant.create({
        data: { name: 'Outro 016', slug: `t016o-${run}` },
      })
    ).id;

    adminToken = await mkUser(tenantId, UserRole.ADMIN, 'Admin016');
    gerenteToken = await mkUser(tenantId, UserRole.GERENTE, 'Gerente016');
    barberToken = await mkUser(tenantId, UserRole.BARBEIRO, 'Barbeiro016');
    clienteToken = await mkUser(tenantId, UserRole.CLIENTE, 'Cliente016');
    otherAdminToken = await mkUser(otherTenantId, UserRole.ADMIN, 'Outro016');

    planId = (
      await prisma.plan.create({
        data: {
          tenantId,
          name: 'Plano 016',
          priceCents: 8000,
          intervalDays: 30,
        },
      })
    ).id;
    customerA = await mkCustomer(tenantId, 'Ana 016');
    customerB = await mkCustomer(tenantId, 'Bruno 016');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Assinaturas pelo balcão', () => {
    let pixSubId: string;
    let counterSubId: string;

    it('equipe cria assinatura pendente com activateNow false (para gerar PIX)', async () => {
      const res = await http()
        .post('/subscriptions')
        .set(auth(gerenteToken))
        .send({ customerId: customerA, planId, activateNow: false })
        .expect(201);
      expect(res.body.status).toBe(SubscriptionStatus.PENDENTE);
      expect(res.body.startedAt).toBeNull();
      pixSubId = res.body.id;
    });

    it('sem activateNow a equipe continua criando ATIVO (pagamento no balcão)', async () => {
      const res = await http()
        .post('/subscriptions')
        .set(auth(adminToken))
        .send({ customerId: customerB, planId })
        .expect(201);
      expect(res.body.status).toBe(SubscriptionStatus.ATIVO);
      counterSubId = res.body.id;
    });

    it('activateNow não deixa o cliente se ativar sozinho', async () => {
      const me = await prisma.user.findFirst({
        where: { tenantId, role: UserRole.CLIENTE },
      });
      const res = await http()
        .post('/subscriptions')
        .set(auth(clienteToken))
        .send({ customerId: me!.customerId, planId, activateNow: true })
        .expect(201);
      expect(res.body.status).toBe(SubscriptionStatus.PENDENTE);
    });

    it('PIX gerado pela equipe ativa a assinatura pendente ao ser aprovado', async () => {
      const pay = await http()
        .post('/payments')
        .set(auth(gerenteToken))
        .send({ subscriptionId: pixSubId, method: PaymentMethod.PIX })
        .expect(201);
      expect(pay.body.qrCode).toBeTruthy();
      expect(pay.body.customer).toEqual({ id: customerA, name: 'Ana 016' });
      await http()
        .post(`/payments/${pay.body.id}/mock-approve`)
        .set(auth(gerenteToken))
        .expect(200);
      await waitFor(async () => {
        const s = await prisma.subscription.findUnique({
          where: { id: pixSubId },
        });
        return s?.status === SubscriptionStatus.ATIVO ? s : undefined;
      });
    });

    it('GERENTE suspende, reativa e renova pelas rotas manuais', async () => {
      const suspended = await http()
        .patch(`/subscriptions/${counterSubId}/manual/suspend`)
        .set(auth(gerenteToken))
        .expect(200);
      expect(suspended.body.status).toBe(SubscriptionStatus.SUSPENSO);

      const active = await http()
        .patch(`/subscriptions/${counterSubId}/manual/activate`)
        .set(auth(gerenteToken))
        .expect(200);
      expect(active.body.status).toBe(SubscriptionStatus.ATIVO);

      const before = new Date(active.body.nextBillingAt).getTime();
      const renewed = await http()
        .patch(`/subscriptions/${counterSubId}/manual/renew`)
        .set(auth(adminToken))
        .expect(200);
      const after = new Date(renewed.body.nextBillingAt).getTime();
      expect(Math.round((after - before) / 86_400_000)).toBe(30);
    });

    it('transição inválida responde 422', async () => {
      await http()
        .patch(`/subscriptions/${counterSubId}/manual/activate`)
        .set(auth(adminToken))
        .expect(422);
    });

    it('rotas manuais: 401 sem token, 403 para barbeiro e cliente, 404 em outro tenant', async () => {
      for (const action of ['activate', 'suspend', 'renew']) {
        const url = `/subscriptions/${counterSubId}/manual/${action}`;
        await http().patch(url).expect(401);
        await http().patch(url).set(auth(barberToken)).expect(403);
        await http().patch(url).set(auth(clienteToken)).expect(403);
        await http().patch(url).set(auth(otherAdminToken)).expect(404);
      }
    });

    it('GET /subscriptions lista só o tenant, filtra por status e barra o barbeiro', async () => {
      const all = await http()
        .get('/subscriptions')
        .set(auth(gerenteToken))
        .expect(200);
      expect(all.body.meta.total).toBe(3);
      expect(all.body.data[0].customer.name).toBeTruthy();
      expect(all.body.data[0].plan.priceCents).toBe(8000);

      const pend = await http()
        .get('/subscriptions?status=PENDENTE')
        .set(auth(gerenteToken))
        .expect(200);
      expect(pend.body.data.map((s: { status: string }) => s.status)).toEqual([
        'PENDENTE',
      ]);

      const other = await http()
        .get('/subscriptions')
        .set(auth(otherAdminToken))
        .expect(200);
      expect(other.body.meta.total).toBe(0);

      await http().get('/subscriptions').set(auth(barberToken)).expect(403);
    });
  });

  describe('Pagamentos: cliente na lista e totais do período', () => {
    it('GET /payments traz o nome do cliente', async () => {
      const res = await http()
        .get('/payments')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.data[0].customer).toEqual({
        id: customerA,
        name: 'Ana 016',
      });
    });

    it('GET /payments/totals soma por status no período, por tenant', async () => {
      const res = await http()
        .get('/payments/totals')
        .query({ dateFrom: new Date(Date.now() - 86_400_000).toISOString() })
        .set(auth(adminToken))
        .expect(200);
      expect(res.body).toEqual({
        count: 1,
        totalCents: 8000,
        byStatus: [{ status: 'APROVADO', count: 1, amountCents: 8000 }],
      });

      const empty = await http()
        .get('/payments/totals')
        .query({ status: 'PENDENTE' })
        .set(auth(adminToken))
        .expect(200);
      expect(empty.body).toEqual({ count: 0, totalCents: 0, byStatus: [] });

      const other = await http()
        .get('/payments/totals')
        .set(auth(otherAdminToken))
        .expect(200);
      expect(other.body.count).toBe(0);
    });

    it('filtro method vale na listagem e nos totais; método desconhecido é 400', async () => {
      const pix = await http()
        .get('/payments?method=PIX')
        .set(auth(adminToken))
        .expect(200);
      expect(pix.body.meta.total).toBe(1);
      const card = await http()
        .get('/payments/totals?method=CARD')
        .set(auth(adminToken))
        .expect(200);
      expect(card.body.count).toBe(0);
      await http()
        .get('/payments?method=DINHEIRO')
        .set(auth(adminToken))
        .expect(400);
    });

    it('GET /payments/totals: 403 para barbeiro e cliente, 400 com data inválida', async () => {
      await http().get('/payments/totals').set(auth(barberToken)).expect(403);
      await http().get('/payments/totals').set(auth(clienteToken)).expect(403);
      await http()
        .get('/payments/totals?dateFrom=ontem')
        .set(auth(adminToken))
        .expect(400);
    });
  });

  describe('Dashboard: 7 dias, período anterior e série por dia', () => {
    beforeAll(async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(now.getDate() - 10);
      for (const finishedAt of [now, now, yesterday, tenDaysAgo]) {
        await prisma.appointment.create({
          data: {
            tenantId,
            customerId: customerA,
            status: AppointmentStatus.FINALIZADO,
            services: ['Corte'],
            totalPrice: 40,
            startedAt: finishedAt,
            finishedAt,
          },
        });
      }
    });

    it('period=7d: sete dias na série, total e período anterior', async () => {
      const res = await http()
        .get('/dashboard/summary?period=7d')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.period).toBe('7d');
      expect(res.body.totalAppointments).toBe(3);
      expect(res.body.previousTotalAppointments).toBe(1);
      expect(res.body.appointmentsByDay).toHaveLength(7);
      const last = res.body.appointmentsByDay.at(-1);
      expect(last.count).toBe(2);
      expect(last.revenue).toBe(80);
      expect(last.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('period=today compara com ontem até a mesma hora', async () => {
      const res = await http()
        .get('/dashboard/summary?period=today')
        .set(auth(gerenteToken))
        .expect(200);
      expect(res.body.totalAppointments).toBe(2);
      expect(res.body.appointmentsByDay).toHaveLength(1);
      expect(typeof res.body.previousTotalAppointments).toBe('number');
    });

    it('outros endpoints de métricas aceitam 7d e o barbeiro segue barrado', async () => {
      await http()
        .get('/dashboard/revenue?period=7d')
        .set(auth(adminToken))
        .expect(200);
      await http()
        .get('/dashboard/summary?period=7d')
        .set(auth(barberToken))
        .expect(403);
      await http()
        .get('/dashboard/summary?period=semana')
        .set(auth(adminToken))
        .expect(400);
    });

    it('tenant isolado: o outro admin não vê os atendimentos', async () => {
      const res = await http()
        .get('/dashboard/summary?period=7d')
        .set(auth(otherAdminToken))
        .expect(200);
      expect(res.body.totalAppointments).toBe(0);
      expect(
        res.body.appointmentsByDay.every(
          (d: { count: number }) => d.count === 0,
        ),
      ).toBe(true);
    });
  });
});
