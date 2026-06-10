import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConversationChannel,
  ConversationStatus,
  CustomerOrigin,
  MessageDirection,
} from '@prisma/client';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Env } from '../src/common/config/env.schema';
import { MENSAGEM_RECEBIDA } from '../src/common/events/message.events';
import { CONVERSATIONS_NAMESPACE } from '../src/modules/conversations/conversations.gateway';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feature 004 — Conversations & Messaging (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let accessToken: string;
  let tenantId: string;
  let otherTenantId: string;
  let internalApiKey: string;
  let customerId: string;
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
    await app.listen(0);

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'barbearia-modelo' },
    });
    expect(tenant).toBeTruthy();
    tenantId = tenant!.id;

    const otherTenant = await prisma.tenant.upsert({
      where: { slug: 'other-barbearia-004' },
      update: {},
      create: {
        name: 'Other Barbearia',
        slug: 'other-barbearia-004',
        active: true,
      },
    });
    otherTenantId = otherTenant.id;

    const loginRes = await login();
    accessToken = loginRes.accessToken;

    const phone = `119${Date.now().toString().slice(-8)}`;
    const customerRes = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cliente Conversas',
        phone,
        origin: CustomerOrigin.WHATSAPP,
      })
      .expect(201);

    customerId = customerRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.4.${loginIpCounter}.1`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return res.body;
  }

  function internalHeaders(): Record<string, string> {
    return {
      'X-Internal-Key': internalApiKey,
      'X-Tenant-Id': tenantId,
    };
  }

  describe('T004-05 T004-06 Conversations CRUD', () => {
    it('creates conversation and reuses active one on same channel', async () => {
      const first = await request(app.getHttpServer())
        .post('/conversations')
        .set(internalHeaders())
        .send({
          customerId,
          channel: ConversationChannel.WHATSAPP,
        })
        .expect(201);

      expect(first.body.id).toBeDefined();
      expect(first.body.status).toBe(ConversationStatus.ABERTA);
      expect(first.body.channel).toBe(ConversationChannel.WHATSAPP);

      const second = await request(app.getHttpServer())
        .post('/conversations')
        .set(internalHeaders())
        .send({
          customerId,
          channel: ConversationChannel.WHATSAPP,
        })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);
    });

    it('lists conversations with filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          status: ConversationStatus.ABERTA,
          channel: ConversationChannel.WHATSAPP,
        })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
      expect(res.body.data[0].customer).toBeDefined();
    });

    it('returns conversation stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/conversations/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.aberta).toBeGreaterThanOrEqual(1);
    });
  });

  describe('T004-10 Tenant isolation', () => {
    it('returns 404 for conversation from another tenant', async () => {
      const otherCustomer = await prisma.customer.create({
        data: {
          tenantId: otherTenantId,
          name: 'Outro Tenant',
          phone: `118${Date.now().toString().slice(-8)}`,
          origin: CustomerOrigin.MANUAL,
        },
      });

      const otherConversation = await prisma.conversation.create({
        data: {
          tenantId: otherTenantId,
          customerId: otherCustomer.id,
          channel: ConversationChannel.WHATSAPP,
          status: ConversationStatus.ABERTA,
        },
      });

      await request(app.getHttpServer())
        .get(`/conversations/${otherConversation.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/conversations/${otherConversation.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('T004-11 T004-13 T004-14 Messages', () => {
    let conversationId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set(internalHeaders())
        .send({
          customerId,
          channel: ConversationChannel.INSTAGRAM,
        })
        .expect(201);

      conversationId = res.body.id;
    });

    it('registers message and emits MENSAGEM_RECEBIDA', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      const res = await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set(internalHeaders())
        .send({
          content: 'Mensagem de teste',
          direction: MessageDirection.INBOUND,
          channel: ConversationChannel.INSTAGRAM,
          externalId: 'ext-001',
        })
        .expect(201);

      expect(res.body.content).toBe('Mensagem de teste');
      expect(res.body.effectiveConversationId).toBe(conversationId);

      expect(emitSpy).toHaveBeenCalledWith(
        MENSAGEM_RECEBIDA,
        expect.objectContaining({
          conversationId,
          tenantId,
          content: 'Mensagem de teste',
        }),
      );

      emitSpy.mockRestore();
    });

    it('lists messages most recent first', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set(internalHeaders())
        .send({
          content: 'Segunda mensagem',
          direction: MessageDirection.OUTBOUND,
          channel: ConversationChannel.INSTAGRAM,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0].content).toBe('Segunda mensagem');
    });
  });

  describe('T004-08 T004-15 Closed conversation creates new one', () => {
    it('creates new conversation when message sent to closed one', async () => {
      const created = await request(app.getHttpServer())
        .post('/conversations')
        .set(internalHeaders())
        .send({
          customerId,
          channel: ConversationChannel.WHATSAPP,
        })
        .expect(201);

      const closedConvId = created.body.id;

      await request(app.getHttpServer())
        .patch(`/conversations/${closedConvId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: ConversationStatus.FECHADA })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/conversations/${closedConvId}/messages`)
        .set(internalHeaders())
        .send({
          content: 'Nova mensagem após fechamento',
          direction: MessageDirection.INBOUND,
          channel: ConversationChannel.WHATSAPP,
        })
        .expect(201);

      expect(res.body.effectiveConversationId).not.toBe(closedConvId);

      const newConversation = await prisma.conversation.findUnique({
        where: { id: res.body.effectiveConversationId },
      });

      expect(newConversation?.status).toBe(ConversationStatus.ABERTA);
    });
  });

  describe('T004-20 T004-22 Socket.IO real-time', () => {
    it('notifies connected clients on message.new', async () => {
      const address = app.getHttpServer().address();
      const port =
        typeof address === 'object' && address !== null ? address.port : 3000;

      const socket: Socket = io(
        `http://127.0.0.1:${port}${CONVERSATIONS_NAMESPACE}`,
        {
          auth: { token: accessToken },
          transports: ['websocket'],
        },
      );

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
        setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
      });

      const messagePromise = new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          socket.on('message.new', (payload) => resolve(payload));
          setTimeout(() => reject(new Error('message.new timeout')), 5000);
        },
      );

      const convRes = await request(app.getHttpServer())
        .post('/conversations')
        .set(internalHeaders())
        .send({
          customerId,
          channel: ConversationChannel.INSTAGRAM,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/conversations/${convRes.body.id}/messages`)
        .set(internalHeaders())
        .send({
          content: 'Evento socket teste',
          direction: MessageDirection.INBOUND,
          channel: ConversationChannel.INSTAGRAM,
        })
        .expect(201);

      const payload = await messagePromise;
      expect(payload.content).toBe('Evento socket teste');

      socket.disconnect();
    });

    it('emits conversation.updated on status change', async () => {
      const address = app.getHttpServer().address();
      const port =
        typeof address === 'object' && address !== null ? address.port : 3000;

      const socket: Socket = io(
        `http://127.0.0.1:${port}${CONVERSATIONS_NAMESPACE}`,
        {
          auth: { token: accessToken },
          transports: ['websocket'],
        },
      );

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
        setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
      });

      const convRes = await request(app.getHttpServer())
        .post('/conversations')
        .set(internalHeaders())
        .send({
          customerId,
          channel: ConversationChannel.WHATSAPP,
        })
        .expect(201);

      const updatePromise = new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          socket.on('conversation.updated', (payload) => resolve(payload));
          setTimeout(
            () => reject(new Error('conversation.updated timeout')),
            5000,
          );
        },
      );

      await request(app.getHttpServer())
        .patch(`/conversations/${convRes.body.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: ConversationStatus.AGUARDANDO })
        .expect(200);

      const payload = await updatePromise;
      expect(payload.status).toBe(ConversationStatus.AGUARDANDO);

      socket.disconnect();
    });
  });

  describe('T004-23 Customer conversations endpoint', () => {
    it('returns real conversation data for customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/customers/${customerId}/conversations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].customerId).toBe(customerId);
    });
  });
});
