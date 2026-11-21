import { apiClient } from '@/lib/http/client';
import {
  paymentSchema,
  planListSchema,
  subscriptionListSchema,
  subscriptionSchema,
  type Payment,
  type Subscription,
} from './schemas';

export async function listPlans(signal?: AbortSignal) {
  return apiClient('/plans?page=1&perPage=50', { schema: planListSchema, signal });
}

export async function mySubscriptions(signal?: AbortSignal) {
  return apiClient('/subscriptions/me?page=1&perPage=20', {
    schema: subscriptionListSchema,
    signal,
  });
}

export async function subscribe(customerId: string, planId: string): Promise<Subscription> {
  return apiClient('/subscriptions', {
    method: 'POST',
    body: { customerId, planId },
    schema: subscriptionSchema,
  });
}

export async function cancelSubscription(id: string): Promise<void> {
  await apiClient(`/subscriptions/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' });
}

export async function createPixPayment(subscriptionId: string): Promise<Payment> {
  return apiClient('/payments', {
    method: 'POST',
    body: { subscriptionId, method: 'PIX' },
    schema: paymentSchema,
  });
}

export async function getPayment(id: string, signal?: AbortSignal): Promise<Payment> {
  return apiClient(`/payments/${encodeURIComponent(id)}`, { schema: paymentSchema, signal });
}

export async function mockApprovePayment(id: string): Promise<Payment> {
  return apiClient(`/payments/${encodeURIComponent(id)}/mock-approve`, {
    method: 'POST',
    schema: paymentSchema,
  });
}

// A API não lista cobranças para o cliente: o aparelho guarda qual PIX é de cada
// assinatura pendente. Em outro aparelho a API responde 409 e o cliente cancela e
// assina de novo.
const KEY = 'bc_pix';

function readMap(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// Sem armazenamento (aba anônima, cota cheia) o PIX segue na tela, só não dá para retomar.
function writeMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch (e) {
    // Cota cheia e armazenamento bloqueado chegam como DOMException; o resto é bug.
    if (!(e instanceof DOMException)) throw e;
  }
}

export function rememberPayment(subscriptionId: string, paymentId: string): void {
  writeMap({ ...readMap(), [subscriptionId]: paymentId });
}

// Assinatura ativa ou cancelada não tem mais PIX para retomar.
export function forgetPayment(subscriptionId: string): void {
  const map = readMap();
  if (!(subscriptionId in map)) return;
  delete map[subscriptionId];
  writeMap(map);
}

export function recallPayment(subscriptionId: string): string | null {
  const id = readMap()[subscriptionId];
  return typeof id === 'string' ? id : null;
}
