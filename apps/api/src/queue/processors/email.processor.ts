import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { Job } from 'bullmq';
import { Env } from '@common/config/env.schema';
import { EMAIL_SENDER, EmailSender } from '@modules/email/email.interface';
import { SenhaRecuperacaoSolicitadaPayload } from '../../events/interfaces/event-payloads';
import { EMAIL_JOB_NAMES, QUEUE_EMAIL } from '../queue.constants';

@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    private readonly config: ConfigService<Env, true>,
  ) {
    super();
  }

  async process(job: Job<SenhaRecuperacaoSolicitadaPayload>): Promise<void> {
    if (job.name !== EMAIL_JOB_NAMES.PASSWORD_RESET) {
      throw new Error(`Unknown email job name: ${job.name}`);
    }
    const { email, token, tenantSlug, role } = job.data;

    const isCliente = role === UserRole.CLIENTE;
    const baseUrl =
      this.config.get(isCliente ? 'CLIENTE_PUBLIC_URL' : 'PAINEL_PUBLIC_URL', {
        infer: true,
      }) ?? (isCliente ? 'http://localhost:3002' : 'http://localhost:3001');
    const params = new URLSearchParams({ token, tenant: tenantSlug });
    const link = `${baseUrl.replace(/\/+$/, '')}/reset-password?${params}`;

    await this.sender.send({
      to: email,
      subject: 'Redefinição de senha',
      text: `Para redefinir sua senha, acesse o link (vale por 30 minutos): ${link}`,
      link,
    });
    this.logger.log({ msg: 'Password reset e-mail sent', jobId: job.id });
  }
}
