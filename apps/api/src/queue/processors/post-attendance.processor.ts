import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PlanStatus } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { AtendimentoFinalizadoPayload } from '../../events/interfaces/event-payloads';
import { PrismaService } from '@prisma/prisma.service';
import {
  DEFAULT_JOB_OPTIONS,
  NOTIFICATION_JOB_NAMES,
  NotificationJobData,
  QUEUE_NOTIFICATIONS,
  QUEUE_POST_ATTENDANCE,
} from '../queue.constants';

@Processor(QUEUE_POST_ATTENDANCE)
export class PostAttendanceProcessor extends WorkerHost {
  private readonly logger = new Logger(PostAttendanceProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {
    super();
  }

  async process(job: Job<AtendimentoFinalizadoPayload>): Promise<void> {
    const { tenantId, customerId, appointmentId } = job.data;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, phone: true, planStatus: true },
    });

    if (!customer) {
      throw new Error(
        `Customer ${customerId} not found for tenant ${tenantId}`,
      );
    }

    const baseNotification: Pick<
      NotificationJobData,
      'tenantId' | 'customerId' | 'phone'
    > = {
      tenantId,
      customerId: customer.id,
      phone: customer.phone,
    };

    await this.enqueueNotification({
      ...baseNotification,
      type: NOTIFICATION_JOB_NAMES.GOOGLE_REVIEW,
      metadata: { appointmentId },
    });

    if (customer.planStatus !== PlanStatus.ACTIVE) {
      await this.enqueueNotification({
        ...baseNotification,
        type: NOTIFICATION_JOB_NAMES.PLAN_OFFER,
        metadata: { appointmentId },
      });
    }

    this.logger.log({
      msg: 'Post-attendance actions enqueued',
      appointmentId,
      tenantId,
      customerId,
      planOffer: customer.planStatus !== PlanStatus.ACTIVE,
    });
  }

  private async enqueueNotification(data: NotificationJobData): Promise<void> {
    try {
      await this.notificationsQueue.add(data.type, data, DEFAULT_JOB_OPTIONS);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to enqueue notification sub-job',
        type: data.type,
        customerId: data.customerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
