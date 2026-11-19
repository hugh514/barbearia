import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClienteCadastradoPayload } from '../../events/interfaces/event-payloads';
import { QUEUE_POST_REGISTRATION } from '../queue.constants';

@Processor(QUEUE_POST_REGISTRATION)
export class PostRegistrationProcessor extends WorkerHost {
  private readonly logger = new Logger(PostRegistrationProcessor.name);

  async process(job: Job<ClienteCadastradoPayload>): Promise<void> {
    const { tenantId, customerId, origin, phone, name } = job.data;

    this.logger.log({
      msg: 'Lead conversion metric recorded',
      metric: 'new_lead_captured',
      tenantId,
      customerId,
      origin,
      phone,
      name,
      jobId: job.id,
    });
  }
}
