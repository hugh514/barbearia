import { validateEnv } from './env.schema';

const prodBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:s3nh4-forte@db.interno:5432/barber',
  JWT_SECRET: 'prod-jwt-secret-com-mais-de-32-caracteres-ok',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-com-mais-de-32-caracteres',
  INTERNAL_API_KEY: 'prod-internal-key-bem-longa-e-unica',
  MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR-token-real-de-producao',
  MERCADO_PAGO_WEBHOOK_SECRET: 'prod-webhook-secret-unico',
  INSTAGRAM_APP_SECRET: 'prod-instagram-secret',
  INSTAGRAM_VERIFY_TOKEN: 'prod-verify-token-unico',
  SWAGGER_PASS: 'prod-swagger-pass',
  ALLOWED_ORIGINS: 'https://painel.barbearia.example',
  EMAIL_PROVIDER: 'smtp',
  PAINEL_PUBLIC_URL: 'https://painel.barbearia.example',
  CLIENTE_PUBLIC_URL: 'https://app.barbearia.example',
};

describe('validateEnv em produção', () => {
  it('aceita configuração segura', () => {
    expect(() => validateEnv(prodBase)).not.toThrow();
  });

  it.each([
    ['INSTAGRAM_VERIFY_TOKEN', 'dev-instagram-verify-token'],
    ['MERCADO_PAGO_ACCESS_TOKEN', 'TEST-dev-mercado-pago-access-token'],
    [
      'DATABASE_URL',
      'postgresql://barber:barber@db.interno:5432/barber_db?schema=public',
    ],
    ['ALLOWED_ORIGINS', 'http://localhost:3001,http://127.0.0.1:3002'],
    ['ALLOWED_ORIGINS', '*'],
    [
      'ALLOWED_ORIGINS',
      'https://painel.barbearia.example,http://localhost:3001',
    ],
    ['EMAIL_PROVIDER', 'log'],
    ['PAINEL_PUBLIC_URL', 'http://localhost:3001'],
    ['PAINEL_PUBLIC_URL', 'http://painel.barbearia.example'],
    ['CLIENTE_PUBLIC_URL', 'https://127.0.0.1:3002'],
    ['PAYMENTS_PROVIDER', 'mock'],
  ])('recusa %s com valor de desenvolvimento', (campo, valor) => {
    expect(() => validateEnv({ ...prodBase, [campo]: valor })).toThrow(campo);
  });

  it('exige as URLs públicas em produção', () => {
    const semPainel: Record<string, string> = { ...prodBase };
    delete semPainel.PAINEL_PUBLIC_URL;
    expect(() => validateEnv(semPainel)).toThrow('PAINEL_PUBLIC_URL');
  });

  it('em desenvolvimento aceita os padrões', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://barber:barber@127.0.0.1:5433/barber_db',
    });
    expect(env.PAYMENTS_PROVIDER).toBe('mock');
    expect(env.EMAIL_PROVIDER).toBe('log');
    expect(env.TRUST_PROXY).toBe(false);
  });

  it('com token real do Mercado Pago o padrão é mercadopago', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://x:y@h/d',
      MERCADO_PAGO_ACCESS_TOKEN: 'TEST-123456-sandbox-real',
    });
    expect(env.PAYMENTS_PROVIDER).toBe('mercadopago');
  });
});
