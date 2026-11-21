import { describe, expect, it } from 'vitest';
import { resetPasswordSchema } from './schemas';

describe('resetPasswordSchema', () => {
  it('aceita senha forte confirmada', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 't', password: 'Nova1234', confirmPassword: 'Nova1234' })
        .success,
    ).toBe(true);
  });

  it('recusa confirmação diferente no campo de confirmação', () => {
    const r = resetPasswordSchema.safeParse({
      token: 't',
      password: 'Nova1234',
      confirmPassword: 'Nova12345',
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(['confirmPassword']);
  });

  it('recusa senha fraca', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 't', password: 'fraca', confirmPassword: 'fraca' }).success,
    ).toBe(false);
  });
});
