import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import {
  CHECKIN_REALIZADO,
  CheckinRealizadoPayload,
} from '@common/events/checkin.events';
import {
  CHECKIN_JOB_NAMES,
  DEFAULT_JOB_OPTIONS,
  QUEUE_CHECKIN,
} from '../queue.constants';

@Injectable()
export class CheckinListener {
  private readonly logger = new Logger(CheckinListener.name);

  constructor(
    @InjectQueue(QUEUE_CHECKIN)
    private readonly checkinQueue: Queue,
  ) {}

  @OnEvent(CHECKIN_REALIZADO)
  async handleCheckinRealizado(
    payload: CheckinRealizadoPayload,
  ): Promise<void> {
    await this.checkinQueue.add(
      CHECKIN_JOB_NAMES.REALIZADO,
      payload,
      DEFAULT_JOB_OPTIONS,
    );
    this.logger.debug(
      `Enqueued check-in job for appointment ${payload.appointmentId}`,
    );
  }
}
