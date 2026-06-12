import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  PagamentoAprovadoPayload,
  PagamentoRecusadoPayload,
} from '../../events/interfaces/event-payloads';
import { SubscriptionsService } from '@modules/subscriptions/subscriptions.service';
import { PrismaService } from '@prisma/prisma.service';
import {
  DEFAULT_JOB_OPTIONS,
  NOTIFICATION_JOB_NAMES,
  NotificationJobData,
  QUEUE_NOTIFICATIONS,
  QUEUE_POST_PAYMENT,
} from '../queue.constants';

type PostPaymentJobData = PagamentoAprovadoPayload | PagamentoRecusadoPayload;

@Processor(QUEUE_POST_PAYMENT)
export class PostPaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PostPaymentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {
    super();
  }

  async process(job: Job<PostPaymentJobData>): Promise<void> {
    if (job.name === 'approved') {
      await this.handleApproved(job.data as PagamentoAprovadoPayload);
      return;
    }

    if (job.name === 'rejected') {
      await this.handleRejected(job.data as PagamentoRecusadoPayload);
      return;
    }

    throw new Error(`Unknown post-payment job name: ${job.name}`);
  }

  private async handleApproved(
    payload: PagamentoAprovadoPayload,
  ): Promise<void> {
    const { tenantId, subscriptionId, customerId, paymentId } = payload;

    await this.subscriptionsService.activate(tenantId, subscriptionId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { phone: true },
    });

    if (!customer) {
      throw new Error(
        `Customer ${customerId} not found for tenant ${tenantId}`,
      );
    }

    await this.notificationsQueue.add(
      NOTIFICATION_JOB_NAMES.PAYMENT_CONFIRMATION,
      {
        tenantId,
        customerId,
        phone: customer.phone,
        type: NOTIFICATION_JOB_NAMES.PAYMENT_CONFIRMATION,
        metadata: { paymentId, subscriptionId },
      },
      DEFAULT_JOB_OPTIONS,
    );

    this.logger.log({
      msg: 'Post-payment approved actions completed',
      paymentId,
      subscriptionId,
      tenantId,
    });
  }

  private async handleRejected(
    payload: PagamentoRecusadoPayload,
  ): Promise<void> {
    const { tenantId, paymentId, subscriptionId, customerId, reason } = payload;

    await this.notificationsQueue.add(
      NOTIFICATION_JOB_NAMES.PAYMENT_REJECTED_MANAGER,
      {
        tenantId,
        customerId,
        type: NOTIFICATION_JOB_NAMES.PAYMENT_REJECTED_MANAGER,
        metadata: {
          paymentId,
          subscriptionId,
          ...(reason ? { reason } : {}),
        },
      },
      DEFAULT_JOB_OPTIONS,
    );

    this.logger.log({
      msg: 'Post-payment rejected notification enqueued for manager',
      paymentId,
      tenantId,
    });
  }
}
