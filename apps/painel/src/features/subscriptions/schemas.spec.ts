import { describe, it, expect } from 'vitest';
import {
  actionsFor,
  parseStatusFilter,
  subscriptionListSchema,
} from './schemas';

describe('actionsFor', () => {
  it('ativa pode suspender, renovar e cancelar', () => {
    expect(actionsFor('ATIVO')).toEqual(['suspend', 'renew', 'cancel']);
  });

  it('pendente pode ser ativada no balcão, cobrada por PIX ou cancelada', () => {
    expect(actionsFor('PENDENTE')).toEqual(['activate', 'pix', 'cancel']);
  });

  it('suspensa pode voltar a ativa ou ser cancelada', () => {
    expect(actionsFor('SUSPENSO')).toEqual(['activate', 'cancel']);
  });

  it('cancelada é terminal', () => {
    expect(actionsFor('CANCELADO')).toEqual([]);
  });
});

describe('parseStatusFilter', () => {
  it('aceita só status conhecidos', () => {
    expect(parseStatusFilter('ATIVO')).toBe('ATIVO');
    expect(parseStatusFilter('ativo')).toBeUndefined();
    expect(parseStatusFilter('X&perPage=1000')).toBeUndefined();
    expect(parseStatusFilter(undefined)).toBeUndefined();
  });
});

describe('subscriptionListSchema', () => {
  it('valida a resposta paginada da API', () => {
    const parsed = subscriptionListSchema.parse({
      data: [
        {
          id: 's1',
          customerId: 'c1',
          planId: 'p1',
          status: 'ATIVO',
          startedAt: '2026-11-01T10:00:00.000Z',
          nextBillingAt: '2026-12-01T10:00:00.000Z',
          cancelledAt: null,
          createdAt: '2026-11-01T10:00:00.000Z',
          plan: { id: 'p1', name: 'Mensal', priceCents: 8000, intervalDays: 30 },
          customer: { id: 'c1', name: 'Ana', phone: '11999990000' },
        },
      ],
      meta: { total: 1, page: 1, perPage: 20, lastPage: 1 },
    });
    expect(parsed.data[0].plan?.name).toBe('Mensal');
  });
});
