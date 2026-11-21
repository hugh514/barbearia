import { describe, it, expect } from 'vitest';
import { listHref, readListParams } from './list-params';

const sp = (s: string) => new URLSearchParams(s);

describe('readListParams', () => {
  it('lê página e busca da URL', () => {
    expect(readListParams(sp('page=3&q=Ana'))).toEqual({ page: 3, q: 'Ana' });
  });

  it.each(['', 'page=0', 'page=-2', 'page=abc', 'page=1.5', 'page=99999999999'])(
    'página inválida (%s) vira 1',
    (s) => {
      expect(readListParams(sp(s)).page).toBe(1);
    },
  );

  it('busca longa é cortada em 100 caracteres', () => {
    expect(readListParams(sp(`q=${'a'.repeat(300)}`)).q).toHaveLength(100);
  });
});

describe('listHref', () => {
  it('omite página 1 e busca vazia', () => {
    expect(listHref({ page: 1, q: '' })).toBe('/clientes');
  });

  it('codifica a busca', () => {
    expect(listHref({ page: 2, q: 'João & Cia' })).toBe('/clientes?q=Jo%C3%A3o+%26+Cia&page=2');
  });
});
