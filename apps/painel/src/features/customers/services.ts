import { apiClient } from '@/lib/http/client';
import { unmaskDigits } from '@/lib/masks';
import {
  customerConversationsSchema,
  customerHistorySchema,
  customerListSchema,
  customerPaymentsSchema,
  customerSchema,
  customerSubscriptionsSchema,
  type CreateCustomerInput,
  type CustomerList,
  type Customer,
  type UpdateCustomerInput,
} from './schemas';

export interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export async function listCustomers(
  params: ListParams = {},
  signal?: AbortSignal,
): Promise<CustomerList> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('perPage', String(params.perPage ?? 20));
  if (params.search) q.set('search', params.search);

  return apiClient(`/customers?${q.toString()}`, {
    schema: customerListSchema,
    signal,
  });
}

/** Corpo para a API: telefone só com dígitos e Instagram no campo `instagram`. */
function toApi(input: UpdateCustomerInput) {
  const body: { name?: string; phone?: string; instagram?: string } = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.phone !== undefined) body.phone = unmaskDigits(input.phone);
  if (input.instagramUser) body.instagram = input.instagramUser.trim();
  return body;
}

export async function createCustomer(
  input: CreateCustomerInput,
  idempotencyKey?: string,
): Promise<Customer> {
  return apiClient('/customers', {
    method: 'POST',
    body: toApi(input),
    schema: customerSchema,
    idempotencyKey,
  });
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  return apiClient(`/customers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: toApi(input),
    schema: customerSchema,
  });
}

export async function getCustomer(id: string, signal?: AbortSignal): Promise<Customer> {
  return apiClient(`/customers/${encodeURIComponent(id)}`, { schema: customerSchema, signal });
}

const PER_PAGE = 10;
const sub = (id: string, what: string, page: number) =>
  `/customers/${encodeURIComponent(id)}/${what}?page=${page}&perPage=${PER_PAGE}`;

export async function listCustomerHistory(id: string, page = 1, signal?: AbortSignal) {
  return apiClient(sub(id, 'history', page), { schema: customerHistorySchema, signal });
}

export async function listCustomerPayments(id: string, page = 1, signal?: AbortSignal) {
  return apiClient(sub(id, 'payments', page), { schema: customerPaymentsSchema, signal });
}

export async function listCustomerConversations(id: string, page = 1, signal?: AbortSignal) {
  return apiClient(sub(id, 'conversations', page), {
    schema: customerConversationsSchema,
    signal,
  });
}

export async function listCustomerSubscriptions(id: string, signal?: AbortSignal) {
  return apiClient(
    `/subscriptions?customerId=${encodeURIComponent(id)}&page=1&perPage=5`,
    { schema: customerSubscriptionsSchema, signal },
  );
}
