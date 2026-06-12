import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import {
  NOTIFICATION_JOB_NAMES,
  NotificationJobData,
  QUEUE_NOTIFICATIONS,
} from '../queue.constants';

const NOTIFICATION_MESSAGES: Record<string, string> = {
  [NOTIFICATION_JOB_NAMES.GOOGLE_REVIEW]:
    'Obrigado por visitar a Barbearia Modelo! Avalie nosso atendimento no Google: https://g.page/r/barbearia-modelo/review',
  [NOTIFICATION_JOB_NAMES.PLAN_OFFER]:
    'Que tal um plano mensal com desconto? Conheça nossos planos de assinatura na barbearia!',
  [NOTIFICATION_JOB_NAMES.PAYMENT_CONFIRMATION]:
    'Seu pagamento foi confirmado! Sua assinatura está ativa. Obrigado!',
  [NOTIFICATION_JOB_NAMES.WELCOME]:
    'Bem-vindo à Barbearia Modelo! Estamos à disposição para tirar suas dúvidas.',
};

@Processor(QUEUE_NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly whatsAppService: WhatsAppService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, tenantId, customerId, phone } = job.data;

    if (type === NOTIFICATION_JOB_NAMES.PAYMENT_REJECTED_MANAGER) {
      this.logger.log({
        msg: 'Manager notification — WhatsApp delivery skipped',
        jobId: job.id,
        type,
        tenantId,
        customerId,
      });
      return;
    }

    const message = NOTIFICATION_MESSAGES[type];
    if (!message || !phone) {
      this.logger.warn({
        msg: 'Skipping notification — missing message template or phone',
        jobId: job.id,
        type,
        tenantId,
        customerId,
      });
      return;
    }

    await this.whatsAppService.send({
      tenantId,
      phone,
      message,
    });

    this.logger.log({
      msg: 'Notification delivered via WhatsApp',
      jobId: job.id,
      type,
      tenantId,
      customerId,
      attempt: job.attemptsMade + 1,
    });
  }
}
