import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailSender } from './email.interface';

const MAX_KEPT = 100;

/**
 * Provedor de dev e teste: não envia nada. Registra no log só o assunto e o
 * link (o endereço do destinatário não vai para o log) e guarda os últimos
 * envios em memória para o e2e conferir.
 */
@Injectable()
export class LogEmailProvider implements EmailSender {
  private readonly logger = new Logger(LogEmailProvider.name);
  private readonly sent = new Map<string, EmailMessage>();

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `E-mail (log): ${message.subject}${message.link ? ` | ${message.link}` : ''}`,
    );
    const key = message.to.toLowerCase();
    this.sent.delete(key);
    this.sent.set(key, message);
    if (this.sent.size > MAX_KEPT) {
      this.sent.delete(this.sent.keys().next().value as string);
    }
  }

  lastSentTo(to: string): EmailMessage | undefined {
    return this.sent.get(to.toLowerCase());
  }
}
