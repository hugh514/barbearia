import { z } from 'zod';
import { ApiRequestError, apiClient } from '@/lib/http/client';
import { paginated } from '@/lib/zod/base';
import { paymentListSchema, paymentSchema } from '@/features/finance/schemas';
import {
  subscriptionListSchema,
  subscriptionSchema,
  type SubscriptionAction,
  type SubscriptionStatus,
} from './schemas';

export const SUBSCRIPTIONS_KEY = ['subscriptions'];

export async function listSubscriptions(
  params: { status?: SubscriptionStatus; page: number },
  signal?: AbortSignal,
) {
  const q = new URLSearchParams({ page: String(params.page), perPage: '20' });
  if (params.status) q.set('status', params.status);
  return apiClient(`/subscriptions?${q.toString()}`, { schema: subscriptionListSchema, signal });
}

/** Cancelar tem rota própria (vale também para o cliente); as demais são da equipe. */
export async function runSubscriptionAction(id: string, action: SubscriptionAction) {
  const path =
    action === 'cancel' ? `/subscriptions/${id}/cancel` : `/subscriptions/${id}/manual/${action}`;
  return apiClient(path, { method: 'PATCH', schema: subscriptionSchema });
}

export async function createSubscription(body: {
  customerId: string;
  planId: string;
  activateNow: boolean;
}) {
  return apiClient('/subscriptions', { method: 'POST', body, schema: subscriptionSchema });
}

async function createPixPayment(subscriptionId: string) {
  return apiClient('/payments', {
    method: 'POST',
    body: { subscriptionId, method: 'PIX' },
    schema: paymentSchema,
  });
}

/** A API recusa um segundo PIX pendente (409); nesse caso reaproveita o que já existe. */
export async function chargeByPix(subscriptionId: string) {
  try {
    return await createPixPayment(subscriptionId);
  } catch (e) {
    if (!(e instanceof ApiRequestError) || e.status !== 409) throw e;
    const q = new URLSearchParams({ subscriptionId, status: 'PENDENTE', perPage: '1' });
    const pending = await apiClient(`/payments?${q.toString()}`, { schema: paymentListSchema });
    if (!pending.data[0]) throw e;
    return pending.data[0];
  }
}

export async function getPayment(id: string, signal?: AbortSignal) {
  return apiClient(`/payments/${id}`, { schema: paymentSchema, signal });
}

const customerOptionSchema = z.object({ id: z.string(), name: z.string(), phone: z.string() });
export type CustomerOption = z.infer<typeof customerOptionSchema>;

export async function searchCustomers(search: string, signal?: AbortSignal) {
  const q = new URLSearchParams({ search, perPage: '8', page: '1' });
  return apiClient(`/customers?${q.toString()}`, {
    schema: paginated(customerOptionSchema),
    signal,
  });
}
