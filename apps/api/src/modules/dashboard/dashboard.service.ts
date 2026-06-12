import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  ConversationChannel,
  ConversationStatus,
  PaymentStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { BarbersMetricsResponseDto } from './dto/barbers-metrics.dto';
import { ConversationsMetricsResponseDto } from './dto/conversations-metrics.dto';
import { CustomersMetricsResponseDto } from './dto/customers-metrics.dto';
import { PlansMetricsResponseDto } from './dto/plans-metrics.dto';
import { RevenueMetricsResponseDto } from './dto/revenue-metrics.dto';
import { DashboardSummaryResponseDto } from './dto/summary-response.dto';
import {
  getDateRange,
  getDateRangeWithPrevious,
  getOpenHoursInRange,
} from './helpers/date-range.util';
import { Period } from './helpers/period.enum';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    tenantId: string,
    period: Period,
  ): Promise<DashboardSummaryResponseDto> {
    const { from, to } = getDateRange(period);

    const finishedWhere = {
      tenantId,
      status: AppointmentStatus.FINALIZADO,
      finishedAt: { gte: from, lte: to },
      deletedAt: null,
    };

    const [totalAppointments, revenueAgg, appointmentsByBarber, newCustomers] =
      await Promise.all([
        this.prisma.appointment.count({ where: finishedWhere }),
        this.prisma.appointment.aggregate({
          where: finishedWhere,
          _sum: { totalPrice: true },
        }),
        this.prisma.appointment.groupBy({
          by: ['barberId'],
          where: finishedWhere,
          _count: true,
        }),
        this.prisma.customer.count({
          where: {
            tenantId,
            active: true,
            createdAt: { gte: from, lte: to },
          },
        }),
      ]);

    const barberIds = appointmentsByBarber
      .map((row) => row.barberId)
      .filter((id): id is string => id !== null);

    const barbers = barberIds.length
      ? await this.prisma.user.findMany({
          where: { tenantId, id: { in: barberIds } },
          select: { id: true, name: true },
        })
      : [];

    const barberNameMap = new Map(barbers.map((b) => [b.id, b.name]));
    const openHours = getOpenHoursInRange(from, to);
    const revenue = Number(revenueAgg._sum.totalPrice ?? 0);

    return {
      period,
      totalAppointments,
      appointmentsByBarber: appointmentsByBarber.map((row) => ({
        barberId: row.barberId,
        barberName: row.barberId
          ? (barberNameMap.get(row.barberId) ?? 'Desconhecido')
          : 'Sem barbeiro',
        count: row._count,
      })),
      newCustomers,
      revenue,
      occupancyRate:
        openHours > 0
          ? Math.round((totalAppointments / openHours) * 100) / 100
          : 0,
    };
  }

  async getCustomers(
    tenantId: string,
    period: Period,
  ): Promise<CustomersMetricsResponseDto> {
    const { from, to } = getDateRange(period);

    const [totalCustomers, newCustomersInPeriod, appointmentCounts] =
      await Promise.all([
        this.prisma.customer.count({
          where: { tenantId, active: true },
        }),
        this.prisma.customer.count({
          where: {
            tenantId,
            active: true,
            createdAt: { gte: from, lte: to },
          },
        }),
        this.prisma.appointment.groupBy({
          by: ['customerId'],
          where: {
            tenantId,
            status: AppointmentStatus.FINALIZADO,
            deletedAt: null,
          },
          _count: true,
        }),
      ]);

    const recurringCustomers = appointmentCounts.filter(
      (row) => row._count >= 2,
    ).length;

    const topRows = [...appointmentCounts]
      .sort((a, b) => b._count - a._count)
      .slice(0, 10);

    const customerIds = topRows.map((row) => row.customerId);
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { tenantId, id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [];

    const customerNameMap = new Map(customers.map((c) => [c.id, c.name]));

    return {
      totalCustomers,
      newCustomersInPeriod,
      recurringCustomers,
      topCustomersByFrequency: topRows.map((row) => ({
        customerId: row.customerId,
        customerName: customerNameMap.get(row.customerId) ?? 'Desconhecido',
        visitCount: row._count,
      })),
    };
  }

  async getRevenue(
    tenantId: string,
    period: Period,
  ): Promise<RevenueMetricsResponseDto> {
    const { from, to, previousFrom, previousTo } =
      getDateRangeWithPrevious(period);

    const finishedWhere = {
      tenantId,
      status: AppointmentStatus.FINALIZADO,
      finishedAt: { gte: from, lte: to },
      deletedAt: null,
    };

    const previousFinishedWhere = {
      tenantId,
      status: AppointmentStatus.FINALIZADO,
      finishedAt: { gte: previousFrom, lte: previousTo },
    };

    const approvedPaymentWhere = {
      tenantId,
      status: PaymentStatus.APROVADO,
      paidAt: { gte: from, lte: to },
      deletedAt: null,
    };

    const previousPaymentWhere = {
      tenantId,
      status: PaymentStatus.APROVADO,
      paidAt: { gte: previousFrom, lte: previousTo },
      deletedAt: null,
    };

    const [
      appointmentRevenueAgg,
      planRevenueAgg,
      previousAppointmentAgg,
      previousPlanAgg,
      revenueByBarber,
    ] = await Promise.all([
      this.prisma.appointment.aggregate({
        where: finishedWhere,
        _sum: { totalPrice: true },
      }),
      this.prisma.payment.aggregate({
        where: approvedPaymentWhere,
        _sum: { amountCents: true },
      }),
      this.prisma.appointment.aggregate({
        where: previousFinishedWhere,
        _sum: { totalPrice: true },
      }),
      this.prisma.payment.aggregate({
        where: previousPaymentWhere,
        _sum: { amountCents: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['barberId'],
        where: finishedWhere,
        _sum: { totalPrice: true },
        _count: true,
      }),
    ]);

    const appointmentRevenue = Number(
      appointmentRevenueAgg._sum.totalPrice ?? 0,
    );
    const planRevenue = (planRevenueAgg._sum.amountCents ?? 0) / 100;
    const totalRevenue = appointmentRevenue + planRevenue;

    const previousTotal =
      Number(previousAppointmentAgg._sum.totalPrice ?? 0) +
      (previousPlanAgg._sum.amountCents ?? 0) / 100;

    const growthPercent =
      previousTotal > 0
        ? Math.round(((totalRevenue - previousTotal) / previousTotal) * 10000) /
          100
        : totalRevenue > 0
          ? 100
          : null;

    const barberIds = revenueByBarber
      .map((row) => row.barberId)
      .filter((id): id is string => id !== null);

    const barbers = barberIds.length
      ? await this.prisma.user.findMany({
          where: { tenantId, id: { in: barberIds } },
          select: { id: true, name: true },
        })
      : [];

    const barberNameMap = new Map(barbers.map((b) => [b.id, b.name]));

    return {
      period,
      appointmentRevenue,
      planRevenue,
      totalRevenue,
      growthPercent,
      revenueByBarber: revenueByBarber.map((row) => ({
        barberId: row.barberId,
        barberName: row.barberId
          ? (barberNameMap.get(row.barberId) ?? 'Desconhecido')
          : 'Sem barbeiro',
        revenue: Number(row._sum.totalPrice ?? 0),
        appointmentCount: row._count,
      })),
    };
  }

  async getPlans(
    tenantId: string,
    period: Period,
  ): Promise<PlansMetricsResponseDto> {
    const { from, to } = getDateRange(period);

    const [activeSubscribers, cancellationsInPeriod, activeSubscriptions] =
      await Promise.all([
        this.prisma.subscription.count({
          where: {
            tenantId,
            status: SubscriptionStatus.ATIVO,
            deletedAt: null,
          },
        }),
        this.prisma.subscription.count({
          where: {
            tenantId,
            status: SubscriptionStatus.CANCELADO,
            cancelledAt: { gte: from, lte: to },
            deletedAt: null,
          },
        }),
        this.prisma.subscription.findMany({
          where: {
            tenantId,
            status: SubscriptionStatus.ATIVO,
            deletedAt: null,
          },
          include: {
            plan: { select: { priceCents: true, intervalDays: true } },
          },
        }),
      ]);

    const mrrCents = activeSubscriptions.reduce((sum, sub) => {
      const monthlyFactor = 30 / sub.plan.intervalDays;
      return sum + Math.round(sub.plan.priceCents * monthlyFactor);
    }, 0);

    const churnRate =
      activeSubscribers > 0
        ? Math.round((cancellationsInPeriod / activeSubscribers) * 10000) / 100
        : 0;

    return {
      activeSubscribers,
      cancellationsInPeriod,
      mrrCents,
      churnRate,
    };
  }

  async getConversations(
    tenantId: string,
    period: Period,
  ): Promise<ConversationsMetricsResponseDto> {
    const { from, to } = getDateRange(period);

    const openStatuses: ConversationStatus[] = [
      ConversationStatus.ABERTA,
      ConversationStatus.AGUARDANDO,
      ConversationStatus.EM_ATENDIMENTO,
    ];

    const [openConversations, waitingForHuman, messagesByChannel, messages] =
      await Promise.all([
        this.prisma.conversation.count({
          where: { tenantId, status: { in: openStatuses }, deletedAt: null },
        }),
        this.prisma.conversation.count({
          where: {
            tenantId,
            status: ConversationStatus.AGUARDANDO,
            deletedAt: null,
          },
        }),
        this.prisma.message.groupBy({
          by: ['channel'],
          where: {
            tenantId,
            createdAt: { gte: from, lte: to },
            deletedAt: null,
          },
          _count: true,
        }),
        this.prisma.message.findMany({
          where: {
            tenantId,
            createdAt: { gte: from, lte: to },
            deletedAt: null,
          },
          orderBy: [{ conversationId: 'asc' }, { createdAt: 'asc' }],
          select: {
            conversationId: true,
            direction: true,
            createdAt: true,
          },
        }),
      ]);

    const averageResponseTimeSeconds =
      this.calculateAverageResponseTimeSeconds(messages);

    return {
      openConversations,
      waitingForHuman,
      messagesByChannel: [
        ConversationChannel.WHATSAPP,
        ConversationChannel.INSTAGRAM,
      ].map((channel) => ({
        channel,
        count:
          messagesByChannel.find((row) => row.channel === channel)?._count ?? 0,
      })),
      averageResponseTimeSeconds,
    };
  }

  async getBarbers(
    tenantId: string,
    period: Period,
  ): Promise<BarbersMetricsResponseDto> {
    const { from, to } = getDateRange(period);

    const barbers = await this.prisma.user.findMany({
      where: { tenantId, role: UserRole.BARBEIRO, active: true },
      select: { id: true, name: true },
    });

    const finishedAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: AppointmentStatus.FINALIZADO,
        finishedAt: { gte: from, lte: to },
        barberId: { in: barbers.map((b) => b.id) },
        deletedAt: null,
      },
      select: {
        barberId: true,
        totalPrice: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    const statsMap = new Map<
      string,
      {
        totalAppointments: number;
        revenue: number;
        serviceTimesMs: number[];
      }
    >();

    for (const barber of barbers) {
      statsMap.set(barber.id, {
        totalAppointments: 0,
        revenue: 0,
        serviceTimesMs: [],
      });
    }

    for (const appt of finishedAppointments) {
      if (!appt.barberId) continue;
      const stats = statsMap.get(appt.barberId);
      if (!stats) continue;

      stats.totalAppointments += 1;
      stats.revenue += Number(appt.totalPrice ?? 0);

      if (appt.startedAt && appt.finishedAt) {
        stats.serviceTimesMs.push(
          appt.finishedAt.getTime() - appt.startedAt.getTime(),
        );
      }
    }

    return {
      barbers: barbers.map((barber) => {
        const stats = statsMap.get(barber.id)!;
        const avgMs =
          stats.serviceTimesMs.length > 0
            ? stats.serviceTimesMs.reduce((a, b) => a + b, 0) /
              stats.serviceTimesMs.length
            : null;

        return {
          barberId: barber.id,
          barberName: barber.name,
          totalAppointments: stats.totalAppointments,
          averageServiceTimeMinutes:
            avgMs !== null ? Math.round((avgMs / 60000) * 100) / 100 : null,
          revenue: stats.revenue,
          averageRating: null,
        };
      }),
    };
  }

  private calculateAverageResponseTimeSeconds(
    messages: Array<{
      conversationId: string;
      direction: string;
      createdAt: Date;
    }>,
  ): number | null {
    const responseTimesMs: number[] = [];
    const lastInboundByConversation = new Map<string, Date>();

    for (const message of messages) {
      if (message.direction === 'INBOUND') {
        lastInboundByConversation.set(
          message.conversationId,
          message.createdAt,
        );
        continue;
      }

      const inboundAt = lastInboundByConversation.get(message.conversationId);
      if (!inboundAt) continue;

      const delta = message.createdAt.getTime() - inboundAt.getTime();
      if (delta >= 0) {
        responseTimesMs.push(delta);
      }
      lastInboundByConversation.delete(message.conversationId);
    }

    if (responseTimesMs.length === 0) return null;

    const avgMs =
      responseTimesMs.reduce((sum, ms) => sum + ms, 0) / responseTimesMs.length;

    return Math.round(avgMs / 1000);
  }
}
