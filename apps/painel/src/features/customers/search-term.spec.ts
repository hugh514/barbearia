import { describe, it, expect } from 'vitest';
import { looksLikePhone, searchTerm } from './search-term';

describe('searchTerm', () => {
  it.each([
    ['  Ana Costa ', 'Ana Costa'],
    ['(11) 98765-4321', '11987654321'],
    ['+55 11 9876', '55119876'],
    ['Barbeiro 2', 'Barbeiro 2'],
    ['', ''],
  ])('%j vira %j', (raw, term) => {
    expect(searchTerm(raw)).toBe(term);
  });
});

describe('looksLikePhone', () => {
  it('só dígitos e máscara contam como telefone', () => {
    expect(looksLikePhone('(11) 9')).toBe(true);
    expect(looksLikePhone('Ana 11')).toBe(false);
    expect(looksLikePhone('()')).toBe(false);
  });
});
