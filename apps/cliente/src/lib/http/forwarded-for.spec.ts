import { describe, expect, it } from 'vitest';
import { forwardedFor } from './forwarded-for';

const h = (init: Record<string, string>) => new Headers(init);

describe('forwardedFor', () => {
  it('desligado (padrão), não repassa nada: sem proxy na frente o cabeçalho é forjável', () => {
    expect(forwardedFor(h({ 'x-forwarded-for': '203.0.113.9' }), false)).toBeNull();
    expect(forwardedFor(h({ 'x-real-ip': '198.51.100.4' }), false)).toBeNull();
  });

  it('ligado, usa o último endereço do X-Forwarded-For, o que o proxy da frente anotou', () => {
    expect(forwardedFor(h({ 'x-forwarded-for': '203.0.113.9' }), true)).toBe('203.0.113.9');
    expect(forwardedFor(h({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }), true)).toBe('203.0.113.9');
    expect(forwardedFor(h({ 'x-forwarded-for': '2001:db8::1' }), true)).toBe('2001:db8::1');
  });

  it('ligado, cai no X-Real-IP quando não há X-Forwarded-For', () => {
    expect(forwardedFor(h({ 'x-real-ip': '198.51.100.4' }), true)).toBe('198.51.100.4');
  });

  it.each([{}, { 'x-forwarded-for': 'evil, ' }, { 'x-forwarded-for': 'a.b.c.d' }])(
    'ligado, devolve null para %j',
    (init) => {
      expect(forwardedFor(h(init as Record<string, string>), true)).toBeNull();
    },
  );
});
