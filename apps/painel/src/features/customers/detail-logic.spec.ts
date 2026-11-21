import { describe, it, expect } from 'vitest';
import { changedFields, currentSubscription } from './detail-logic';
import type { CustomerSubscription } from './schemas';

const sub = (id: string, status: CustomerSubscription['status']): CustomerSubscription => ({
  id,
  status,
  createdAt: '2026-11-01T10:00:00.000Z',
});

describe('currentSubscription', () => {
  it('pega a mais recente que não foi cancelada', () => {
    expect(currentSubscription([sub('c', 'CANCELADO'), sub('a', 'ATIVO'), sub('p', 'PENDENTE')])?.id).toBe('a');
  });

  it('sem assinatura viva devolve null', () => {
    expect(currentSubscription([sub('c', 'CANCELADO')])).toBeNull();
    expect(currentSubscription([])).toBeNull();
  });
});

describe('changedFields', () => {
  const original = { name: 'Ana Costa', phone: '11000000001', instagramUser: null };

  it('nada mudou devolve objeto vazio', () => {
    expect(changedFields(original, { name: ' Ana Costa ', phone: '(11) 0000-00001', instagramUser: '' })).toEqual({});
  });

  it('manda só o que mudou, comparando telefone pelos dígitos', () => {
    expect(
      changedFields(original, { name: 'Ana C.', phone: '(11) 98765-4321', instagramUser: '@ana' }),
    ).toEqual({ name: 'Ana C.', phone: '(11) 98765-4321', instagramUser: '@ana' });
  });
});
