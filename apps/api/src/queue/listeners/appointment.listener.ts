import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { ATENDIMENTO_FINALIZADO } from '../../events/event-names';
import { AtendimentoFinalizadoPayload } from '../../events/interfaces/event-payloads';
import { DEFAULT_JOB_OPTIONS, QUEUE_POST_ATTENDANCE } from '../queue.constants';

@Injectable()
export class AppointmentListener {
  private readonly logger = new Logger(AppointmentListener.name);

  constructor(
    @InjectQueue(QUEUE_POST_ATTENDANCE)
    private readonly postAttendanceQueue: Queue,
  ) {}

  @OnEvent(ATENDIMENTO_FINALIZADO)
  async handleAtendimentoFinalizado(
    payload: AtendimentoFinalizadoPayload,
  ): Promise<void> {
    await this.postAttendanceQueue.add('process', payload, DEFAULT_JOB_OPTIONS);
    this.logger.debug(
      `Enqueued post-attendance job for appointment ${payload.appointmentId}`,
    );
  }
}
