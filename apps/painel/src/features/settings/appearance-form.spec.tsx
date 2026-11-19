import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const saveAppearance = vi.fn();
vi.mock('./appearance-services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./appearance-services')>()),
  saveAppearance: (...args: unknown[]) => saveAppearance(...args),
}));

import { AppearanceForm } from './appearance-form';

function setup(
  initial = { brandColor: '#1F4FB8', themeMode: 'light' as const },
  configExists = true,
) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AppearanceForm initial={initial} configExists={configExists} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => vi.clearAllMocks());

describe('AppearanceForm', () => {
  it('mostra os seis presets e marca o atual', () => {
    setup();
    const presets = screen.getAllByRole('radio', { name: /cobalto|grafite|bordô|verde-garrafa|petróleo|ameixa/i });
    expect(presets).toHaveLength(6);
    expect(screen.getByRole('radio', { name: /cobalto/i })).toBeChecked();
  });

  it('salva preset e modo escolhidos via PATCH e recarrega o tema', async () => {
    saveAppearance.mockResolvedValue({ brandColor: '#6E1F2A', themeMode: 'dark' });
    const user = setup();

    await user.click(screen.getByRole('radio', { name: /bordô/i }));
    await user.click(screen.getByRole('radio', { name: /escuro/i }));
    expect(screen.getByLabelText(/cor em hex/i)).toHaveValue('#6E1F2A');

    await user.click(screen.getByRole('button', { name: /salvar aparência/i }));

    await waitFor(() =>
      expect(saveAppearance).toHaveBeenCalledWith({ brandColor: '#6e1f2a', themeMode: 'dark' }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText('Aparência salva.')).toBeInTheDocument();
  });

  it('envia o hex normalizado em #rrggbb mesmo digitado curto', async () => {
    saveAppearance.mockResolvedValue({});
    const user = setup();
    const hex = screen.getByLabelText(/cor em hex/i);
    await user.clear(hex);
    await user.type(hex, ' #AbC ');
    await user.click(screen.getByRole('button', { name: /salvar aparência/i }));
    await waitFor(() =>
      expect(saveAppearance).toHaveBeenCalledWith({ brandColor: '#aabbcc', themeMode: 'light' }),
    );
  });

  it('sem configuração da barbearia não deixa salvar e explica', () => {
    setup(undefined, false);
    expect(screen.getByText(/salve os dados da barbearia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar aparência/i })).toBeDisabled();
  });

  it('aceita hex livre e recusa hex inválido sem chamar a API', async () => {
    const user = setup();
    const hex = screen.getByLabelText(/cor em hex/i);

    await user.clear(hex);
    await user.type(hex, '#12');
    expect(screen.getByText(/use o formato #RRGGBB/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar aparência/i })).toBeDisabled();

    await user.clear(hex);
    await user.type(hex, '#336699');
    expect(screen.queryByText(/use o formato #RRGGBB/i)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cobalto/i })).not.toBeChecked();
    expect(saveAppearance).not.toHaveBeenCalled();
  });
});
