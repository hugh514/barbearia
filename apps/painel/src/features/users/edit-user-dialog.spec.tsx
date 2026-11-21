import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';

const updateUser = vi.fn();
vi.mock('./services', () => ({
  updateUser: (...a: unknown[]) => updateUser(...a),
  listStaff: vi.fn(),
  createUser: vi.fn(),
  deactivateUser: vi.fn(),
}));

import { EditUserDialog } from './edit-user-dialog';
import type { User } from './schemas';

const bruno: User = {
  id: 'b1',
  tenantId: 't',
  name: 'Bruno Lima',
  email: 'bruno@x.example',
  role: 'BARBEIRO',
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

function setup(canChangeRole: boolean) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <EditUserDialog user={bruno} canChangeRole={canChangeRole} onClose={onClose} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  updateUser.mockResolvedValue(bruno);
});

describe('EditUserDialog', () => {
  it('troca nome e papel e manda só o que mudou', async () => {
    const { user, onClose } = setup(true);
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Bruno L.');
    await user.selectOptions(screen.getByLabelText('Papel'), 'GERENTE');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('b1', { name: 'Bruno L.', role: 'GERENTE' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('sem permissão de papel o campo fica travado e não vai no PATCH', async () => {
    const { user } = setup(false);
    expect(screen.getByLabelText('Papel')).toBeDisabled();
    await user.type(screen.getByLabelText('Nome'), ' Jr');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('b1', { name: 'Bruno Lima Jr' }));
  });

  it('nome vazio mostra o erro e não salva', async () => {
    const { user } = setup(true);
    await user.clear(screen.getByLabelText('Nome'));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
