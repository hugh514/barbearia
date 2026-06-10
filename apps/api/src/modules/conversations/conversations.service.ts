import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Conversation,
  ConversationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { CreateConversationDto } from '@modules/conversations/dto/create-conversation.dto';
import { ConversationQueryDto } from '@modules/conversations/dto/conversation-query.dto';
import {
  ConversationResponseDto,
  ConversationStatsResponseDto,
} from '@modules/conversations/dto/conversation-response.dto';
import { UpdateStatusDto } from '@modules/conversations/dto/update-status.dto';
import { ConversationsGateway } from '@modules/conversations/conversations.gateway';
import { toConversationResponse } from '@modules/conversations/conversations.mapper';

const ACTIVE_STATUSES: ConversationStatus[] = [
  ConversationStatus.ABERTA,
  ConversationStatus.AGUARDANDO,
  ConversationStatus.EM_ATENDIMENTO,
];

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ConversationsGateway,
  ) {}

  async create(
    tenantId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    await this.assertCustomerInTenant(dto.customerId, tenantId);

    const existing = await this.findActiveConversation(
      tenantId,
      dto.customerId,
      dto.channel,
    );

    if (existing) {
      return this.toResponse(existing.id, tenantId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        channel: dto.channel,
        status: ConversationStatus.ABERTA,
      },
    });

    return this.toResponse(conversation.id, tenantId);
  }

  async findAll(
    tenantId: string,
    query: ConversationQueryDto,
  ): Promise<PaginatedResult<ConversationResponseDto>> {
    const where: Prisma.ConversationWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
    };

    const skip = getPaginationSkip(query.page, query.perPage);

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: query.perPage,
    });

    const total = await this.prisma.conversation.count({ where });

    const sorted = [...conversations].sort((a, b) => {
      const aTime = a.messages[0]?.createdAt ?? a.createdAt;
      const bTime = b.messages[0]?.createdAt ?? b.createdAt;
      return bTime.getTime() - aTime.getTime();
    });

    return buildPaginatedResult(
      sorted.map(toConversationResponse),
      total,
      query.page,
      query.perPage,
    );
  }

  async findOne(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationResponseDto> {
    return this.toResponse(conversationId, tenantId);
  }

  async updateStatus(
    tenantId: string,
    conversationId: string,
    dto: UpdateStatusDto,
    user: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.findConversationInTenant(
      conversationId,
      tenantId,
    );

    if (dto.status === ConversationStatus.FECHADA) {
      const allowedRoles: UserRole[] = [
        UserRole.BARBEIRO,
        UserRole.GERENTE,
        UserRole.ADMIN,
      ];
      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenException(
          'Only BARBEIRO, GERENTE or ADMIN can close conversations',
        );
      }
    }

    if (
      dto.status === ConversationStatus.EM_ATENDIMENTO &&
      !dto.assignedTo &&
      !conversation.assignedTo
    ) {
      dto = { ...dto, assignedTo: user.userId };
    }

    if (dto.assignedTo) {
      await this.assertUserInTenant(dto.assignedTo, tenantId);
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: dto.status,
        ...(dto.assignedTo !== undefined ? { assignedTo: dto.assignedTo } : {}),
      },
    });

    const response = await this.toResponse(conversationId, tenantId);
    this.gateway.emitConversationUpdated(tenantId, response);
    return response;
  }

  async getStats(tenantId: string): Promise<ConversationStatsResponseDto> {
    const grouped = await this.prisma.conversation.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const counts: Record<ConversationStatus, number> = {
      [ConversationStatus.ABERTA]: 0,
      [ConversationStatus.AGUARDANDO]: 0,
      [ConversationStatus.EM_ATENDIMENTO]: 0,
      [ConversationStatus.FECHADA]: 0,
    };

    for (const row of grouped) {
      counts[row.status] = row._count.status;
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    return {
      aberta: counts[ConversationStatus.ABERTA],
      aguardando: counts[ConversationStatus.AGUARDANDO],
      emAtendimento: counts[ConversationStatus.EM_ATENDIMENTO],
      fechada: counts[ConversationStatus.FECHADA],
      total,
    };
  }

  async findActiveConversation(
    tenantId: string,
    customerId: string,
    channel: Conversation['channel'],
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: {
        tenantId,
        customerId,
        channel,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createConversationForCustomer(
    tenantId: string,
    customerId: string,
    channel: Conversation['channel'],
  ): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        tenantId,
        customerId,
        channel,
        status: ConversationStatus.ABERTA,
      },
    });
  }

  async findConversationInTenant(
    conversationId: string,
    tenantId: string,
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async findByCustomer(
    tenantId: string,
    customerId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ConversationResponseDto>> {
    await this.assertCustomerInTenant(customerId, tenantId);

    const where: Prisma.ConversationWhereInput = {
      tenantId,
      customerId,
    };

    const skip = getPaginationSkip(page, perPage);

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return buildPaginatedResult(
      conversations.map(toConversationResponse),
      total,
      page,
      perPage,
    );
  }

  private async toResponse(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return toConversationResponse(conversation);
  }

  private async assertCustomerInTenant(
    customerId: string,
    tenantId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async assertUserInTenant(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Assigned user not found in tenant');
    }
  }
}
