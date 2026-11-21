import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3033';
const PORT = new URL(BASE_URL).port || '3033';

/**
 * E2E do cliente contra uma API de dev com provedor de pagamento mock e
 * TRUST_PROXY=true (os passos de preparo variam o X-Forwarded-For para não
 * esbarrar no limite de 5 logins por minuto). O Next de teste liga
 * FORWARD_CLIENT_IP, fazendo o papel do proxy da frente, para conferir que o
 * limite vale por IP. Sempre com o navegador visível.
 * Prints de docs/prints/cliente só com PRINTS=1.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: process.env.PRINTS ? [] : ['**/prints.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: false,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'celular',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, headless: false },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT} -H 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      API_BASE_URL: process.env.E2E_API_URL ?? 'http://127.0.0.1:3030',
      COOKIE_SECURE: 'false',
      FORWARD_CLIENT_IP: 'true',
    },
  },
});
