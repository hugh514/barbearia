import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PlanStatus,
  Prisma,
  Subscription,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import {
  PLANO_ASSINADO,
  PLANO_CANCELADO,
  PlanoAssinadoPayload,
  PlanoCanceladoPayload,
} from '@common/events/subscription.events';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { CreateSubscriptionDto } from '@modules/subscriptions/dto/create-subscription.dto';
import { SubscriptionQueryDto } from '@modules/subscriptions/dto/subscription-query.dto';
import { SubscriptionResponseDto } from '@modules/subscriptions/dto/subscription-response.dto';
import { toSubscriptionResponse } from '@modules/subscriptions/subscriptions.mapper';
import { PrismaService } from '@prisma/prisma.service';

const subscriptionInclude = {
  plan: {
    select: {
      id: true,
      name: true,
      priceCents: true,
      intervalDays: true,
      benefits: true,
    },
  },
  customer: {
    select: { id: true, name: true, phone: true },
  },
} satisfies Prisma.SubscriptionInclude;

const ACTIVE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ATIVO,
  SubscriptionStatus.PENDENTE,
];

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    tenantId: string,
    user: AuthenticatedUser,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    await this.assertCustomerInTenant(dto.customerId, tenantId);
    const plan = await this.findActivePlanInTenant(dto.planId, tenantId);

    if (user.role === UserRole.CLIENTE) {
      await this.assertClienteOwnership(user, dto.customerId);
    }

    const existing = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        customerId: dto.customerId,
        status: { in: ACTIVE_STATUSES },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Cliente já possui assinatura ativa');
    }

    const isBackoffice =
      user.role === UserRole.ADMIN || user.role === UserRole.GERENTE;
    const now = new Date();
    const initialStatus = isBackoffice
      ? SubscriptionStatus.ATIVO
      : SubscriptionStatus.PENDENTE;

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          planId: plan.id,
          status: initialStatus,
          ...(isBackoffice
            ? {
                startedAt: now,
                nextBillingAt: this.addDays(now, plan.intervalDays),
              }
            : {}),
        },
        include: subscriptionInclude,
      });

      await this.syncCustomerPlanStatus(tx, dto.customerId, initialStatus);

      return created;
    });

    const payload: PlanoAssinadoPayload = {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      customerId: subscription.customerId,
      planId: subscription.planId,
      status: subscription.status,
    };

    this.eventEmitter.emit(PLANO_ASSINADO, payload);

    return toSubscriptionResponse(subscription);
  }

  async findAll(
    tenantId: string,
    query: SubscriptionQueryDto,
  ): Promise<PaginatedResult<SubscriptionResponseDto>> {
    const where: Prisma.SubscriptionWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
    };
    const skip = getPaginationSkip(query.page, query.perPage);

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: query.perPage,
        include: subscriptionInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return buildPaginatedResult(
      subscriptions.map(toSubscriptionResponse),
      total,
      query.page,
      query.perPage,
    );
  }

  /** Assinaturas do próprio cliente (resolve customerId do usuário logado). */
  async findMine(
    userId: string,
    tenantId: string,
    query: SubscriptionQueryDto,
  ): Promise<PaginatedResult<SubscriptionResponseDto>> {
    const customerId = await this.resolveCustomerId(userId, tenantId);
    return this.findAll(tenantId, { ...query, customerId });
  }

  private async resolveCustomerId(
    userId: string,
    tenantId: string,
  ): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, active: true },
      select: { customerId: true },
    });
    if (!user?.customerId) {
      throw new UnprocessableEntityException(
        'Usuário sem cadastro de cliente vinculado',
      );
    }
    return user.customerId;
  }

  async findOne(
    tenantId: string,
    subscriptionId: string,
    user?: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.findSubscriptionInTenant(
      subscriptionId,
      tenantId,
    );

    if (user?.role === UserRole.CLIENTE) {
      await this.assertClienteOwnership(user, subscription.customerId);
    }

    return toSubscriptionResponse(subscription);
  }

  async activate(
    tenantId: string,
    subscriptionId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.findSubscriptionInTenant(
      subscriptionId,
      tenantId,
    );

    this.assertNotTerminal(subscription);

    if (
      subscription.status !== SubscriptionStatus.PENDENTE &&
      subscription.status !== SubscriptionStatus.SUSPENSO
    ) {
      throw new UnprocessableEntityException(
        'Subscription can only be activated from PENDENTE or SUSPENSO status',
      );
    }

    const now = new Date();
    const nextBillingAt =
      subscription.nextBillingAt ??
      this.addDays(now, subscription.plan.intervalDays);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.ATIVO,
          startedAt: subscription.startedAt ?? now,
          nextBillingAt,
        },
        include: subscriptionInclude,
      });

      await this.syncCustomerPlanStatus(
        tx,
        result.customerId,
        SubscriptionStatus.ATIVO,
      );

      return result;
    });

    return toSubscriptionResponse(updated);
  }

  async suspend(
    tenantId: string,
    subscriptionId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.findSubscriptionInTenant(
      subscriptionId,
      tenantId,
    );

    this.assertNotTerminal(subscription);

    if (subscription.status !== SubscriptionStatus.ATIVO) {
      throw new UnprocessableEntityException(
        'Subscription can only be suspended from ATIVO status',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: SubscriptionStatus.SUSPENSO },
        include: subscriptionInclude,
      });

      await this.syncCustomerPlanStatus(
        tx,
        result.customerId,
        SubscriptionStatus.SUSPENSO,
      );

      return result;
    });

    return toSubscriptionResponse(updated);
  }

  async cancel(
    tenantId: string,
    subscriptionId: string,
    user: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.findSubscriptionInTenant(
      subscriptionId,
      tenantId,
    );

    if (user.role === UserRole.CLIENTE) {
      await this.assertClienteOwnership(user, subscription.customerId);
    }

    this.assertNotTerminal(subscription);

    if (subscription.status === SubscriptionStatus.CANCELADO) {
      throw new UnprocessableEntityException(
        'Subscription is already cancelled',
      );
    }

    const cancelledAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELADO,
          cancelledAt,
        },
        include: subscriptionInclude,
      });

      await this.syncCustomerPlanStatus(
        tx,
        result.customerId,
        SubscriptionStatus.CANCELADO,
      );

      return result;
    });

    const payload: PlanoCanceladoPayload = {
      subscriptionId: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      planId: updated.planId,
      cancelledAt,
    };

    this.eventEmitter.emit(PLANO_CANCELADO, payload);

    return toSubscriptionResponse(updated);
  }

  async renew(
    tenantId: string,
    subscriptionId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.findSubscriptionInTenant(
      subscriptionId,
      tenantId,
    );

    this.assertNotTerminal(subscription);

    if (subscription.status !== SubscriptionStatus.ATIVO) {
      throw new UnprocessableEntityException(
        'Subscription can only be renewed when ATIVO',
      );
    }

    const baseDate = subscription.nextBillingAt ?? new Date();
    const nextBillingAt = this.addDays(
      baseDate,
      subscription.plan.intervalDays,
    );

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { nextBillingAt },
      include: subscriptionInclude,
    });

    return toSubscriptionResponse(updated);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private assertNotTerminal(subscription: Subscription): void {
    if (subscription.status === SubscriptionStatus.CANCELADO) {
      throw new UnprocessableEntityException(
        'Subscription is in a terminal status',
      );
    }
  }

  private async syncCustomerPlanStatus(
    tx: Prisma.TransactionClient,
    customerId: string,
    status: SubscriptionStatus,
  ): Promise<void> {
    const planStatus = this.mapSubscriptionToPlanStatus(status);

    await tx.customer.update({
      where: { id: customerId },
      data: { planStatus },
    });
  }

  private mapSubscriptionToPlanStatus(status: SubscriptionStatus): PlanStatus {
    switch (status) {
      case SubscriptionStatus.ATIVO:
        return PlanStatus.ACTIVE;
      case SubscriptionStatus.PENDENTE:
        return PlanStatus.PENDING;
      case SubscriptionStatus.SUSPENSO:
        return PlanStatus.OVERDUE;
      case SubscriptionStatus.CANCELADO:
        return PlanStatus.CANCELLED;
    }
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

  private async findActivePlanInTenant(
    planId: string,
    tenantId: string,
  ): Promise<{ id: string; intervalDays: number }> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, tenantId, active: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  private async assertClienteOwnership(
    user: AuthenticatedUser,
    customerId: string,
  ): Promise<void> {
    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.userId, tenantId: user.tenantId },
      select: { customerId: true },
    });

    if (!dbUser?.customerId || dbUser.customerId !== customerId) {
      throw new ForbiddenException('Access denied to this subscription');
    }
  }

  private async findSubscriptionInTenant(
    subscriptionId: string,
    tenantId: string,
  ): Promise<
    Subscription &
      Prisma.SubscriptionGetPayload<{ include: typeof subscriptionInclude }>
  > {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId, deletedAt: null },
      include: subscriptionInclude,
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }
}
