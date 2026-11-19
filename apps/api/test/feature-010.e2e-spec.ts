import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConversationChannel,
  ConversationStatus,
  CustomerOrigin,
  MessageDirection,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Env } from '../src/common/config/env.schema';
import { OPENAI_PROVIDER } from '../src/modules/ai/providers/openai.provider';
import { CONVERSATIONS_NAMESPACE } from '../src/modules/conversations/conversations.gateway';
import { INSTAGRAM_GRAPH_PROVIDER } from '../src/modules/instagram/providers/instagram-graph.provider';
import { EVOLUTION_API_PROVIDER } from '../src/modules/whatsapp/providers/evolution-api.provider';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  NOTIFICATION_JOB_NAMES,
  QUEUE_NOTIFICATIONS,
  QUEUE_POST_ATTENDANCE,
} from '../src/queue/queue.constants';
import { NotificationsProcessor } from '../src/queue/processors/notifications.processor';
import {
  getSentInstagramMessages,
  resetMockInstagramGraph,
  MockInstagramGraphProvider,
} from './mocks/mock-instagram-graph.provider';
import {
  getSentWhatsAppMessages,
  resetMockEvolutionApi,
  MockEvolutionApiProvider,
} from './mocks/mock-evolution-api.provider';
import {
  MockOpenAiProvider,
  resetMockOpenAi,
} from './mocks/mock-openai.provider';

