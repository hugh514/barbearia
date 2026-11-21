import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import {
  ATENDIMENTO_FINALIZADO,
  ATENDIMENTO_INICIADO,
  AtendimentoFinalizadoPayload,
  AtendimentoIniciadoPayload,
} from '@common/events/appointment.events';
import {
  buildPaginatedResult,
  getPaginationSkip,
} from '@common/pagination/pagination.util';
import { PaginatedResult } from '@common/pagination/pagination.types';
import { AppointmentQueryDto } from '@modules/appointments/dto/appointment-query.dto';
import { CancelAppointmentDto } from '@modules/appointments/dto/cancel-appointment.dto';
import { CreateAppointmentDto } from '@modules/appointments/dto/create-appointment.dto';
import {
  AppointmentResponseDto,
  MyQueuePositionResponseDto,
} from '@modules/appointments/dto/appointment-response.dto';
import { FinishAppointmentDto } from '@modules/appointments/dto/finish-appointment.dto';
import { toAppointmentResponse } from '@modules/appointments/appointments.mapper';
import { PrismaService } from '@prisma/prisma.service';

const appointmentInclude = {
  customer: {
    select: { id: true, name: true, phone: true },
  },
  barber: {
    select: { id: true, name: true },
  },
} satisfies Prisma.AppointmentInclude;

const QUEUE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.AGUARDANDO,
  AppointmentStatus.EM_ATENDIMENTO,
];

