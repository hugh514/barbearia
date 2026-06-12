import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import {
  PAGAMENTO_APROVADO,
  PAGAMENTO_RECUSADO,
} from '../../events/event-names';
import {
  PagamentoAprovadoPayload,
  PagamentoRecusadoPayload,
} from '../../events/interfaces/event-payloads';
import { DEFAULT_JOB_OPTIONS, QUEUE_POST_PAYMENT } from '../queue.constants';

@Injectable()
export class PaymentListener {
  private readonly logger = new Logger(PaymentListener.name);

  constructor(
    @InjectQueue(QUEUE_POST_PAYMENT) private readonly postPaymentQueue: Queue,
  ) {}

  @OnEvent(PAGAMENTO_APROVADO)
  async handlePagamentoAprovado(
    payload: PagamentoAprovadoPayload,
  ): Promise<void> {
    await this.postPaymentQueue.add('approved', payload, DEFAULT_JOB_OPTIONS);
    this.logger.debug(
      `Enqueued post-payment (approved) job for payment ${payload.paymentId}`,
    );
  }

  @OnEvent(PAGAMENTO_RECUSADO)
  async handlePagamentoRecusado(
    payload: PagamentoRecusadoPayload,
  ): Promise<void> {
    await this.postPaymentQueue.add('rejected', payload, DEFAULT_JOB_OPTIONS);
    this.logger.debug(
      `Enqueued post-payment (rejected) job for payment ${payload.paymentId}`,
    );
  }
}
