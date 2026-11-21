import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetPayment, recallPayment, rememberPayment } from './services';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('PIX guardado no aparelho', () => {
  it('lembra o PIX de cada assinatura', () => {
    rememberPayment('sub-1', 'pay-1');
    rememberPayment('sub-2', 'pay-2');
    expect(recallPayment('sub-1')).toBe('pay-1');
    expect(recallPayment('sub-2')).toBe('pay-2');
  });

  it('esquece só a assinatura que ativou ou cancelou', () => {
    rememberPayment('sub-1', 'pay-1');
    rememberPayment('sub-2', 'pay-2');
    forgetPayment('sub-1');
    expect(recallPayment('sub-1')).toBeNull();
    expect(recallPayment('sub-2')).toBe('pay-2');
  });

  it('sem armazenamento não quebra a tela', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('bloqueado', 'SecurityError');
      },
    });
    expect(() => rememberPayment('sub-1', 'pay-1')).not.toThrow();
    expect(() => forgetPayment('sub-1')).not.toThrow();
    expect(recallPayment('sub-1')).toBeNull();
  });
});
