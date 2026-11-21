import { describe, expect, it } from 'vitest';
import { safeFrom } from './safe-redirect';

describe('safeFrom', () => {
  it('aceita caminho interno', () => {
    expect(safeFrom('/planos')).toBe('/planos');
    expect(safeFrom('/historico?page=2')).toBe('/historico?page=2');
    expect(safeFrom('/planos#pix')).toBe('/planos#pix');
  });

  it.each([
    null,
    undefined,
    '',
    '//evil.example',
    '//evil.example/planos',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'planos',
    ' /planos',
    // O parser de URL descarta tab, CR e LF: "/\t/x" vira "//x".
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '/\t\\evil.example',
    // "." e ".." resolvidos deixam o caminho começando com "//".
    '/..//evil.example',
    '/.//evil.example',
    '/x/..//evil.example/p',
    '/%2e%2e//evil.example',
  ])('recusa %j e cai na home', (from) => {
    expect(safeFrom(from)).toBe('/');
  });
});
