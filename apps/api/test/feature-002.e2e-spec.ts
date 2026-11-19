import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Env } from '../src/common/config/env.schema';
import { PrismaService } from '../src/prisma/prisma.service';
import { BCRYPT_ROUNDS } from '../src/modules/auth/auth.constants';

describe('Feature 002 — Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtSecret: string;
  let loginIpCounter = 0;

  const adminEmail = 'admin@barbearia.example';
  const adminPassword = 'admin123';
  const validUserPassword = 'Password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    jwtSecret = app.get(ConfigService<Env, true>).get('JWT_SECRET', {
      infer: true,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(
    email = adminEmail,
    password = adminPassword,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.0.${loginIpCounter}.1`)
      .send({ email, password })
      .expect(200);

    return res.body;
  }

  describe('T002-09 T002-10 Login', () => {
    it('returns tokens for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      const decoded = jwt.decode(res.body.accessToken) as {
        sub: string;
        tenantId: string;
        role: string;
        email: string;
      };

      expect(decoded.sub).toBeDefined();
      expect(decoded.tenantId).toBeDefined();
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.email).toBe(adminEmail);
    });

    it('returns 401 for wrong password without revealing email existence', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: 'wrong-password' })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials');
    });

    it('returns 401 for inactive user', async () => {
      const tenant = await prisma.tenant.findFirst({
        where: { slug: 'barbearia-modelo' },
      });
      expect(tenant).toBeTruthy();

      const inactiveEmail = 'inactive@barbearia.example';
      const passwordHash = await bcrypt.hash(validUserPassword, BCRYPT_ROUNDS);

      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId: tenant!.id,
            email: inactiveEmail,
          },
        },
        update: { active: false, passwordHash },
        create: {
          tenantId: tenant!.id,
          name: 'Inactive User',
          email: inactiveEmail,
          passwordHash,
          role: UserRole.BARBEIRO,
          active: false,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: inactiveEmail, password: validUserPassword })
        .expect(401);
    });
  });

  describe('T002-15 T002-16 T002-17 Refresh & Logout', () => {
    it('returns new token pair on valid refresh', async () => {
      const tokens = await login();

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('returns 401 when refresh token is reused (replay prevention)', async () => {
      const tokens = await login();

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it('invalidates refresh token after logout', async () => {
      const tokens = await login();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });
  });

  describe('T002-23 T002-24 T002-25 RBAC guards', () => {
    it('returns 403 for insufficient role', async () => {
      const tenant = await prisma.tenant.findFirst({
        where: { slug: 'barbearia-modelo' },
      });
      const barberEmail = 'barber-rbac@barbearia.example';
      const barberPassword = 'barber123456';
      const passwordHash = await bcrypt.hash(barberPassword, BCRYPT_ROUNDS);

      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId: tenant!.id,
            email: barberEmail,
          },
        },
        update: { passwordHash, role: UserRole.BARBEIRO, active: true },
        create: {
          tenantId: tenant!.id,
          name: 'Barber RBAC',
          email: barberEmail,
          passwordHash,
          role: UserRole.BARBEIRO,
          active: true,
        },
      });

      const barberTokens = await login(barberEmail, barberPassword);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${barberTokens.accessToken}`)
        .expect(403);
    });

    it('returns 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        {
          sub: '00000000-0000-4000-8000-000000000001',
          tenantId: '00000000-0000-4000-8000-000000000002',
          role: UserRole.ADMIN,
          email: 'expired@test.example',
        },
        jwtSecret,
        { expiresIn: '0s' },
      );

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('returns 401 when token is missing', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('T002-31 T002-32 T002-33 Users CRUD', () => {
    it('returns logged-in user profile', async () => {
      const tokens = await login();

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(adminEmail);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 403 when BARBEIRO tries to create users', async () => {
      const tenant = await prisma.tenant.findFirst({
        where: { slug: 'barbearia-modelo' },
      });
      const barberEmail = 'barber-create@barbearia.example';
      const barberPassword = 'barber123456';
      const passwordHash = await bcrypt.hash(barberPassword, BCRYPT_ROUNDS);

      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId: tenant!.id,
            email: barberEmail,
          },
        },
        update: { passwordHash, role: UserRole.BARBEIRO, active: true },
        create: {
          tenantId: tenant!.id,
          name: 'Barber Create',
          email: barberEmail,
          passwordHash,
          role: UserRole.BARBEIRO,
          active: true,
        },
      });

      const barberTokens = await login(barberEmail, barberPassword);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${barberTokens.accessToken}`)
        .send({
          name: 'New User',
          email: 'newuser@barbearia.example',
          password: validUserPassword,
          role: UserRole.BARBEIRO,
        })
        .expect(403);
    });

    it('returns 409 for duplicate email in tenant', async () => {
      const tokens = await login();
      const duplicateEmail = `dup-${Date.now()}@barbearia.example`;

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'First User',
          email: duplicateEmail,
          password: validUserPassword,
          role: UserRole.BARBEIRO,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Second User',
          email: duplicateEmail,
          password: validUserPassword,
          role: UserRole.BARBEIRO,
        })
        .expect(409);
    });
  });

  describe('T002-42 Tenant isolation', () => {
    it('returns 403 when accessing user from another tenant', async () => {
      const otherTenant = await prisma.tenant.upsert({
        where: { slug: 'other-tenant-002' },
        update: {},
        create: {
          name: 'Other Tenant',
          slug: 'other-tenant-002',
          active: true,
        },
      });

      const passwordHash = await bcrypt.hash('other123456', BCRYPT_ROUNDS);
      const otherUser = await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId: otherTenant.id,
            email: 'other@tenant.example',
          },
        },
        update: { passwordHash, active: true },
        create: {
          tenantId: otherTenant.id,
          name: 'Other Tenant User',
          email: 'other@tenant.example',
          passwordHash,
          role: UserRole.BARBEIRO,
          active: true,
        },
      });

      const adminTokens = await login();

      await request(app.getHttpServer())
        .patch(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('T002-37 Rate limiting on login', () => {
    it('returns 429 on 6th login attempt within a minute', async () => {
      const uniqueIp = `10.99.${Date.now() % 200}.${Date.now() % 200}`;

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', uniqueIp)
          .send({ email: 'ratelimit@test.example', password: 'wrong' })
          .expect(401);
      }

      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', uniqueIp)
        .send({ email: 'ratelimit@test.example', password: 'wrong' })
        .expect(429);
    });
  });
});
