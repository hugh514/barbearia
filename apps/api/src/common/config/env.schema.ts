import { z } from 'zod';

export const envSchema = z.object({
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
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
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
});

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
