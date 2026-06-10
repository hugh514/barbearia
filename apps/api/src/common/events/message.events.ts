export const MENSAGEM_RECEBIDA = 'MENSAGEM_RECEBIDA';

export interface MensagemRecebidaPayload {
  messageId: string;
  conversationId: string;
  tenantId: string;
  customerId: string;
  content: string;
  direction: string;
  channel: string;
  externalId?: string | null;
}
