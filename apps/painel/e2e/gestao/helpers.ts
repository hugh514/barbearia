import { expect, type Page, type APIRequestContext } from '@playwright/test';

// Rotas internas (criar conversa e mensagem) vão direto na API com a chave de dev.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000';
const INTERNAL_KEY = process.env.E2E_INTERNAL_KEY ?? 'dev-internal-api-key-change-in-production';
const PRINTS = '../../docs/prints/painel';
export const run = Date.now().toString().slice(-6);
let seq = 0;

export async function print(page: Page, name: string) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: `${PRINTS}/${name}-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${PRINTS}/${name}-celular.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
}

export async function api<T>(page: Page, method: 'GET' | 'POST', path: string, data?: unknown): Promise<T> {
  const res = await page.request.fetch(`/api${path}`, { method, data });
  expect(res.ok(), `${method} ${path}: ${res.status()}`).toBeTruthy();
  return res.json() as Promise<T>;
}

export async function newCustomer(page: Page, name: string) {
  const phone = `119${Date.now().toString().slice(-7)}${seq++ % 10}`;
  return api<{ id: string; name: string }>(page, 'POST', '/customers', {
    name,
    phone,
    origin: 'MANUAL',
  });
}

export async function tenantId(page: Page): Promise<string> {
  const { token } = await api<{ token: string }>(page, 'GET', '/realtime/token');
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).tenantId;
}

export async function internal(request: APIRequestContext, tenant: string, path: string, data: unknown) {
  const res = await request.post(`${API}${path}`, {
    data,
    headers: { 'X-Internal-Key': INTERNAL_KEY, 'X-Tenant-Id': tenant },
  });
  expect(res.ok(), `${path}: ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

export function row(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}
