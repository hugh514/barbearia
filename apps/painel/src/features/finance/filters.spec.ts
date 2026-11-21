import { describe, it, expect } from 'vitest';
import { paymentsQuery, parsePaymentFilters } from './filters';

describe('parsePaymentFilters', () => {
  it('lê período, status, método e página da URL', () => {
    expect(
      parsePaymentFilters({ period: '7d', status: 'APROVADO', method: 'PIX', page: '2' }),
    ).toEqual({ period: '7d', status: 'APROVADO', method: 'PIX', page: 2 });
  });

  it('ignora valor desconhecido e página inválida', () => {
    expect(
      parsePaymentFilters({ period: 'x', status: 'pago', method: 'DINHEIRO', page: '-3' }),
    ).toEqual({ period: 'today', status: undefined, method: undefined, page: 1 });
  });
});

describe('paymentsQuery', () => {
  const now = new Date(2026, 10, 19, 15, 0);

  it('monta a query da API com dateFrom do período', () => {
    const q = paymentsQuery(
      { period: 'month', status: 'PENDENTE', method: undefined, page: 3 },
      now,
    );
    const p = new URLSearchParams(q);
    expect(p.get('dateFrom')).toBe(new Date(2026, 10, 1).toISOString());
    expect(p.get('status')).toBe('PENDENTE');
    expect(p.has('method')).toBe(false);
    expect(p.get('page')).toBe('3');
  });
});
