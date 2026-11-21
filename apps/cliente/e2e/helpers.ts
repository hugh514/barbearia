import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3030';
export const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3033';
export const SLUG = process.env.E2E_TENANT_SLUG ?? 'barbearia-modelo';
const REDIS = process.env.E2E_REDIS_CONTAINER ?? 'barb-cli-redis-1';
const ADMIN = { email: 'admin@barbearia.example', password: 'admin123' };
export const PASSWORD = 'Cliente123';

// IP falso por chamada: a API de teste confia no X-Forwarded-For (TRUST_PROXY).
const ip = () => `10.${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}`;

async function api<T>(path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip(),
      'idempotency-key': randomUUID(),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

type Tokens = { accessToken: string; refreshToken: string };
export type Client = Tokens & { email: string; name: string; userId: string };

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${randomInt(1000, 9999)}@cliente.example`;
}

/** Cliente novo pela API, para cada teste não depender do estado do anterior. */
export async function newClient(name = 'Teste Fila'): Promise<Client> {
  const email = uniqueEmail();
  const tokens = await api<Tokens>('/auth/register-client', {
    method: 'POST',
    body: { name, phone: `1199${randomInt(1000000, 9999999)}`, email, password: PASSWORD, tenantSlug: SLUG },
  });
  const sub = JSON.parse(Buffer.from(tokens.accessToken.split('.')[1], 'base64url').toString()).sub;
  return { ...tokens, email, name, userId: sub };
}

/** Sessão do cliente no navegador sem passar pela tela de login (poupa o limite). */
export async function signIn(context: BrowserContext, c: Tokens) {
  await context.addCookies([
    { name: 'bc_at', value: c.accessToken, url: BASE, httpOnly: true, sameSite: 'Lax' },
    { name: 'bc_rt', value: c.refreshToken, url: BASE, httpOnly: true, sameSite: 'Lax' },
  ]);
}

let adminToken: string | null = null;
async function admin(): Promise<string> {
  adminToken ??= (await api<Tokens>('/auth/login', { method: 'POST', body: { ...ADMIN, tenantSlug: SLUG } })).accessToken;
  return adminToken;
}

export async function enterQueue(c: Client): Promise<string> {
  const { token } = await api<{ token: string }>('/checkin/token', { method: 'POST', token: c.accessToken });
  const res = await api<{ appointment: { id: string } }>('/checkin/consume', {
    method: 'POST',
    token: await admin(),
    body: { token },
  });
  return res.appointment.id;
}

/**
 * Fila vazia e cadeira livre: uma rodada interrompida deixa atendimento aberto
 * e gente esperando, e aí a posição e o "próximo" do teste não batem.
 */
export async function clearQueue() {
  const token = await admin();
  const list = (status: string) =>
    api<{ data: { id: string }[] }>(`/appointments?status=${status}&page=1&perPage=100`, { token });
  for (const a of (await list('EM_ATENDIMENTO')).data) await finishService(a.id, 1);
  for (const a of (await list('AGUARDANDO')).data) {
    await api(`/appointments/${a.id}/cancel`, { method: 'PATCH', token, body: {} });
  }
}

export async function startService(appointmentId: string) {
  await api(`/appointments/${appointmentId}/start`, { method: 'PATCH', token: await admin() });
}

export async function finishService(appointmentId: string, totalPrice: number) {
  await api(`/appointments/${appointmentId}/finish`, {
    method: 'PATCH',
    token: await admin(),
    body: { totalPrice, services: ['Corte'] },
  });
}

/**
 * Plano suspenso como o job de cobrança deixa quando o pagamento atrasa: ativo
 * pelo balcão, suspenso, pago por PIX (o ciclo anterior) e suspenso de novo. O
 * id desse PIX já pago volta para o teste simular o aparelho que ainda o guarda.
 */
export async function suspendedPlan(c: Client): Promise<{ subscriptionId: string; paidPixId: string }> {
  const claims = JSON.parse(Buffer.from(c.accessToken.split('.')[1], 'base64url').toString());
  const me = await api<{ customerId: string }>('/auth/me', { token: c.accessToken });
  const plans = await api<{ data: { id: string; active: boolean }[] }>('/plans?page=1&perPage=50', {
    token: c.accessToken,
  });
  const plan = plans.data.find((p) => p.active);
  if (!plan) throw new Error('nenhum plano ativo no tenant de teste');
  const sub = await api<{ id: string }>('/subscriptions', {
    method: 'POST',
    token: await admin(),
    body: { customerId: me.customerId, planId: plan.id },
  });
  const suspend = async () => {
    const res = await fetch(`${API}/subscriptions/${sub.id}/suspend`, {
      method: 'PATCH',
      headers: {
        'x-internal-key': process.env.E2E_INTERNAL_API_KEY ?? 'dev-internal-api-key-change-in-production',
        'x-tenant-id': claims.tenantId,
        'x-forwarded-for': ip(),
      },
    });
    if (!res.ok) throw new Error(`suspend -> ${res.status} ${await res.text()}`);
  };
  await suspend();
  const pix = await api<{ id: string }>('/payments', {
    method: 'POST',
    token: c.accessToken,
    body: { subscriptionId: sub.id, method: 'PIX' },
  });
  await api(`/payments/${pix.id}/mock-approve`, { method: 'POST', token: c.accessToken });
  await expectSubscriptionStatus(c, 'ATIVO');
  await suspend();
  return { subscriptionId: sub.id, paidPixId: pix.id };
}

async function expectSubscriptionStatus(c: Client, status: string) {
  for (let i = 0; i < 20; i++) {
    const subs = await api<{ data: { status: string }[] }>('/subscriptions/me?page=1&perPage=20', {
      token: c.accessToken,
    });
    if (subs.data.some((s) => s.status === status)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`assinatura não ficou ${status}`);
}

function redis(...args: string[]): string {
  return execFileSync('docker', ['exec', REDIS, 'redis-cli', ...args], { encoding: 'utf8' }).trim();
}

/**
 * Token de troca de senha que a API gerou no forgot-password. Em dev o e-mail
 * vai para o provedor de log, sem link; o token fica no Redis da API.
 */
export function resetTokenFor(userId: string): string | null {
  const keys = redis('--scan', '--pattern', 'pwreset:*').split('\n').filter(Boolean);
  for (const key of keys) {
    const value = redis('GET', key);
    if (value.includes(userId)) return key.slice('pwreset:'.length);
  }
  return null;
}
