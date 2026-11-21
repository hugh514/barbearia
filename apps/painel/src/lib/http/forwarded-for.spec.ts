import { describe, it, expect } from 'vitest';
import { forwardedFor } from './forwarded-for';

const withHeader = new Request('http://painel/api/auth/login', {
  headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.2' },
});

describe('forwardedFor', () => {
  it('com o repasse ligado, leva o X-Forwarded-For de quem chamou o BFF', () => {
    expect(forwardedFor(withHeader, true)).toEqual({ 'X-Forwarded-For': '203.0.113.7, 10.0.0.2' });
  });

  it('desligado (padrão), não repassa: o cabeçalho pode ter sido forjado pelo navegador', () => {
    expect(forwardedFor(withHeader, false)).toEqual({});
  });

  it('sem o cabeçalho não inventa nada', () => {
    expect(forwardedFor(new Request('http://painel/api/auth/login'), true)).toEqual({});
  });
});
