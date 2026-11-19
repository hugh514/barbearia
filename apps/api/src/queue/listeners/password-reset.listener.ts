import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { SENHA_RECUPERACAO_SOLICITADA } from '../../events/event-names';
import { SenhaRecuperacaoSolicitadaPayload } from '../../events/interfaces/event-payloads';
import {
  DEFAULT_JOB_OPTIONS,
  EMAIL_JOB_NAMES,
  QUEUE_EMAIL,
} from '../queue.constants';

@Injectable()
export class PasswordResetListener {
  constructor(@InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue) {}

  @OnEvent(SENHA_RECUPERACAO_SOLICITADA)
  async handle(payload: SenhaRecuperacaoSolicitadaPayload): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB_NAMES.PASSWORD_RESET,
      payload,
      DEFAULT_JOB_OPTIONS,
    );
  }
}
