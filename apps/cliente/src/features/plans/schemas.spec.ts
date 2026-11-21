import { describe, expect, it } from 'vitest';
import { currentSubscription, isMockPayment, type Subscription } from './schemas';

const sub = (id: string, status: string): Subscription => ({ id, status });

describe('currentSubscription', () => {
  it('prefere a ativa', () => {
    expect(currentSubscription([sub('p', 'PENDENTE'), sub('a', 'ATIVO')])?.id).toBe('a');
  });
  it('sem ativa, a pendente', () => {
    expect(currentSubscription([sub('c', 'CANCELADO'), sub('p', 'PENDENTE')])?.id).toBe('p');
  });
  it('suspensa por atraso continua sendo o plano atual', () => {
    expect(currentSubscription([sub('c', 'CANCELADO'), sub('s', 'SUSPENSO')])?.id).toBe('s');
    expect(currentSubscription([sub('p', 'PENDENTE'), sub('s', 'SUSPENSO')])?.id).toBe('s');
    expect(currentSubscription([sub('s', 'SUSPENSO'), sub('a', 'ATIVO')])?.id).toBe('a');
  });
  it('cancelada não conta', () => {
    expect(currentSubscription([sub('c', 'CANCELADO')])).toBeNull();
    expect(currentSubscription(undefined)).toBeNull();
  });
});

describe('isMockPayment', () => {
  it('só quando a API marca gatewayData.mock true', () => {
    expect(isMockPayment({ gatewayData: { mock: true, method: 'PIX' } })).toBe(true);
    expect(isMockPayment({ gatewayData: { mock: 'true' } })).toBe(false);
    expect(isMockPayment({ gatewayData: { id: 123 } })).toBe(false);
    expect(isMockPayment({ gatewayData: null })).toBe(false);
    expect(isMockPayment({})).toBe(false);
  });
});
