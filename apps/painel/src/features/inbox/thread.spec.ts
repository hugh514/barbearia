import { describe, it, expect } from 'vitest';
import { awaitingReply, chronological, relativeTime } from './thread';

const msg = (id: string, createdAt: string) => ({
  id,
  conversationId: 'c',
  content: id,
  direction: 'INBOUND' as const,
  channel: 'WHATSAPP' as const,
  createdAt,
});

describe('chronological', () => {
  it('a API manda as mais recentes primeiro; a thread mostra da mais antiga para a última', () => {
    const list = [msg('b', '2026-11-19T10:05:00Z'), msg('a', '2026-11-19T10:00:00Z')];
    expect(chronological(list).map((m) => m.id)).toEqual(['a', 'b']);
    expect(list[0].id).toBe('b');
  });
});

describe('awaitingReply', () => {
  it('última mensagem do cliente numa conversa aberta pede resposta', () => {
    expect(awaitingReply({ status: 'ABERTA', lastMessage: { direction: 'INBOUND' } })).toBe(true);
  });

  it('respondida ou fechada não pede', () => {
    expect(awaitingReply({ status: 'ABERTA', lastMessage: { direction: 'OUTBOUND' } })).toBe(false);
    expect(awaitingReply({ status: 'FECHADA', lastMessage: { direction: 'INBOUND' } })).toBe(false);
    expect(awaitingReply({ status: 'ABERTA', lastMessage: null })).toBe(false);
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 10, 19, 15, 0);

  it('hoje mostra a hora', () => {
    expect(relativeTime(new Date(2026, 10, 19, 9, 5).toISOString(), now)).toBe('09:05');
  });

  it('ontem diz ontem', () => {
    expect(relativeTime(new Date(2026, 10, 18, 22, 0).toISOString(), now)).toBe('ontem');
  });

  it('mais longe mostra a data', () => {
    expect(relativeTime(new Date(2026, 10, 2, 8, 0).toISOString(), now)).toBe('02/11');
  });
});
