import { describe, it, expect } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('aceita caminho interno com query', () => {
    expect(safeRedirect('/clientes?page=2')).toBe('/clientes?page=2');
  });

  it('resolve pontos de caminho que ficam dentro do painel', () => {
    expect(safeRedirect('/clientes/../fila#topo')).toBe('/fila#topo');
  });

  it.each([
    [null],
    [''],
    ['https://evil.example'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['\\\\evil.example'],
    ['javascript:alert(1)'],
    ['clientes'],
    ['/..//evil.example'],
    ['/.//evil.example'],
    ['/x/..//evil.example/p'],
    ['/%2e%2e//evil.example'],
    ['/\r\nSet-Cookie: x'],
  ])('recusa %j e volta para /', (from) => {
    expect(safeRedirect(from)).toBe('/');
  });
});
