import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConversationChannel, MessageDirection } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { ChannelMessageHandlerService } from '@modules/channels/channel-message-handler.service';
import { ChannelConfigService } from '@modules/channel-config/channel-config.service';
import { ConversationsService } from '@modules/conversations/conversations.service';
import { MessagesService } from '@modules/messages/messages.service';
import {
  EVOLUTION_API_PROVIDER,
  EvolutionApiProvider,
} from './providers/evolution-api.provider';

export interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  apikey?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
    messageTimestamp?: number | string;
    pushName?: string;
  };
}

export interface WhatsAppSendParams {
  tenantId: string;
  phone: string;
  message: string;
  conversationId?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly channelConfigService: ChannelConfigService,
    @Inject(forwardRef(() => ChannelMessageHandlerService))
    private readonly channelMessageHandler: ChannelMessageHandlerService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
    @Inject(EVOLUTION_API_PROVIDER)
    private readonly evolutionApi: EvolutionApiProvider,
  ) {}

  async handleWebhook(payload: EvolutionWebhookPayload): Promise<void> {
    if (payload.event && payload.event !== 'messages.upsert') {
      return;
    }

    const data = payload.data;
    if (!data?.key || data.key.fromMe) {
      return;
    }

    const instanceId = payload.instance;
    if (!instanceId) {
      throw new BadRequestException('Missing instance in webhook payload');
    }

    const config =
      await this.channelConfigService.findByWhatsappInstance(instanceId);
    if (!config) {
      this.logger.warn(
        `Webhook rejected: no tenant configured for WhatsApp instance ${instanceId}`,
      );
      throw new NotFoundException('Webhook not accepted');
    }

    const phone = this.extractPhone(data.key.remoteJid);
    const content = this.extractContent(data.message);
    if (!content) {
      return;
    }

    await this.channelMessageHandler.handleInbound({
      tenantId: config.tenantId,
      channel: ConversationChannel.WHATSAPP,
      phone,
      content,
      externalId: data.key.id,
      customerName: data.pushName,
    });
  }

  async send(params: WhatsAppSendParams): Promise<void> {
    const config = await this.channelConfigService.findConfigEntity(
      params.tenantId,
    );
    if (!config?.whatsappInstance) {
      throw new NotFoundException(
        'WhatsApp instance not configured for tenant',
      );
    }

    await this.evolutionApi.sendText({
      instance: config.whatsappInstance,
      phone: params.phone,
      text: params.message,
    });

    if (params.conversationId) {
      await this.messagesService.create(
        params.tenantId,
        params.conversationId,
        {
          content: params.message,
          direction: MessageDirection.OUTBOUND,
          channel: ConversationChannel.WHATSAPP,
        },
      );
      return;
    }

    const customer = await this.prisma.customer.findFirst({
      where: { tenantId: params.tenantId, phone: params.phone },
    });

    if (!customer) {
      return;
    }

    const conversation = await this.conversationsService.findActiveConversation(
      params.tenantId,
      customer.id,
      ConversationChannel.WHATSAPP,
    );

    if (!conversation) {
      return;
    }

    await this.messagesService.create(params.tenantId, conversation.id, {
      content: params.message,
      direction: MessageDirection.OUTBOUND,
      channel: ConversationChannel.WHATSAPP,
    });
  }

  async sendText(params: {
    instance: string | null | undefined;
    phone: string;
    text: string;
  }): Promise<void> {
    if (!params.instance) {
      throw new BadRequestException('WhatsApp instance is not configured');
    }

    await this.evolutionApi.sendText({
      instance: params.instance,
      phone: params.phone,
      text: params.text,
    });
  }

  verifyWebhook(apiKey?: string): boolean {
    return this.evolutionApi.verifyWebhook(apiKey);
  }

  private extractPhone(remoteJid?: string): string {
    if (!remoteJid) {
      throw new BadRequestException('Missing sender in webhook payload');
    }

    return remoteJid.split('@')[0].replace(/\D/g, '');
  }

  private extractContent(
    message?: NonNullable<EvolutionWebhookPayload['data']>['message'],
  ): string | null {
    if (!message) {
      return null;
    }

    if (message.conversation) {
      return message.conversation;
    }

    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }

    return null;
  }
}
