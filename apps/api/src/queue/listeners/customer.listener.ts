import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { CLIENTE_CADASTRADO } from '../../events/event-names';
import { ClienteCadastradoPayload } from '../../events/interfaces/event-payloads';
import {
  DEFAULT_JOB_OPTIONS,
  QUEUE_POST_REGISTRATION,
} from '../queue.constants';

@Injectable()
export class CustomerListener {
  private readonly logger = new Logger(CustomerListener.name);

  constructor(
    @InjectQueue(QUEUE_POST_REGISTRATION)
    private readonly postRegistrationQueue: Queue,
  ) {}

  @OnEvent(CLIENTE_CADASTRADO)
  async handleClienteCadastrado(
    payload: ClienteCadastradoPayload,
  ): Promise<void> {
    await this.postRegistrationQueue.add(
      'process',
      payload,
      DEFAULT_JOB_OPTIONS,
    );
    this.logger.debug(
      `Enqueued post-registration job for customer ${payload.customerId}`,
    );
  }
}
