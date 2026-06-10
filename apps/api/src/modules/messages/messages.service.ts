import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationStatus } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import {
  MENSAGEM_RECEBIDA,
  MensagemRecebidaPayload,
} from '@common/events/message.events';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { ConversationsGateway } from '@modules/conversations/conversations.gateway';
import { ConversationsService } from '@modules/conversations/conversations.service';
import { toMessageResponse } from '@modules/conversations/conversations.mapper';
import { CreateMessageDto } from '@modules/messages/dto/create-message.dto';
import {
  CreateMessageResponseDto,
  MessageResponseDto,
} from '@modules/messages/dto/message-response.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: ConversationsGateway,
  ) {}

  async create(
    tenantId: string,
    conversationId: string,
    dto: CreateMessageDto,
  ): Promise<CreateMessageResponseDto> {
    const conversation =
      await this.conversationsService.findConversationInTenant(
        conversationId,
        tenantId,
      );

    let effectiveConversationId = conversation.id;

    if (conversation.status === ConversationStatus.FECHADA) {
      const newConversation =
        await this.conversationsService.createConversationForCustomer(
          tenantId,
          conversation.customerId,
          dto.channel,
        );
      effectiveConversationId = newConversation.id;
    }

    const message = await this.prisma.message.create({
      data: {
        tenantId,
        conversationId: effectiveConversationId,
        content: dto.content,
        direction: dto.direction,
        channel: dto.channel,
        externalId: dto.externalId,
      },
    });

    await this.prisma.conversation.update({
      where: { id: effectiveConversationId },
      data: { updatedAt: new Date() },
    });

    const response = toMessageResponse(message);
    const effectiveConversation =
      await this.conversationsService.findConversationInTenant(
        effectiveConversationId,
        tenantId,
      );

    const payload: MensagemRecebidaPayload = {
      messageId: message.id,
      conversationId: effectiveConversationId,
      tenantId,
      customerId: effectiveConversation.customerId,
      content: message.content,
      direction: message.direction,
      channel: message.channel,
      externalId: message.externalId,
    };

    this.eventEmitter.emit(MENSAGEM_RECEBIDA, payload);
    this.gateway.emitMessageNew(tenantId, response);

    return {
      ...response,
      effectiveConversationId,
    };
  }

  async findAll(
    tenantId: string,
    conversationId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<MessageResponseDto>> {
    await this.conversationsService.findConversationInTenant(
      conversationId,
      tenantId,
    );

    const where = { tenantId, conversationId };
    const skip = getPaginationSkip(page, perPage);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.message.count({ where }),
    ]);

    return buildPaginatedResult(
      messages.map(toMessageResponse),
      total,
      page,
      perPage,
    );
  }
}
