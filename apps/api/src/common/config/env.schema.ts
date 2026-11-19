import { z } from 'zod';

function isPublicHttps(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'].includes(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    APP_NAME: z.string().default('Barber API'),
    DATABASE_URL: z.string().min(1),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional().default(''),
    SENTRY_DSN: z.string().optional().default(''),
    SWAGGER_ENABLED: z.preprocess(
      (val) => {
        if (val === undefined || val === '') {
          return process.env['NODE_ENV'] === 'production' ? 'false' : 'true';
        }
        return val;
      },
      z.enum(['true', 'false']).transform((v) => v === 'true'),
    ),
    SWAGGER_USER: z.string().default('admin'),
    SWAGGER_PASS: z.string().default('secret'),
    JWT_SECRET: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .min(32)
        .default('dev-jwt-secret-change-in-production-min-32-chars!!'),
    ),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .min(32)
        .default('dev-refresh-secret-change-production-32-chars!!'),
    ),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    INTERNAL_API_KEY: z
      .string()
      .min(16)
      .default('dev-internal-api-key-change-in-production'),
    MERCADO_PAGO_ACCESS_TOKEN: z
      .string()
      .default('TEST-dev-mercado-pago-access-token'),
    MERCADO_PAGO_WEBHOOK_SECRET: z
      .string()
      .min(8)
      .default('dev-mp-webhook-secret'),
    MERCADO_PAGO_NOTIFICATION_URL: z.string().optional().default(''),
    EVOLUTION_API_URL: z.string().default('http://localhost:8080'),
    EVOLUTION_API_KEY: z.string().default(''),
    INSTAGRAM_VERIFY_TOKEN: z.string().default('dev-instagram-verify-token'),
    INSTAGRAM_APP_SECRET: z.string().default('dev-instagram-app-secret'),
    INSTAGRAM_PAGE_ACCESS_TOKEN: z.string().default(''),
    OPENAI_API_KEY: z.string().default(''),
    OPENAI_MODEL: z.string().default('gpt-4o'),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
    // Vazio = escolhe pelo token: o token falso do .env.example usa o mock.
    PAYMENTS_PROVIDER: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.enum(['mock', 'mercadopago']).optional(),
    ),
    // URLs públicas dos fronts, usadas nos links de e-mail.
    PAINEL_PUBLIC_URL: z.string().optional(),
    CLIENTE_PUBLIC_URL: z.string().optional(),
    // Provedor de e-mail. Produção exige um provedor real (smtp).
    EMAIL_PROVIDER: z.enum(['log', 'smtp']).default('log'),
    // Proxy confiável à frente da API: false (padrão), true ou número de saltos.
    TRUST_PROXY: z
      .string()
      .default('false')
      .transform((v): boolean | number => {
        const t = v.trim().toLowerCase();
        if (t === '' || t === 'false' || t === '0') return false;
        if (t === 'true') return true;
        const n = Number(t);
        return Number.isInteger(n) && n > 0 ? n : false;
      }),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;

    const devChecks: Array<[keyof typeof data, boolean]> = [
      [
        'INSTAGRAM_VERIFY_TOKEN',
        data.INSTAGRAM_VERIFY_TOKEN === 'dev-instagram-verify-token',
      ],
      [
        'MERCADO_PAGO_ACCESS_TOKEN',
        data.MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-dev-'),
      ],
      ['DATABASE_URL', /\/\/barber:barber@/.test(data.DATABASE_URL)],
      [
        'ALLOWED_ORIGINS',
        data.ALLOWED_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean)
          .some(
            (o) =>
              o === '*' ||
              /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o),
          ),
      ],
      ['PAYMENTS_PROVIDER', data.PAYMENTS_PROVIDER === 'mock'],
      ['EMAIL_PROVIDER', data.EMAIL_PROVIDER === 'log'],
      ['PAINEL_PUBLIC_URL', !isPublicHttps(data.PAINEL_PUBLIC_URL)],
      ['CLIENTE_PUBLIC_URL', !isPublicHttps(data.CLIENTE_PUBLIC_URL)],
    ];
    for (const [field, insecure] of devChecks) {
      if (insecure) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} has a development value, not allowed in production`,
        });
      }
    }

    const insecureDefaults: Array<{
      field: keyof typeof data;
      defaultVal: string;
    }> = [
      {
        field: 'JWT_SECRET',
        defaultVal: 'dev-jwt-secret-change-in-production-min-32-chars!!',
      },
      {
        field: 'JWT_REFRESH_SECRET',
        defaultVal: 'dev-refresh-secret-change-production-32-chars!!',
      },
      {
        field: 'INTERNAL_API_KEY',
        defaultVal: 'dev-internal-api-key-change-in-production',
      },
      {
        field: 'MERCADO_PAGO_WEBHOOK_SECRET',
        defaultVal: 'dev-mp-webhook-secret',
      },
      {
        field: 'INSTAGRAM_APP_SECRET',
        defaultVal: 'dev-instagram-app-secret',
      },
      { field: 'SWAGGER_PASS', defaultVal: 'secret' },
    ];

    for (const { field, defaultVal } of insecureDefaults) {
      if ((data[field] as string) === defaultVal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} must be changed from its default value in production`,
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    PAYMENTS_PROVIDER:
      data.PAYMENTS_PROVIDER ??
      (data.MERCADO_PAGO_ACCESS_TOKEN === 'TEST-dev-mercado-pago-access-token'
        ? ('mock' as const)
        : ('mercadopago' as const)),
  }));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }
  return result.data;
}
