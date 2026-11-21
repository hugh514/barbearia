import { describe, expect, it } from 'vitest';
import { isPublicRoute, isSignedOutOnly } from './route-access';

describe('rotas públicas', () => {
  it('troca de senha é pública', () => {
    expect(isPublicRoute('/forgot-password')).toBe(true);
    expect(isPublicRoute('/reset-password')).toBe(true);
    expect(isPublicRoute('/planos')).toBe(false);
  });

  it('só login e cadastro mandam quem tem sessão para a home', () => {
    expect(isSignedOutOnly('/login')).toBe(true);
    expect(isSignedOutOnly('/cadastro')).toBe(true);
    expect(isSignedOutOnly('/reset-password')).toBe(false);
    expect(isSignedOutOnly('/forgot-password')).toBe(false);
  });
});
