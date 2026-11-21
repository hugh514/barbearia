import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.fn();
vi.mock('@/lib/http/client', () => ({ apiClient: (...a: unknown[]) => apiClient(...a) }));

import {
  createCustomer,
  getCustomer,
  listCustomerHistory,
  listCustomers,
  updateCustomer,
} from './services';

beforeEach(() => {
  apiClient.mockReset();
  apiClient.mockResolvedValue({});
});

const body = () => apiClient.mock.calls[0][1].body;

describe('services de clientes', () => {
  it('createCustomer manda o telefone só com dígitos e o Instagram no campo da API', async () => {
    await createCustomer({ name: 'Ana', phone: '(11) 98765-4321', instagramUser: '@ana' });
    expect(apiClient.mock.calls[0][0]).toBe('/customers');
    expect(body()).toEqual({ name: 'Ana', phone: '11987654321', instagram: '@ana' });
  });

  it('createCustomer sem Instagram não manda o campo', async () => {
    await createCustomer({ name: 'Ana', phone: '11987654321', instagramUser: '' });
    expect(body()).toEqual({ name: 'Ana', phone: '11987654321' });
  });

  it('updateCustomer manda só o que mudou, telefone em dígitos', async () => {
    await updateCustomer('id-1', { phone: '(11) 98765-4321' });
    expect(apiClient.mock.calls[0][0]).toBe('/customers/id-1');
    expect(apiClient.mock.calls[0][1].method).toBe('PATCH');
    expect(body()).toEqual({ phone: '11987654321' });
  });

  it('listCustomers monta a query da página e da busca', async () => {
    await listCustomers({ page: 3, perPage: 20, search: 'Ana' });
    expect(apiClient.mock.calls[0][0]).toBe('/customers?page=3&perPage=20&search=Ana');
  });

  it('id na URL vai codificado', async () => {
    await getCustomer('a/b');
    expect(apiClient.mock.calls[0][0]).toBe('/customers/a%2Fb');
    await listCustomerHistory('x', 2);
    expect(apiClient.mock.calls[1][0]).toBe('/customers/x/history?page=2&perPage=10');
  });
});
