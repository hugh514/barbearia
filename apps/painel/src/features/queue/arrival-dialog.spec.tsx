import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';
import { ApiRequestError } from '@/lib/http/client';

const listCustomers = vi.fn();
const createCustomer = vi.fn();
vi.mock('@/features/customers/services', () => ({
  listCustomers: (...a: unknown[]) => listCustomers(...a),
  createCustomer: (...a: unknown[]) => createCustomer(...a),
}));
const createAppointment = vi.fn();
vi.mock('./services', () => ({
  createAppointment: (...a: unknown[]) => createAppointment(...a),
}));

import { ArrivalDialog } from './arrival-dialog';

const ana = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: 't',
  name: 'Ana Costa',
  phone: '11000000001',
  origin: 'MANUAL',
  planStatus: 'NONE',
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};
const page = (data: unknown[]) => ({ data, meta: { total: data.length, page: 1, perPage: 6, lastPage: 1 } });

function setup(inQueue: string[] = []) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ArrivalDialog open onClose={onClose} inQueue={new Set(inQueue)} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  listCustomers.mockResolvedValue(page([ana]));
  createAppointment.mockResolvedValue({});
});

describe('ArrivalDialog (Cliente chegou)', () => {
  it('busca pelo nome e põe o cliente existente na fila', async () => {
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), 'Ana');
    await waitFor(() =>
      expect(listCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Ana' }),
        expect.anything(),
      ),
    );
    await user.click(await screen.findByRole('button', { name: /Pôr Ana Costa na fila/ }));
    await waitFor(() => expect(createAppointment).toHaveBeenCalledWith(ana.id));
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText('Ana Costa entrou na fila.')).toBeInTheDocument();
  });

  it('busca por telefone mascarado manda só os dígitos', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), '(11) 0000');
    await waitFor(() =>
      expect(listCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: '110000' }),
        expect.anything(),
      ),
    );
  });

  it('quem já está na fila hoje não entra de novo', async () => {
    const { user } = setup([ana.id]);
    await user.type(screen.getByLabelText('Buscar cliente'), 'Ana');
    const item = await screen.findByRole('button', { name: /Ana Costa/ });
    expect(item).toBeDisabled();
    expect(item).toHaveTextContent('Já está na fila');
  });

  it('cadastra rápido com nome e telefone e põe na fila', async () => {
    listCustomers.mockResolvedValue(page([]));
    createCustomer.mockResolvedValue({ ...ana, id: '22222222-2222-4222-8222-222222222222', name: 'Bruno Lima' });
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), 'Bruno Lima');
    await user.click(await screen.findByRole('button', { name: 'Cadastrar cliente novo' }));

    expect(screen.getByLabelText('Nome')).toHaveValue('Bruno Lima');
    await user.type(screen.getByLabelText('Telefone'), '11987654321');
    await user.click(screen.getByRole('button', { name: 'Cadastrar e pôr na fila' }));

    await waitFor(() =>
      expect(createCustomer).toHaveBeenCalledWith({ name: 'Bruno Lima', phone: '(11) 98765-4321' }),
    );
    await waitFor(() =>
      expect(createAppointment).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222'),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('busca por telefone sem resultado já preenche o telefone no cadastro', async () => {
    listCustomers.mockResolvedValue(page([]));
    const { user } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), '11987654321');
    await user.click(await screen.findByRole('button', { name: 'Cadastrar cliente novo' }));
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98765-4321');
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('telefone de outro cliente mostra o erro e não põe na fila', async () => {
    listCustomers.mockResolvedValue(page([]));
    createCustomer.mockRejectedValue(new ApiRequestError(409, 'Phone already exists in this tenant'));
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), 'Bruno');
    await user.click(await screen.findByRole('button', { name: 'Cadastrar cliente novo' }));
    await user.type(screen.getByLabelText('Telefone'), '11000000001');
    await user.click(screen.getByRole('button', { name: 'Cadastrar e pôr na fila' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esse telefone já é de outro cliente. Busque pelo telefone.',
    );
    expect(createAppointment).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('atendimento em aberto mostra o aviso da API, qualquer que seja o texto', async () => {
    createAppointment.mockRejectedValue(new ApiRequestError(409, 'Cliente já tem atendimento em aberto.'));
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), 'Ana');
    await user.click(await screen.findByRole('button', { name: /Pôr Ana Costa na fila/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cliente já tem atendimento em aberto.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('se a fila falha depois do cadastro, tentar de novo não cadastra outra vez', async () => {
    listCustomers.mockResolvedValue(page([]));
    createCustomer.mockResolvedValue({ ...ana, id: '33333333-3333-4333-8333-333333333333', name: 'Caio' });
    createAppointment.mockRejectedValueOnce(new Error('Falha de rede')).mockResolvedValueOnce({});
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), 'Caio');
    await user.click(await screen.findByRole('button', { name: 'Cadastrar cliente novo' }));
    await user.type(screen.getByLabelText('Telefone'), '11911112222');
    await user.click(screen.getByRole('button', { name: 'Cadastrar e pôr na fila' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede');

    await user.click(screen.getByRole('button', { name: 'Cadastrar e pôr na fila' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createAppointment).toHaveBeenLastCalledWith('33333333-3333-4333-8333-333333333333');
  });

  it('erro na busca oferece tentar de novo', async () => {
    listCustomers.mockRejectedValueOnce(new Error('falhou'));
    const { user } = setup();
    await user.type(screen.getByLabelText('Buscar cliente'), 'Ana');
    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('button', { name: /Pôr Ana Costa na fila/ })).toBeInTheDocument();
  });
});
