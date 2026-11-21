import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';
import { ApiRequestError } from '@/lib/http/client';

const updateCustomer = vi.fn();
vi.mock('./services', () => ({ updateCustomer: (...a: unknown[]) => updateCustomer(...a) }));

import { CustomerEditForm } from './customer-edit-form';

const ana = {
  id: 'c1',
  tenantId: 't',
  name: 'Ana Costa',
  phone: '11000000001',
  instagramUser: null,
  origin: 'MANUAL' as const,
  planStatus: 'NONE' as const,
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <CustomerEditForm customer={ana} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => vi.clearAllMocks());

describe('CustomerEditForm', () => {
  it('começa com os dados do cliente e o botão desligado até mudar algo', () => {
    setup();
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Costa');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 00000-0001');
    expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeDisabled();
  });

  it('salva só o nome alterado', async () => {
    updateCustomer.mockResolvedValue({ ...ana, name: 'Ana Souza' });
    const user = setup();
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Ana Souza');
    await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith('c1', { name: 'Ana Souza' }));
    expect(await screen.findByText('Dados do cliente salvos.')).toBeInTheDocument();
  });

  it('telefone de outro cliente mostra o erro', async () => {
    updateCustomer.mockRejectedValue(new ApiRequestError(409, 'Phone already exists in this tenant'));
    const user = setup();
    await user.clear(screen.getByLabelText('Telefone'));
    await user.type(screen.getByLabelText('Telefone'), '11000000002');
    await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse telefone já é de outro cliente.');
  });

  it('nome vazio não chama a API', async () => {
    const user = setup();
    await user.clear(screen.getByLabelText('Nome'));
    await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(updateCustomer).not.toHaveBeenCalled();
  });
});