describe('Feature 010 — WhatsApp, Instagram & AI (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let adminUserId: string;
  let internalApiKey: string;
  let notificationsQueue: Queue;
  let postAttendanceQueue: Queue;
  let loginIpCounter = 0;

  const adminEmail = 'admin@barbearia.example';
  const adminPassword = 'admin123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OPENAI_PROVIDER)
      .useClass(MockOpenAiProvider)
      .overrideProvider(EVOLUTION_API_PROVIDER)
      .useClass(MockEvolutionApiProvider)
      .overrideProvider(INSTAGRAM_GRAPH_PROVIDER)
      .useClass(MockInstagramGraphProvider)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    prisma = app.get(PrismaService);
    internalApiKey = app
      .get(ConfigService<Env, true>)
      .get('INTERNAL_API_KEY', { infer: true });
    notificationsQueue = app.get(getQueueToken(QUEUE_NOTIFICATIONS));
    postAttendanceQueue = app.get(getQueueToken(QUEUE_POST_ATTENDANCE));

    await app.init();
    await app.listen(0);

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

  beforeEach(() => {
    resetMockOpenAi();
    resetMockEvolutionApi();
    resetMockInstagramGraph();
  });

  afterAll(async () => {
    await notificationsQueue.close();
    await postAttendanceQueue.close();
    await app.close();
  });

  async function login(): Promise<{ accessToken: string }> {
    loginIpCounter += 1;
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.10.${loginIpCounter}.1`)
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

  // Evolution API sends the configured API key in the "apikey" header.
  // In tests, the MockEvolutionApiProvider.verifyWebhook() always returns true
  // regardless of the key, so any non-empty value satisfies the guard.
  function whatsappWebhookHeaders(): Record<string, string> {
    return { apikey: 'dev-evolution-api-key-for-tests' };
  }

  // Meta sends an X-Hub-Signature-256 header with HMAC-SHA256 of the raw body.
  // In tests, MockInstagramGraphProvider.verifySignature() always returns true,
  // so any value here satisfies the guard (rawBody must be present though).
  function instagramWebhookHeaders(): Record<string, string> {
    return { 'x-hub-signature-256': 'sha256=dev-test-signature' };
  }

  describe('T010-04 channel config', () => {
    it('GET /channels/config returns Barbearia Modelo config from seed', async () => {
      const res = await request(app.getHttpServer())
        .get('/channels/config')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.businessName).toBe('Barbearia Modelo');
      expect(res.body.whatsappInstance).toBe('barbearia-modelo');
      expect(res.body.services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Corte', price: 'R$ 45,00' }),
        ]),
      );
    });
  });

  describe('T010-12/T010-13 AI responses', () => {
    it('price question returns configured price via WhatsApp flow', async () => {
      const phone = `5511${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-${phone}`,
            },
            message: { conversation: 'quanto custa o corte?' },
          },
        })
        .expect(200);

      const sent = getSentWhatsAppMessages();
      expect(sent.some((m) => m.text.includes('R$ 45,00'))).toBe(true);

      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone },
      });
      expect(customer).toBeTruthy();
      expect(customer!.origin).toBe(CustomerOrigin.WHATSAPP);
    });

    it('human transfer marks conversation AGUARDANDO', async () => {
      const phone = `5512${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-transfer-${phone}`,
            },
            message: { conversation: 'quero falar com alguém' },
          },
        })
        .expect(200);

      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone },
      });

      const conversation = await prisma.conversation.findFirst({
        where: {
          tenantId,
          customerId: customer!.id,
          channel: ConversationChannel.WHATSAPP,
        },
      });

      expect(conversation!.status).toBe(ConversationStatus.AGUARDANDO);
    });
  });

  describe('T010-19/T010-25 inbound webhooks', () => {
    it('new WhatsApp number creates customer, conversation and outbound reply', async () => {
      const phone = `5513${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-new-${phone}`,
            },
            message: { conversation: 'olá' },
          },
        })
        .expect(200);

      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone },
      });
      expect(customer).toBeTruthy();

      const conversation = await prisma.conversation.findFirst({
        where: { tenantId, customerId: customer!.id },
      });
      expect(conversation).toBeTruthy();

      const outbound = await prisma.message.findFirst({
        where: {
          tenantId,
          conversationId: conversation!.id,
          direction: MessageDirection.OUTBOUND,
        },
      });
      expect(outbound).toBeTruthy();
      expect(getSentWhatsAppMessages().length).toBeGreaterThan(0);
    });

    it('Instagram DM creates customer with INSTAGRAM origin', async () => {
      const senderId = `ig-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/channels/instagram/webhook')
        .set(instagramWebhookHeaders())
        .send({
          object: 'instagram',
          entry: [
            {
              id: 'barbearia-modelo-page',
              messaging: [
                {
                  sender: { id: senderId },
                  recipient: { id: 'barbearia-modelo-page' },
                  message: { mid: `mid-${senderId}`, text: 'olá instagram' },
                },
              ],
            },
          ],
        })
        .expect(200);

      const customer = await prisma.customer.findFirst({
        where: { tenantId, instagramId: senderId },
      });

      expect(customer).toBeTruthy();
      expect(customer!.origin).toBe(CustomerOrigin.INSTAGRAM);

      const sent = getSentInstagramMessages();
      expect(sent.length).toBeGreaterThan(0);
    });

    it('GET /channels/instagram/webhook returns challenge', async () => {
      const res = await request(app.getHttpServer())
        .get('/channels/instagram/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'dev-instagram-verify-token',
          'hub.challenge': 'challenge-123',
        })
        .expect(200);

      expect(res.text).toBe('challenge-123');
    });
  });

  describe('T010-29/T010-30 human handling and backoffice reply', () => {
    it('AGUARDANDO conversation does not get AI reply on new message', async () => {
      const phone = `5514${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-human-${phone}`,
            },
            message: { conversation: 'quero falar com alguém' },
          },
        })
        .expect(200);

      resetMockEvolutionApi();

      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-human-2-${phone}`,
            },
            message: { conversation: 'ainda preciso de ajuda' },
          },
        })
        .expect(200);

      expect(getSentWhatsAppMessages()).toHaveLength(0);
    });

    it('POST /channels/whatsapp/reply sends via correct channel', async () => {
      const phone = `5515${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-reply-${phone}`,
            },
            message: { conversation: 'quero falar com alguém' },
          },
        })
        .expect(200);

      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone },
      });

      const conversation = await prisma.conversation.findFirst({
        where: { tenantId, customerId: customer!.id },
      });

      resetMockEvolutionApi();

      await request(app.getHttpServer())
        .post('/channels/whatsapp/reply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          conversationId: conversation!.id,
          message: 'Olá, sou o barbeiro. Como posso ajudar?',
        })
        .expect(201);

      const sent = getSentWhatsAppMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0].phone).toBe(phone);

      const updated = await prisma.conversation.findUnique({
        where: { id: conversation!.id },
      });
      expect(updated!.status).toBe(ConversationStatus.EM_ATENDIMENTO);
      expect(updated!.assignedTo).toBe(adminUserId);
    });
  });

  describe('T010-17/T010-33 WhatsApp send and post-attendance', () => {
    it('POST /channels/whatsapp/send delivers active message', async () => {
      const phone = `5516${Date.now().toString().slice(-8)}`;

      await request(app.getHttpServer())
        .post('/channels/whatsapp/send')
        .set(internalHeaders())
        .send({ phone, message: 'Mensagem ativa de teste' })
        .expect(202);

      const sent = getSentWhatsAppMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0].text).toBe('Mensagem ativa de teste');
    });

    it('notification processor sends WhatsApp after post-attendance', async () => {
      const phone = `5517${Date.now().toString().slice(-8)}`;
      const customer = await prisma.customer.create({
        data: {
          tenantId,
          name: 'Cliente Notificação',
          phone,
          origin: CustomerOrigin.MANUAL,
        },
      });

      const processor = app.get(NotificationsProcessor);
      await processor.process({
        id: 'test-job',
        name: NOTIFICATION_JOB_NAMES.GOOGLE_REVIEW,
        data: {
          tenantId,
          customerId: customer.id,
          phone,
          type: NOTIFICATION_JOB_NAMES.GOOGLE_REVIEW,
        },
        attemptsMade: 0,
      } as Parameters<NotificationsProcessor['process']>[0]);

      const sent = getSentWhatsAppMessages();
      expect(
        sent.some(
          (m) =>
            m.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') &&
            m.text.includes('Google'),
        ),
      ).toBe(true);
    });
  });

  describe('T010-27 socket conversation.updated', () => {
    it('emits conversation.updated when transferred to human', async () => {
      const baseUrl = await app.getUrl();
      const socket: Socket = io(`${baseUrl}${CONVERSATIONS_NAMESPACE}`, {
        auth: { token: accessToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('socket timeout')), 5000);
      });

      const updatedPromise = new Promise<ConversationStatus>((resolve) => {
        socket.on(
          'conversation.updated',
          (payload: { status: ConversationStatus }) => {
            resolve(payload.status);
          },
        );
      });

      const phone = `5518${Date.now().toString().slice(-8)}`;
      await request(app.getHttpServer())
        .post('/channels/whatsapp/webhook')
        .set(whatsappWebhookHeaders())
        .send({
          event: 'messages.upsert',
          instance: 'barbearia-modelo',
          data: {
            key: {
              remoteJid: `${phone}@s.whatsapp.net`,
              fromMe: false,
              id: `wamid-socket-${phone}`,
            },
            message: { conversation: 'quero falar com alguém' },
          },
        })
        .expect(200);

      const status = await Promise.race([
        updatedPromise,
        new Promise<ConversationStatus>((_, reject) =>
          setTimeout(() => reject(new Error('socket event timeout')), 5000),
        ),
      ]);

      expect(status).toBe(ConversationStatus.AGUARDANDO);
      socket.disconnect();
    });
  });
});
