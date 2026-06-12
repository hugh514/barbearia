import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { ChannelConfigService } from '@modules/channel-config/channel-config.service';
import { ConversationsGateway } from '@modules/conversations/conversations.gateway';
import { ConversationsService } from '@modules/conversations/conversations.service';
import { toConversationResponse } from '@modules/conversations/conversations.mapper';
import { MessagesService } from '@modules/messages/messages.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

export interface ChannelReplyParams {
  tenantId: string;
  userId: string;
  channel: ConversationChannel;
  conversationId: string;
  message: string;
}

@Injectable()
export class ChannelsReplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly channelConfigService: ChannelConfigService,
    private readonly whatsAppService: WhatsAppService,
    private readonly instagramService: InstagramService,
    private readonly gateway: ConversationsGateway,
  ) {}

  async reply(params: ChannelReplyParams): Promise<void> {
    const conversation =
      await this.conversationsService.findConversationInTenant(
        params.conversationId,
        params.tenantId,
      );

    if (conversation.channel !== params.channel) {
      throw new BadRequestException(
        `Conversation channel mismatch: expected ${conversation.channel}`,
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: conversation.customerId, tenantId: params.tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const config = await this.channelConfigService.findConfigEntity(
      params.tenantId,
    );
    if (!config) {
      throw new NotFoundException('Channel config not found');
    }

    if (params.channel === ConversationChannel.WHATSAPP) {
      await this.whatsAppService.sendText({
        instance: config.whatsappInstance,
        phone: customer.phone,
        text: params.message,
      });
    } else {
      if (!customer.instagramId) {
        throw new BadRequestException('Customer has no Instagram ID');
      }

      await this.instagramService.sendMessage({
        pageId: config.instagramPageId,
        recipientId: customer.instagramId,
        text: params.message,
      });
    }

    await this.messagesService.create(params.tenantId, params.conversationId, {
      content: params.message,
      direction: MessageDirection.OUTBOUND,
      channel: params.channel,
    });

    await this.prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        status: ConversationStatus.EM_ATENDIMENTO,
        assignedTo: params.userId,
      },
    });

    const updated = await this.prisma.conversation.findFirstOrThrow({
      where: { id: params.conversationId, tenantId: params.tenantId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    this.gateway.emitConversationUpdated(
      params.tenantId,
      toConversationResponse(updated),
    );
  }
}
