import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { Env } from '@common/config/env.schema';
import {
  PAGAMENTO_APROVADO,
  PAGAMENTO_RECUSADO,
} from '../../events/event-names';
import {
  PagamentoAprovadoPayload,
  PagamentoRecusadoPayload,
} from '../../events/interfaces/event-payloads';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { CreatePaymentDto } from '@modules/payments/dto/create-payment.dto';
import { PaymentQueryDto } from '@modules/payments/dto/payment-query.dto';
import {
  PaymentResponseDto,
  PaymentTotalsResponseDto,
} from '@modules/payments/dto/payment-response.dto';
import { WebhookPayloadDto } from '@modules/payments/dto/webhook-payload.dto';
import { toPaymentResponse } from '@modules/payments/payments.mapper';
import {
  GatewayPaymentStatusValue,
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '@modules/payments/providers/payment-gateway.interface';
import { PrismaService } from '@prisma/prisma.service';

const paymentInclude = {
  customer: { select: { id: true, name: true } },
  subscription: {
    include: {
      plan: { select: { id: true, name: true, priceCents: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

const TERMINAL_STATUSES: PaymentStatus[] = [
  PaymentStatus.APROVADO,
  PaymentStatus.RECUSADO,
  PaymentStatus.EXPIRADO,
  PaymentStatus.REEMBOLSADO,
];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async create(
    tenantId: string,
    user: AuthenticatedUser,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: dto.subscriptionId, tenantId, deletedAt: null },
      include: {
        plan: true,
        customer: { select: { id: true, phone: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (user.role === UserRole.CLIENTE) {
      await this.assertClienteOwnership(user, subscription.customerId);
    }

    const pending = await this.prisma.payment.findFirst({
      where: {
        tenantId,
        subscriptionId: dto.subscriptionId,
        status: PaymentStatus.PENDENTE,
        deletedAt: null,
      },
    });

    if (pending) {
      throw new ConflictException(
        'Já existe pagamento pendente para esta assinatura',
      );
    }

    const notificationUrl = this.configService.get(
      'MERCADO_PAGO_NOTIFICATION_URL',
      { infer: true },
    );

    const gatewayResult = await this.paymentGateway.createPayment({
      amountCents: subscription.plan.priceCents,
      method: dto.method,
      description: `Plano ${subscription.plan.name}`,
      payerEmail: `${subscription.customer.phone}@barber.local`,
      externalReference: subscription.id,
      notificationUrl: notificationUrl || undefined,
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        externalId: gatewayResult.externalId,
        method: dto.method,
        amountCents: subscription.plan.priceCents,
        status: PaymentStatus.PENDENTE,
        paymentUrl: gatewayResult.paymentUrl,
        qrCode: gatewayResult.qrCode,
        gatewayData: gatewayResult.gatewayData as Prisma.InputJsonValue,
      },
      include: paymentInclude,
    });

    return toPaymentResponse(payment);
  }

  async handleWebhook(
    headers: Record<string, string | string[] | undefined>,
    query: Record<string, string | string[] | undefined>,
    body: WebhookPayloadDto,
  ): Promise<{ received: boolean }> {
    if (!this.paymentGateway.verifyWebhook(headers, body, query)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const externalId = this.resolveWebhookExternalId(query, body);
    if (!externalId) {
      return { received: true };
    }

    const gatewayStatus =
      await this.paymentGateway.getPaymentStatus(externalId);

    const payment = await this.prisma.payment.findFirst({
      where: { externalId, deletedAt: null },
      include: paymentInclude,
    });

    if (!payment) {
      return { received: true };
    }

    if (TERMINAL_STATUSES.includes(payment.status)) {
      return { received: true };
    }

    const mappedStatus = this.mapGatewayStatus(gatewayStatus.status);
    if (!mappedStatus || mappedStatus === PaymentStatus.PENDENTE) {
      return { received: true };
    }

    await this.applyStatusChange(
      payment.id,
      mappedStatus,
      gatewayStatus.gatewayData,
    );

    return { received: true };
  }

  /**
   * Caminho único de mudança de status (webhook e mock-approve): atualização
   * condicional atômica, idempotente, seguida do evento correspondente.
   */
  private async applyStatusChange(
    paymentId: string,
    mappedStatus: PaymentStatus,
    gatewayData: unknown,
  ): Promise<void> {
    // Atomic conditional update: only proceeds if payment is still non-terminal.
    // Protects against duplicate webhooks being processed concurrently (race window).
    const { count } = await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: { notIn: TERMINAL_STATUSES },
      },
      data: {
        status: mappedStatus,
        paidAt: mappedStatus === PaymentStatus.APROVADO ? new Date() : null,
        gatewayData: gatewayData as Prisma.InputJsonValue,
      },
    });

    // count === 0 means another concurrent webhook already moved it to a terminal
    // status — treat as already processed (idempotent, no duplicate events).
    if (count === 0) {
      return;
    }

    // Re-fetch to get full relations for event payload
    const updated = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: paymentInclude,
    });

    if (mappedStatus === PaymentStatus.APROVADO) {
      const payload: PagamentoAprovadoPayload = {
        tenantId: updated.tenantId,
        paymentId: updated.id,
        subscriptionId: updated.subscriptionId,
        customerId: updated.customerId,
      };
      this.eventEmitter.emit(PAGAMENTO_APROVADO, payload);
    }

    if (mappedStatus === PaymentStatus.RECUSADO) {
      const payload: PagamentoRecusadoPayload = {
        tenantId: updated.tenantId,
        paymentId: updated.id,
        subscriptionId: updated.subscriptionId,
        customerId: updated.customerId,
      };
      this.eventEmitter.emit(PAGAMENTO_RECUSADO, payload);
    }
  }

  /** Só dev: aprova o pagamento pelo mesmo caminho do webhook. */
  async mockApprove(
    tenantId: string,
    paymentId: string,
    user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    if (
      !this.paymentGateway.isMock ||
      this.configService.get('NODE_ENV', { infer: true }) === 'production'
    ) {
      throw new NotFoundException('Not found');
    }

    const payment = await this.findPaymentInTenant(paymentId, tenantId);
    if (user.role === UserRole.CLIENTE) {
      await this.assertClienteOwnership(user, payment.customerId);
    }

    if (!TERMINAL_STATUSES.includes(payment.status)) {
      await this.applyStatusChange(payment.id, PaymentStatus.APROVADO, {
        mock: true,
        approved: true,
      });
    }

    return toPaymentResponse(
      await this.findPaymentInTenant(paymentId, tenantId),
    );
  }

  async findAll(
    tenantId: string,
    query: PaymentQueryDto,
  ): Promise<PaginatedResult<PaymentResponseDto>> {
    const where = this.buildWhere(tenantId, query);
    const skip = getPaginationSkip(query.page, query.perPage);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: query.perPage,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(
      payments.map(toPaymentResponse),
      total,
      query.page,
      query.perPage,
    );
  }

  async totals(
    tenantId: string,
    query: PaymentQueryDto,
  ): Promise<PaymentTotalsResponseDto> {
    const rows = await this.prisma.payment.groupBy({
      by: ['status'],
      where: this.buildWhere(tenantId, query),
      _count: { _all: true },
      _sum: { amountCents: true },
      orderBy: { status: 'asc' },
    });
    const byStatus = rows.map((r) => ({
      status: r.status,
      count: r._count._all,
      amountCents: r._sum.amountCents ?? 0,
    }));
    return {
      count: byStatus.reduce((n, r) => n + r.count, 0),
      totalCents: byStatus.reduce((n, r) => n + r.amountCents, 0),
      byStatus,
    };
  }

  private buildWhere(
    tenantId: string,
    query: PaymentQueryDto,
  ): Prisma.PaymentWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };
  }

  async findOne(
    tenantId: string,
    paymentId: string,
    user?: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.findPaymentInTenant(paymentId, tenantId);

    if (user?.role === UserRole.CLIENTE) {
      await this.assertClienteOwnership(user, payment.customerId);
    }

    return toPaymentResponse(payment);
  }

  async findByCustomer(
    tenantId: string,
    customerId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<PaymentResponseDto>> {
    await this.assertCustomerInTenant(customerId, tenantId);

    return this.findAll(tenantId, {
      customerId,
      page,
      perPage,
    } as PaymentQueryDto);
  }

  private async findPaymentInTenant(
    paymentId: string,
    tenantId: string,
  ): Promise<Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId, deletedAt: null },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private async assertCustomerInTenant(
    customerId: string,
    tenantId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private resolveWebhookExternalId(
    query: Record<string, string | string[] | undefined>,
    body: WebhookPayloadDto,
  ): string | null {
    const fromQuery = query['data.id'] ?? query.id;
    if (typeof fromQuery === 'string' && fromQuery.length > 0) {
      return fromQuery;
    }

    if (body.data?.id) {
      return body.data.id;
    }

    return null;
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
      throw new ForbiddenException('Access denied');
    }
  }

  private mapGatewayStatus(
    status: GatewayPaymentStatusValue,
  ): PaymentStatus | null {
    switch (status) {
      case 'approved':
        return PaymentStatus.APROVADO;
      case 'rejected':
        return PaymentStatus.RECUSADO;
      case 'expired':
        return PaymentStatus.EXPIRADO;
      case 'refunded':
        return PaymentStatus.REEMBOLSADO;
      default:
        return PaymentStatus.PENDENTE;
    }
  }
}