const DAY_STATUSES: AppointmentStatus[] = [
  ...QUEUE_STATUSES,
  AppointmentStatus.FINALIZADO,
  AppointmentStatus.CANCELADO,
];

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    tenantId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    await this.assertCustomerInTenant(dto.customerId, tenantId);

    try {
      const appointment = await this.prisma.appointment.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          services: dto.services,
          status: AppointmentStatus.AGUARDANDO,
        },
        include: appointmentInclude,
      });
      return toAppointmentResponse(appointment);
    } catch (err) {
      // Índice único parcial: um atendimento ativo por cliente no tenant.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Cliente já tem atendimento em aberto.');
      }
      throw err;
    }
  }

  async getQueue(
    tenantId: string,
    includeFinished = false,
  ): Promise<AppointmentResponseDto[]> {
    const { startOfDay, endOfDay } = this.getTodayRange();
    const statuses = includeFinished ? DAY_STATUSES : QUEUE_STATUSES;

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: statuses },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      include: appointmentInclude,
      orderBy: { createdAt: 'asc' },
    });

    return appointments.map((appointment) =>
      toAppointmentResponse(appointment, { includeWaitTime: true }),
    );
  }

  async findAll(
    tenantId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResult<AppointmentResponseDto>> {
    const where = this.buildHistoryWhere(tenantId, query);
    const skip = getPaginationSkip(query.page, query.perPage);

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { ...where, deletedAt: null },
        skip,
        take: query.perPage,
        include: appointmentInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.count({ where: { ...where, deletedAt: null } }),
    ]);

    return buildPaginatedResult(
      appointments.map((appointment) =>
        toAppointmentResponse(appointment, { includeDuration: true }),
      ),
      total,
      query.page,
      query.perPage,
    );
  }

  async findOne(
    tenantId: string,
    appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentInTenant(
      appointmentId,
      tenantId,
    );

    return toAppointmentResponse(appointment, { includeDuration: true });
  }

  async findByCustomer(
    tenantId: string,
    customerId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<AppointmentResponseDto>> {
    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      customerId,
      deletedAt: null,
    };
    const skip = getPaginationSkip(page, perPage);

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: perPage,
        include: appointmentInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return buildPaginatedResult(
      appointments.map((appointment) =>
        toAppointmentResponse(appointment, { includeDuration: true }),
      ),
      total,
      page,
      perPage,
    );
  }

  /** Histórico de atendimentos do próprio cliente (resolve customerId do usuário). */
  async findMine(
    userId: string,
    tenantId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResult<AppointmentResponseDto>> {
    const customerId = await this.resolveCustomerId(userId, tenantId);
    return this.findAll(tenantId, { ...query, customerId });
  }

  /** Posição do cliente logado na fila de hoje (tudo null se não está nela). */
  async myQueuePosition(
    userId: string,
    tenantId: string,
  ): Promise<MyQueuePositionResponseDto> {
    const customerId = await this.resolveCustomerId(userId, tenantId);
    const { startOfDay, endOfDay } = this.getTodayRange();
    const today = {
      tenantId,
      deletedAt: null,
      createdAt: { gte: startOfDay, lte: endOfDay },
    };

    const mine = await this.prisma.appointment.findFirst({
      where: { ...today, customerId, status: { in: QUEUE_STATUSES } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, createdAt: true },
    });
    if (!mine) {
      return { position: null, ahead: null, status: null, enteredAt: null };
    }
    if (mine.status === AppointmentStatus.EM_ATENDIMENTO) {
      return {
        position: 0,
        ahead: 0,
        status: mine.status,
        enteredAt: mine.createdAt,
      };
    }

    const ahead = await this.prisma.appointment.count({
      where: {
        ...today,
        status: AppointmentStatus.AGUARDANDO,
        OR: [
          { createdAt: { lt: mine.createdAt } },
          { createdAt: mine.createdAt, id: { lt: mine.id } },
        ],
      },
    });
    return {
      position: ahead + 1,
      ahead,
      status: mine.status,
      enteredAt: mine.createdAt,
    };
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

  async start(
    tenantId: string,
    appointmentId: string,
    barberId: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentInTenant(
      appointmentId,
      tenantId,
    );

    if (appointment.status !== AppointmentStatus.AGUARDANDO) {
      throw new UnprocessableEntityException(
        'Appointment can only be started from AGUARDANDO status',
      );
    }

    const activeCount = await this.prisma.appointment.count({
      where: {
        tenantId,
        barberId,
        status: AppointmentStatus.EM_ATENDIMENTO,
        deletedAt: null,
      },
    });

    if (activeCount > 0) {
      throw new ConflictException('Barbeiro já está em atendimento');
    }

    const startedAt = new Date();

    // O índice único parcial (uniq_active_appt_per_barber) é a garantia real
    // contra o TOCTOU acima: dois "start" simultâneos com o mesmo barbeiro fazem
    // um deles violar a constraint (P2002) → traduzimos para 409.
    let updated;
    try {
      updated = await this.prisma.appointment.update({
        where: { id: appointmentId, tenantId },
        data: {
          status: AppointmentStatus.EM_ATENDIMENTO,
          barberId,
          startedAt,
        },
        include: appointmentInclude,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Barbeiro já está em atendimento');
      }
      throw err;
    }

    const payload: AtendimentoIniciadoPayload = {
      appointmentId: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      barberId,
      startedAt,
    };

    this.eventEmitter.emit(ATENDIMENTO_INICIADO, payload);

    return toAppointmentResponse(updated);
  }

  async finish(
    tenantId: string,
    appointmentId: string,
    dto: FinishAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentInTenant(
      appointmentId,
      tenantId,
    );

    if (appointment.status !== AppointmentStatus.EM_ATENDIMENTO) {
      throw new UnprocessableEntityException(
        'Appointment can only be finished from EM_ATENDIMENTO status',
      );
    }

    const finishedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id: appointmentId, tenantId },
        data: {
          status: AppointmentStatus.FINALIZADO,
          finishedAt,
          notes: dto.notes,
          totalPrice: dto.totalPrice,
          ...(dto.services ? { services: dto.services } : {}),
        },
        include: appointmentInclude,
      });

      await tx.customer.update({
        where: { id: result.customerId },
        data: { lastVisit: finishedAt },
      });

      return result;
    });

    const payload: AtendimentoFinalizadoPayload = {
      appointmentId: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      barberId: updated.barberId,
      finishedAt,
      totalPrice: updated.totalPrice?.toString() ?? null,
      services: updated.services,
    };

    this.eventEmitter.emit(ATENDIMENTO_FINALIZADO, payload);

    return toAppointmentResponse(updated, { includeDuration: true });
  }

  async cancel(
    tenantId: string,
    appointmentId: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentInTenant(
      appointmentId,
      tenantId,
    );

    if (
      appointment.status !== AppointmentStatus.AGUARDANDO &&
      appointment.status !== AppointmentStatus.EM_ATENDIMENTO
    ) {
      throw new UnprocessableEntityException(
        'Appointment cannot be cancelled in its current status',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELADO,
        cancelReason: dto.reason,
      },
      include: appointmentInclude,
    });

    return toAppointmentResponse(updated);
  }

  private buildHistoryWhere(
    tenantId: string,
    query: AppointmentQueryDto,
  ): Prisma.AppointmentWhereInput {
    const createdAt: Prisma.DateTimeFilter | undefined =
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          }
        : undefined;

    return {
      tenantId,
      ...(query.barberId ? { barberId: query.barberId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
  }

  private getTodayRange(): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
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

  private async findAppointmentInTenant(
    appointmentId: string,
    tenantId: string,
  ): Promise<
    Appointment &
      Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>
  > {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, deletedAt: null },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }
}
