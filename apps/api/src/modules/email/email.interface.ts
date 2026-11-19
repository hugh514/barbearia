export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Link principal da mensagem (ex.: redefinição de senha). */
  link?: string;
}

/**
 * Provedor de e-mail. Em dev e teste usa o LogEmailProvider. Para produção,
 * implemente esta interface (SMTP, SES, etc.) e troque o useExisting no
 * EmailModule.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
