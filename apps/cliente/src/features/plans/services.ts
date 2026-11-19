import { apiClient } from '@/lib/http/client';
import { planListSchema, subscriptionListSchema } from './schemas';

export async function listPlans(signal?: AbortSignal) {
  return apiClient('/plans?page=1&perPage=50', {
    schema: planListSchema,
    signal,
  });
}

export async function mySubscriptions(signal?: AbortSignal) {
  return apiClient('/subscriptions/me?page=1&perPage=20', {
    schema: subscriptionListSchema,
    signal,
  });
}

export async function subscribe(
  customerId: string,
  planId: string,
): Promise<void> {
  await apiClient('/subscriptions', {
    method: 'POST',
    body: { customerId, planId },
  });
}
