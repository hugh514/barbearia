import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CheckinRealizadoPayload } from '@common/events/checkin.events';
import { CHECKIN_JOB_NAMES, QUEUE_CHECKIN } from '../queue.constants';

@Processor(QUEUE_CHECKIN)
export class CheckinProcessor extends WorkerHost {
  private readonly logger = new Logger(CheckinProcessor.name);

  async process(job: Job<CheckinRealizadoPayload>): Promise<void> {
    if (job.name !== CHECKIN_JOB_NAMES.REALIZADO) {
      return;
    }

    const { tenantId, customerId, appointmentId, reused, checkedInAt } =
      job.data;

    this.logger.log({
      msg: 'Check-in realizado processado',
      tenantId,
      customerId,
      appointmentId,
      reused,
      checkedInAt,
    });
  }
}
