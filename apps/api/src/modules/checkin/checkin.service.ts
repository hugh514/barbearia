import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import {
  CHECKIN_REALIZADO,
  CheckinRealizadoPayload,
} from '@common/events/checkin.events';
import { REDIS_CLIENT } from '@common/redis/redis.module';
import { toAppointmentResponse } from '@modules/appointments/appointments.mapper';
import { CheckinResponseDto } from '@modules/checkin/dto/checkin-response.dto';
import { GenerateTokenResponseDto } from '@modules/checkin/dto/generate-token-response.dto';
import { PrismaService } from '@prisma/prisma.service';

const TOKEN_TTL_SECONDS = 60;
const REVERSE_KEY_TTL_SECONDS = 65;

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

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateToken(
    userId: string,
    tenantId: string,
  ): Promise<GenerateTokenResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { customerId: true },
    });

    if (!user?.customerId) {
      throw new UnprocessableEntityException(
        'Usuário sem cadastro de cliente vinculado',
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: user.customerId,
        tenantId,
        active: true,
      },
    });

    if (!customer) {
      throw new UnprocessableEntityException(
        'Cliente não encontrado ou inativo',
      );
    }

    const token = randomBytes(32).toString('hex');
    const tokenKey = this.tokenKey(tenantId, token);
    const reverseKey = this.reverseKey(tenantId, customer.id);

    const previousToken = await this.redis.get(reverseKey);
    const pipeline = this.redis.pipeline();

    if (previousToken) {
      pipeline.del(this.tokenKey(tenantId, previousToken));
    }

    pipeline.set(tokenKey, customer.id, 'EX', TOKEN_TTL_SECONDS);
    pipeline.set(reverseKey, token, 'EX', REVERSE_KEY_TTL_SECONDS);
    await pipeline.exec();

    return { token, expiresInSeconds: TOKEN_TTL_SECONDS };
  }

  async consumeToken(
    token: string,
    tenantId: string,
  ): Promise<CheckinResponseDto> {
    const customerId = await this.redis.getdel(this.tokenKey(tenantId, token));

    if (!customerId) {
      throw new NotFoundException('Token inválido ou expirado');
    }

    await this.redis.del(this.reverseKey(tenantId, customerId));

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        active: true,
      },
    });

    if (!customer) {
      throw new UnprocessableEntityException(
        'Cliente não encontrado ou inativo',
      );
    }

    const { startOfDay, endOfDay } = this.getTodayRange();

    let appointment = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        customerId: customer.id,
        status: { in: QUEUE_STATUSES },
        createdAt: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
      include: appointmentInclude,
      orderBy: { createdAt: 'asc' },
    });

    let reused = false;

    if (appointment) {
      reused = true;
    } else {
      appointment = await this.prisma.appointment.create({
        data: {
          tenantId,
          customerId: customer.id,
          status: AppointmentStatus.AGUARDANDO,
          services: [],
        },
        include: appointmentInclude,
      });
    }

    const queuePosition = await this.prisma.appointment.count({
      where: {
        tenantId,
        status: { in: QUEUE_STATUSES },
        createdAt: {
          gte: startOfDay,
          lte: appointment.createdAt,
        },
        deletedAt: null,
      },
    });

    const checkedInAt = new Date();
    const payload: CheckinRealizadoPayload = {
      tenantId,
      customerId: customer.id,
      appointmentId: appointment.id,
      reused,
      checkedInAt,
    };

    this.eventEmitter.emit(CHECKIN_REALIZADO, payload);

    return {
      appointment: toAppointmentResponse(appointment),
      queuePosition,
      reused,
    };
  }

  private tokenKey(tenantId: string, token: string): string {
    return `checkin:${tenantId}:${token}`;
  }

  private reverseKey(tenantId: string, customerId: string): string {
    return `checkin:customer:${tenantId}:${customerId}`;
  }

  private getTodayRange(): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }
}
