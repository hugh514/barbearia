import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CustomerOrigin,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EMAIL_SENDER } from '../src/modules/email/email.interface';
import { LogEmailProvider } from '../src/modules/email/log-email.provider';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Lacunas da API: fila do dia completa, posição do cliente, e-mail de
 * recuperação, pagamento mock, cancelamento pelo cliente, 429 padronizado,
 * aparência por barbearia e specs 012/013.
 */
describe('Feature 014 — lacunas da API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let email: LogEmailProvider;
  let ipCounter = 0;

  const run = Date.now();
  const ipBase = `10.${run % 250}`;
  const password = 'Senha1234';
  const slug = `t014-${run}`;
  const otherSlug = `t014o-${run}`;

  let tenantId: string;
  let otherTenantId: string;
  let adminToken: string;
  let barberToken: string;
  let otherAdminToken: string;
  let cliente1: {
    token: string;
    customerId: string;
    userId: string;
    email: string;
  };
  let cliente2: {
    token: string;
    customerId: string;
    userId: string;
    email: string;
  };
  let cliente3Token: string;

  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function login(
    emailAddr: string,
    pass = password,
    tenantSlug?: string,
  ) {
    ipCounter += 1;
    const res = await http()
      .post('/auth/login')
      .set('X-Forwarded-For', `${ipBase}.${ipCounter}.1`)
      .send({ email: emailAddr, password: pass, tenantSlug });
    expect(res.status).toBe(200);
    return res.body as { accessToken: string; refreshToken: string };
  }

  async function waitFor<T>(fn: () => Promise<T | undefined> | T | undefined) {
    for (let i = 0; i < 50; i++) {
      const v = await fn();
      if (v) return v;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout aguardando condição');
  }

  async function mkUser(
    tid: string,
    role: UserRole,
    name: string,
    withCustomer = false,
  ) {
    const passwordHash = await bcrypt.hash(password, 4);
    let customerId: string | undefined;
    if (withCustomer) {
      const c = await prisma.customer.create({
        data: {
          tenantId: tid,
          name,
          phone: `1100${String(run).slice(-6)}${ipCounter++ % 100}`,
          origin: CustomerOrigin.MANUAL,
        },
      });
      customerId = c.id;
    }
    const emailAddr = `${name.toLowerCase().replace(/\W/g, '')}-${run}@t014.example`;
    const u = await prisma.user.create({
      data: {
        tenantId: tid,
        name,
        email: emailAddr,
        passwordHash,
        role,
        customerId,
      },
    });
    return { userId: u.id, customerId: customerId!, email: emailAddr };
  }

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    prisma = app.get(PrismaService);
    email = app.get(EMAIL_SENDER);
    await app.init();

    const t = await prisma.tenant.create({
      data: { name: 'Tenant 014', slug },
    });
    const o = await prisma.tenant.create({
      data: { name: 'Outro 014', slug: otherSlug },
    });
    tenantId = t.id;
    otherTenantId = o.id;

    for (const [tid, nome] of [
      [tenantId, 'Barbearia 014'],
      [otherTenantId, 'Outra 014'],
    ]) {
      await prisma.channelConfig.create({
        data: {
          tenantId: tid,
          businessName: nome,
          address: 'Rua Fictícia, 1',
          phone: '1100000000',
          workingHours: '9h às 19h',
          services: [],
        },
      });
    }

    const admin = await mkUser(tenantId, UserRole.ADMIN, 'Admin014');
    const barber = await mkUser(tenantId, UserRole.BARBEIRO, 'Barbeiro014');
    const otherAdmin = await mkUser(
      otherTenantId,
      UserRole.ADMIN,
      'OtherAdmin014',
    );
    const c1 = await mkUser(tenantId, UserRole.CLIENTE, 'Cliente1', true);
    const c2 = await mkUser(tenantId, UserRole.CLIENTE, 'Cliente2', true);
    const c3 = await mkUser(tenantId, UserRole.CLIENTE, 'Cliente3', true);

    adminToken = (await login(admin.email)).accessToken;
    barberToken = (await login(barber.email)).accessToken;
    otherAdminToken = (await login(otherAdmin.email)).accessToken;
    cliente1 = { ...c1, token: (await login(c1.email)).accessToken };
    cliente2 = { ...c2, token: (await login(c2.email)).accessToken };
    cliente3Token = (await login(c3.email)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Fila do dia e posição do cliente', () => {
    let a1: string;
    let a2: string;
    let a3: string;

    it('põe três clientes na fila; o primeiro termina, o segundo é cancelado', async () => {
      const enter = async (customerId: string) =>
        (
          await http()
            .post('/appointments')
            .set(auth(adminToken))
            .send({ customerId, services: ['Corte'] })
            .expect(201)
        ).body.id as string;
      a1 = await enter(cliente1.customerId);
      a2 = await enter(cliente2.customerId);
      const c3 = await prisma.user.findFirstOrThrow({
        where: { tenantId, name: 'Cliente3' },
      });
      a3 = await enter(c3.customerId!);

      await http()
        .patch(`/appointments/${a1}/start`)
        .set(auth(barberToken))
        .expect(200);
      await http()
        .patch(`/appointments/${a1}/finish`)
        .set(auth(barberToken))
        .send({ totalPrice: 45 })
        .expect(200);
      await http()
        .patch(`/appointments/${a2}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'Desistiu' })
        .expect(200);
    });

    it('GET /appointments/queue sem parâmetro continua só com AGUARDANDO e EM_ATENDIMENTO', async () => {
      const res = await http()
        .get('/appointments/queue')
        .set(auth(adminToken))
        .expect(200);
      const ids = res.body.data.map((x: { id: string }) => x.id);
      expect(ids).toEqual([a3]);
      expect(res.body.data[0].enteredAt).toBeDefined();
    });

    it('GET /appointments/queue?include=finished devolve também FINALIZADO e CANCELADO, com horários', async () => {
      const res = await http()
        .get('/appointments/queue?include=finished')
        .set(auth(adminToken))
        .expect(200);
      const byId = Object.fromEntries(
        res.body.data.map((x: { id: string }) => [x.id, x]),
      );
      expect(res.body.data.map((x: { id: string }) => x.id)).toEqual([
        a1,
        a2,
        a3,
      ]);
      expect(byId[a1].status).toBe('FINALIZADO');
      expect(byId[a1].enteredAt).toBe(byId[a1].createdAt);
      expect(byId[a1].startedAt).toBeTruthy();
      expect(byId[a1].finishedAt).toBeTruthy();
      expect(byId[a2].status).toBe('CANCELADO');
      expect(byId[a3].status).toBe('AGUARDANDO');
    });

    it('include inválido responde 400', async () => {
      await http()
        .get('/appointments/queue?include=tudo')
        .set(auth(adminToken))
        .expect(400);
    });

    it('GET /appointments/me/queue: cliente na fila vê posição e quantos estão na frente', async () => {
      // cliente3 é o único AGUARDANDO
      const res = await http()
        .get('/appointments/me/queue')
        .set(auth(cliente3Token))
        .expect(200);
      expect(res.body).toMatchObject({
        position: 1,
        ahead: 0,
        status: 'AGUARDANDO',
      });
      expect(typeof res.body.enteredAt).toBe('string');
    });

    it('conta apenas quem aguarda na frente', async () => {
      const novo = await mkUser(tenantId, UserRole.CLIENTE, 'Cliente4', true);
      const tk = (await login(novo.email)).accessToken;
      await http()
        .post('/appointments')
        .set(auth(adminToken))
        .send({ customerId: novo.customerId, services: ['Corte'] })
        .expect(201);
      const res = await http()
        .get('/appointments/me/queue')
        .set(auth(tk))
        .expect(200);
      expect(res.body).toMatchObject({
        position: 2,
        ahead: 1,
        status: 'AGUARDANDO',
      });
    });

    it('cliente fora da fila (finalizado) recebe tudo null', async () => {
      const res = await http()
        .get('/appointments/me/queue')
        .set(auth(cliente1.token))
        .expect(200);
      expect(res.body).toEqual({
        position: null,
        ahead: null,
        status: null,
        enteredAt: null,
      });
    });

    it('não é acessível por barbeiro e exige autenticação', async () => {
      await http()
        .get('/appointments/me/queue')
        .set(auth(barberToken))
        .expect(403);
      await http().get('/appointments/me/queue').expect(401);
    });

    it('é isolado por tenant: cliente de outro tenant não vê a fila deste', async () => {
      const outro = await mkUser(
        otherTenantId,
        UserRole.CLIENTE,
        'ClienteO',
        true,
      );
      const tk = (await login(outro.email)).accessToken;
      const res = await http()
        .get('/appointments/me/queue')
        .set(auth(tk))
        .expect(200);
      expect(res.body.position).toBeNull();
    });
  });

  describe('Spec 013 — autoatendimento', () => {
    const emailNovo = `novo-${run}@t014.example`;
    let tokens: { accessToken: string; refreshToken: string };

    it('POST /auth/register-client cria cliente e devolve tokens', async () => {
      ipCounter += 1;
      const res = await http()
        .post('/auth/register-client')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.2`)
        .send({
          name: 'Novo Cliente',
          phone: `1100${String(run).slice(-7)}`,
          email: emailNovo,
          password,
          tenantSlug: slug,
        })
        .expect(201);
      expect(res.body.accessToken).toBeDefined();
      tokens = res.body;
    });

    it('e-mail duplicado no tenant responde 409', async () => {
      ipCounter += 1;
      await http()
        .post('/auth/register-client')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.2`)
        .send({
          name: 'Novo Cliente',
          phone: '11000000099',
          email: emailNovo,
          password,
          tenantSlug: slug,
        })
        .expect(409);
    });

    it('senha fraca responde 400 e tenant inexistente 404', async () => {
      ipCounter += 1;
      await http()
        .post('/auth/register-client')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.2`)
        .send({
          name: 'Fraco',
          phone: '11000000098',
          password: 'abc',
          tenantSlug: slug,
        })
        .expect(400);
      await http()
        .post('/auth/register-client')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.2`)
        .send({
          name: 'Sem Casa',
          phone: '11000000097',
          password,
          tenantSlug: 'nao-existe-014',
        })
        .expect(404);
    });

    it('cliente recém-cadastrado gera QR de check-in e lê subscriptions/me e appointments/me vazios', async () => {
      const t = tokens.accessToken;
      const qr = await http().post('/checkin/token').set(auth(t)).expect(201);
      expect(qr.body.token).toMatch(/^[a-f0-9]{64}$/);
      const subs = await http()
        .get('/subscriptions/me')
        .set(auth(t))
        .expect(200);
      expect(subs.body.data).toEqual([]);
      const apps = await http()
        .get('/appointments/me')
        .set(auth(t))
        .expect(200);
      expect(apps.body.data).toEqual([]);
    });

    it('subscriptions/me e appointments/me mostram só os dados do próprio cliente', async () => {
      const apps = await http()
        .get('/appointments/me')
        .set(auth(cliente1.token))
        .expect(200);
      expect(apps.body.data.length).toBeGreaterThan(0);
      for (const a of apps.body.data) {
        expect(a.customerId).toBe(cliente1.customerId);
        expect(a.tenantId).toBe(tenantId);
      }
    });

    it('usuário CLIENTE sem customerId recebe 422 nos endpoints me', async () => {
      const sem = await mkUser(tenantId, UserRole.CLIENTE, 'SemVinculo');
      const tk = (await login(sem.email)).accessToken;
      await http().get('/subscriptions/me').set(auth(tk)).expect(422);
      await http().get('/appointments/me').set(auth(tk)).expect(422);
      await http().get('/appointments/me/queue').set(auth(tk)).expect(422);
    });
  });

  describe('Spec 012 — recuperação de senha por e-mail', () => {
    it('forgot-password responde 202 e envia o link pela fila (provedor de log)', async () => {
      ipCounter += 1;
      const res = await http()
        .post('/auth/forgot-password')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.3`)
        .send({ email: cliente2.email })
        .expect(202);
      expect(res.body).toEqual({ ok: true });

      const sent = await waitFor(() => email.lastSentTo(cliente2.email));
      expect(sent.subject).toBeDefined();
      expect(sent.link).toContain(`token=`);
      expect(sent.link).toContain(`tenant=${slug}`);
      // papel CLIENTE usa a URL do app do cliente
      expect(
        sent.link!.startsWith('http://localhost:3002/reset-password?'),
      ).toBe(true);
    });

    it('usuário da equipe recebe link com a URL do painel', async () => {
      const staff = await prisma.user.findFirstOrThrow({
        where: { tenantId, role: UserRole.ADMIN },
      });
      ipCounter += 1;
      await http()
        .post('/auth/forgot-password')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.3`)
        .send({ email: staff.email })
        .expect(202);
      const sent = await waitFor(() => email.lastSentTo(staff.email));
      expect(
        sent.link!.startsWith('http://localhost:3001/reset-password?'),
      ).toBe(true);
    });

    it('e-mail inexistente responde 202 idêntico e não envia nada', async () => {
      ipCounter += 1;
      const res = await http()
        .post('/auth/forgot-password')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.3`)
        .send({ email: `ninguem-${run}@t014.example` })
        .expect(202);
      expect(res.body).toEqual({ ok: true });
      await new Promise((r) => setTimeout(r, 300));
      expect(email.lastSentTo(`ninguem-${run}@t014.example`)).toBeUndefined();
    });

    it('reset-password com o token do e-mail troca a senha, é de uso único e revoga sessões', async () => {
      const sent = email.lastSentTo(cliente2.email)!;
      const token = new URL(sent.link!).searchParams.get('token')!;
      const before = await login(cliente2.email);

      ipCounter += 1;
      await http()
        .post('/auth/reset-password')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.4`)
        .send({ token, password: 'NovaSenha99' })
        .expect(200);

      // token já usado
      await http()
        .post('/auth/reset-password')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.4`)
        .send({ token, password: 'OutraSenha99' })
        .expect(401);
      // sessão antiga revogada
      await http()
        .post('/auth/refresh')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.5`)
        .send({ refreshToken: before.refreshToken })
        .expect(401);
      // senha nova funciona, a antiga não
      await login(cliente2.email, 'NovaSenha99');
      ipCounter += 1;
      await http()
        .post('/auth/login')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.1`)
        .send({ email: cliente2.email, password })
        .expect(401);
    });

    it('senha fraca no reset responde 400', async () => {
      ipCounter += 1;
      await http()
        .post('/auth/reset-password')
        .set('X-Forwarded-For', `${ipBase}.${ipCounter}.4`)
        .send({ token: 'qualquer', password: 'fraca' })
        .expect(400);
    });
  });

  describe('Pagamento PIX com provedor mock e cancelamento pelo cliente', () => {
    let planId: string;
    let subId: string;
    let paymentId: string;

    beforeAll(async () => {
      const plan = await prisma.plan.create({
        data: {
          tenantId,
          name: 'Plano 014',
          priceCents: 9000,
          intervalDays: 30,
        },
      });
      planId = plan.id;
    });

    it('cliente assina o plano (pendente) e gera o PIX mock para a própria assinatura', async () => {
      const sub = await http()
        .post('/subscriptions')
        .set(auth(cliente1.token))
        .send({ planId, customerId: cliente1.customerId })
        .expect(201);
      subId = sub.body.id;
      expect(sub.body.status).toBe(SubscriptionStatus.PENDENTE);

      const pay = await http()
        .post('/payments')
        .set(auth(cliente1.token))
        .send({ subscriptionId: subId, method: PaymentMethod.PIX })
        .expect(201);
      paymentId = pay.body.id;
      expect(pay.body.status).toBe(PaymentStatus.PENDENTE);
      expect(pay.body.qrCode).toContain('MOCK');
      expect(pay.body.paymentUrl).toBeTruthy();
    });

    it('cliente lê o status do próprio pagamento e não o de outro cliente', async () => {
      const own = await http()
        .get(`/payments/${paymentId}`)
        .set(auth(cliente1.token))
        .expect(200);
      expect(own.body.status).toBe('PENDENTE');
      await http()
        .get(`/payments/${paymentId}`)
        .set(auth(cliente3Token))
        .expect(403);
      await http()
        .get(`/payments/${paymentId}`)
        .set(auth(otherAdminToken))
        .expect(404);
    });

    it('cliente não gera pagamento para assinatura de outro', async () => {
      await http()
        .post('/payments')
        .set(auth(cliente3Token))
        .send({ subscriptionId: subId, method: PaymentMethod.PIX })
        .expect(403);
    });

    it('mock-approve aprova pelo caminho do webhook e ativa a assinatura', async () => {
      await http()
        .post(`/payments/${paymentId}/mock-approve`)
        .set(auth(cliente1.token))
        .expect(200);
      const pay = await http()
        .get(`/payments/${paymentId}`)
        .set(auth(cliente1.token))
        .expect(200);
      expect(pay.body.status).toBe('APROVADO');
      expect(pay.body.paidAt).toBeTruthy();
      await waitFor(async () => {
        const s = await prisma.subscription.findUnique({
          where: { id: subId },
        });
        return s?.status === SubscriptionStatus.ATIVO ? s : undefined;
      });
    });

    it('mock-approve é idempotente e respeita dono e tenant', async () => {
      await http()
        .post(`/payments/${paymentId}/mock-approve`)
        .set(auth(cliente1.token))
        .expect(200);
      await http()
        .post(`/payments/${paymentId}/mock-approve`)
        .set(auth(cliente3Token))
        .expect(403);
      await http()
        .post(`/payments/${paymentId}/mock-approve`)
        .set(auth(otherAdminToken))
        .expect(404);
      await http()
        .post(`/payments/${paymentId}/mock-approve`)
        .set(auth(barberToken))
        .expect(403);
    });

    it('cliente cancela a própria assinatura, mas não a de outro', async () => {
      await http()
        .patch(`/subscriptions/${subId}/cancel`)
        .set(auth(cliente3Token))
        .expect(403);
      const res = await http()
        .patch(`/subscriptions/${subId}/cancel`)
        .set(auth(cliente1.token))
        .expect(200);
      expect(res.body.status).toBe('CANCELADO');
    });
  });

  describe('Throttle: 429 no formato padrão', () => {
    it('a 6a tentativa de login do mesmo IP responde 429 com mensagem clara', async () => {
      const ip = `${ipBase}.250.${run % 250}`;
      let last: request.Response | undefined;
      for (let i = 0; i < 6; i++) {
        last = await http()
          .post('/auth/login')
          .set('X-Forwarded-For', ip)
          .send({ email: `x${i}@t014.example`, password: 'errada123' });
      }
      expect(last!.status).toBe(429);
      expect(last!.body).toMatchObject({
        statusCode: 429,
        error: 'Too Many Requests',
      });
      expect(last!.body.message).toMatch(/muitas/i);
      expect(last!.body.correlationId).toBeDefined();
    });
  });

  describe('Aparência por barbearia (/channels/config)', () => {
    it('padrão: brandColor #1F4FB8 e themeMode light', async () => {
      const res = await http()
        .get('/channels/config')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.brandColor).toBe('#1F4FB8');
      expect(res.body.themeMode).toBe('light');
    });

    it('ADMIN altera cor e tema', async () => {
      const res = await http()
        .patch('/channels/config')
        .set(auth(adminToken))
        .send({ brandColor: '#0a7c3e', themeMode: 'dark' })
        .expect(200);
      expect(res.body.brandColor).toBe('#0a7c3e');
      expect(res.body.themeMode).toBe('dark');
    });

    it('BARBEIRO recebe 403 ao alterar', async () => {
      await http()
        .patch('/channels/config')
        .set(auth(barberToken))
        .send({ brandColor: '#000000' })
        .expect(403);
    });

    it('CLIENTE lê a aparência, sem ids de integração', async () => {
      const res = await http()
        .get('/channels/config')
        .set(auth(cliente3Token))
        .expect(200);
      expect(res.body.brandColor).toBe('#0a7c3e');
      expect(res.body.themeMode).toBe('dark');
      expect(res.body.whatsappInstance).toBeNull();
      expect(res.body.instagramPageId).toBeNull();
    });

    it('CLIENTE não altera', async () => {
      await http()
        .patch('/channels/config')
        .set(auth(cliente3Token))
        .send({ themeMode: 'light' })
        .expect(403);
    });

    it('outro tenant não vê a aparência deste', async () => {
      const res = await http()
        .get('/channels/config')
        .set(auth(otherAdminToken))
        .expect(200);
      expect(res.body.brandColor).toBe('#1F4FB8');
      expect(res.body.themeMode).toBe('light');
    });

    it.each(['red', '#FFF', '#12345G', '1F4FB8', '#1F4FB8FF'])(
      'hex inválido %s responde 400',
      async (brandColor) => {
        await http()
          .patch('/channels/config')
          .set(auth(adminToken))
          .send({ brandColor })
          .expect(400);
      },
    );

    it('themeMode inválido responde 400', async () => {
      await http()
        .patch('/channels/config')
        .set(auth(adminToken))
        .send({ themeMode: 'azul' })
        .expect(400);
    });
  });
});
