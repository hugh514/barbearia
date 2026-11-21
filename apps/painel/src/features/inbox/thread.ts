import type { Conversation, Message } from './schemas';

/** A API lista as mais recentes primeiro; a thread lê de cima para baixo. */
export function chronological(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * A API não guarda leitura por usuário; o sinal honesto é "o cliente falou por
 * último e ninguém respondeu".
 */
export function awaitingReply(
  c: Pick<Conversation, 'status'> & { lastMessage?: { direction: string } | null },
): boolean {
  return c.status !== 'FECHADA' && c.lastMessage?.direction === 'INBOUND';
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

export function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startToday) return TIME.format(d);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startYesterday) return 'ontem';
  return DAY.format(d);
}
