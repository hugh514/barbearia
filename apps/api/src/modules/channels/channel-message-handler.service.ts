import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ChannelConfig,
  ConversationChannel,
  ConversationStatus,
  Customer,
  CustomerOrigin,
  MessageDirection,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { AiService } from '@modules/ai/ai.service';
import { ChannelConfigService } from '@modules/channel-config/channel-config.service';
import { ConversationsGateway } from '@modules/conversations/conversations.gateway';
import { ConversationsService } from '@modules/conversations/conversations.service';
import { toConversationResponse } from '@modules/conversations/conversations.mapper';
import { CustomersService } from '@modules/customers/customers.service';
import { MessagesService } from '@modules/messages/messages.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

export interface InboundMessageParams {
  tenantId: string;
  channel: ConversationChannel;
  content: string;
  externalId?: string;
  phone?: string;
  instagramId?: string;
  customerName?: string;
}

const HUMAN_HANDLED_STATUSES: ConversationStatus[] = [
  ConversationStatus.AGUARDANDO,
  ConversationStatus.EM_ATENDIMENTO,
];

@Injectable()
export class ChannelMessageHandlerService {
  private readonly logger = new Logger(ChannelMessageHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly channelConfigService: ChannelConfigService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsAppService: WhatsAppService,
    @Inject(forwardRef(() => InstagramService))
    private readonly instagramService: InstagramService,
    private readonly gateway: ConversationsGateway,
  ) {}

  async handleInbound(params: InboundMessageParams): Promise<void> {
    const customer = await this.resolveCustomer(params);
    const conversation = await this.resolveConversation(
      params.tenantId,
      customer.id,
      params.channel,
    );

    await this.messagesService.create(params.tenantId, conversation.id, {
      content: params.content,
      direction: MessageDirection.INBOUND,
      channel: params.channel,
      externalId: params.externalId,
    });

    const currentConversation =
      await this.conversationsService.findConversationInTenant(
        conversation.id,
        params.tenantId,
      );

    if (HUMAN_HANDLED_STATUSES.includes(currentConversation.status)) {
      this.logger.debug({
        msg: 'Skipping AI — human handling conversation',
        conversationId: conversation.id,
        status: currentConversation.status,
      });
      return;
    }

    const config = await this.channelConfigService.findConfigEntity(
      params.tenantId,
    );
    if (!config) {
      throw new NotFoundException('Channel config not found for tenant');
    }

    const recentMessages = await this.prisma.message.findMany({
      where: {
        tenantId: params.tenantId,
        conversationId: conversation.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const aiResult = await this.aiService.processMessage({
      config,
      customer,
      history: recentMessages.reverse(),
      newMessage: params.content,
    });

    await this.executeActions(
      params.tenantId,
      customer,
      conversation.id,
      aiResult.actions,
    );

    if (aiResult.text.trim().length > 0) {
      await this.sendOutbound({
        tenantId: params.tenantId,
        channel: params.channel,
        customer,
        config,
        conversationId: conversation.id,
        content: aiResult.text,
      });
    }
  }

  private async resolveCustomer(
    params: InboundMessageParams,
  ): Promise<Customer> {
    if (params.channel === ConversationChannel.WHATSAPP) {
      if (!params.phone) {
        throw new Error('Phone is required for WhatsApp inbound messages');
      }

      const upserted = await this.customersService.upsert(params.tenantId, {
        phone: params.phone,
        name: params.customerName,
        origin: CustomerOrigin.WHATSAPP,
      });

      return this.prisma.customer.findFirstOrThrow({
        where: { id: upserted.id, tenantId: params.tenantId },
      });
    }

    if (!params.instagramId) {
      throw new Error(
        'Instagram ID is required for Instagram inbound messages',
      );
    }

    const upserted = await this.customersService.upsertFromInstagram(
      params.tenantId,
      {
        instagramId: params.instagramId,
        name: params.customerName,
      },
    );

    return this.prisma.customer.findFirstOrThrow({
      where: { id: upserted.id, tenantId: params.tenantId },
    });
  }

  private async resolveConversation(
    tenantId: string,
    customerId: string,
    channel: ConversationChannel,
  ) {
    const existing = await this.conversationsService.findActiveConversation(
      tenantId,
      customerId,
      channel,
    );

    if (existing) {
      return existing;
    }

    return this.conversationsService.createConversationForCustomer(
      tenantId,
      customerId,
      channel,
    );
  }

  private async executeActions(
    tenantId: string,
    customer: Customer,
    conversationId: string,
    actions: { type: string; field?: string; value?: string }[],
  ): Promise<void> {
    for (const action of actions) {
      if (action.type === 'TRANSFER_TO_HUMAN') {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { status: ConversationStatus.AGUARDANDO },
        });

        const conversation = await this.prisma.conversation.findFirstOrThrow({
          where: { id: conversationId, tenantId, deletedAt: null },
          include: {
            customer: true,
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        });

        this.gateway.emitConversationUpdated(
          tenantId,
          toConversationResponse(conversation),
        );
      }

      if (
        action.type === 'UPDATE_CUSTOMER' &&
        action.field === 'name' &&
        action.value
      ) {
        await this.customersService.update(tenantId, customer.id, {
          name: action.value,
        });
      }
    }
  }

  async sendOutbound(params: {
    tenantId: string;
    channel: ConversationChannel;
    customer: Customer;
    config: ChannelConfig;
    conversationId: string;
    content: string;
    externalId?: string;
  }): Promise<void> {
    if (params.channel === ConversationChannel.WHATSAPP) {
      await this.whatsAppService.sendText({
        instance: params.config.whatsappInstance,
        phone: params.customer.phone,
        text: params.content,
      });
    } else {
      const recipientId = params.customer.instagramId;
      if (!recipientId) {
        throw new Error('Customer has no instagramId for outbound message');
      }

      await this.instagramService.sendMessage({
        pageId: params.config.instagramPageId,
        recipientId,
        text: params.content,
      });
    }

    await this.messagesService.create(params.tenantId, params.conversationId, {
      content: params.content,
      direction: MessageDirection.OUTBOUND,
      channel: params.channel,
      externalId: params.externalId,
    });
  }
}
