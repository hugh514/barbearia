import { describe, it, expect } from 'vitest';
import { forwardedFor } from './forwarded-for';

const req = (headers: Record<string, string>) =>
  new Request('http://painel/api/auth/login', { headers });

describe('forwardedFor', () => {
  it('ligado, repassa só o último endereço, o que o proxy da frente anotou', () => {
    expect(forwardedFor(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }), true)).toEqual({
      'X-Forwarded-For': '203.0.113.7',
    });
  });

  it('sem X-Forwarded-For, usa o X-Real-IP', () => {
    expect(forwardedFor(req({ 'x-real-ip': '203.0.113.8' }), true)).toEqual({
      'X-Forwarded-For': '203.0.113.8',
    });
  });

  it('valor que não é IP não vai adiante', () => {
    expect(forwardedFor(req({ 'x-forwarded-for': 'evil, <script>' }), true)).toEqual({});
  });

  it('desligado (padrão), não repassa: o cabeçalho pode ter sido forjado pelo navegador', () => {
    expect(forwardedFor(req({ 'x-forwarded-for': '203.0.113.7' }), false)).toEqual({});
  });

  it('sem cabeçalho não inventa nada', () => {
    expect(forwardedFor(req({}), true)).toEqual({});
  });
});
