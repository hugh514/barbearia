import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailSender } from './email.interface';

const MAX_KEPT = 100;

/**
 * Provedor de dev e teste: não envia nada. Registra no log só o assunto
 * (nem o link com token nem o destinatário vão para o log) e guarda os últimos
 * envios em memória para o e2e conferir.
 */
@Injectable()
export class LogEmailProvider implements EmailSender {
  private readonly logger = new Logger(LogEmailProvider.name);
  private readonly sent = new Map<string, EmailMessage[]>();

  async send(message: EmailMessage): Promise<void> {
    // Nada de link, token ou destinatário no log.
    this.logger.log(`E-mail (log): ${message.subject}`);
    const key = message.to.toLowerCase();
    const list = this.sent.get(key) ?? [];
    list.push(message);
    this.sent.delete(key);
    this.sent.set(key, list.slice(-10));
    if (this.sent.size > MAX_KEPT) {
      this.sent.delete(this.sent.keys().next().value as string);
    }
  }

  /** Todos os envios guardados para o endereço (mais antigos primeiro). */
  sentTo(to: string): EmailMessage[] {
    return this.sent.get(to.toLowerCase()) ?? [];
  }

  lastSentTo(to: string): EmailMessage | undefined {
    return this.sentTo(to).at(-1);
  }
}
