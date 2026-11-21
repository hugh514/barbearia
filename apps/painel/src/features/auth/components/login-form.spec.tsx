import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
const refresh = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => new URLSearchParams(search),
}));

const loginRequest = vi.fn();
vi.mock('@/features/auth/services', () => ({
  loginRequest: (...args: unknown[]) => loginRequest(...args),
}));

import { LoginForm } from './login-form';

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
});

async function entrar() {
  loginRequest.mockResolvedValue({ id: '1', email: 'a@b.com', role: 'ADMIN', tenantId: 't1' });
  const user = userEvent.setup();
  render(<LoginForm />);
  await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
  await user.type(screen.getByLabelText('Senha'), 'segredo123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(replace).toHaveBeenCalled());
}

describe('LoginForm', () => {
  it('valida e-mail inválido antes de chamar a API', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'nao-e-email');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it('faz login e redireciona em sucesso', async () => {
    loginRequest.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      role: 'ADMIN',
      tenantId: 't1',
    });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() =>
      expect(loginRequest).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'segredo123',
      }),
    );
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('mostra erro do servidor sem redirecionar', async () => {
    loginRequest.mockRejectedValue(new Error('Credenciais inválidas'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /credenciais inválidas/i,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('não expõe token no DOM', async () => {
    loginRequest.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      role: 'ADMIN',
      tenantId: 't1',
    });
    const user = userEvent.setup();
    const { container } = render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(loginRequest).toHaveBeenCalled());
    expect(container.innerHTML).not.toMatch(/eyJ|Bearer|accessToken/);
  });

  it('volta para o caminho interno de from', async () => {
    search = 'from=%2Fclientes%3Fpage%3D2';
    await entrar();
    expect(replace).toHaveBeenCalledWith('/clientes?page=2');
  });

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example'])(
    'from externo %s vai para a raiz',
    async (from) => {
      search = `from=${encodeURIComponent(from)}`;
      await entrar();
      expect(replace).toHaveBeenCalledWith('/');
    },
  );

  it('mostra e oculta a senha', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const senha = screen.getByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(senha).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(senha).toHaveAttribute('type', 'password');
  });

  it('erro do servidor fica acima do botão Entrar', async () => {
    loginRequest.mockRejectedValue(new Error('Credenciais inválidas'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    const botao = screen.getByRole('button', { name: 'Entrar' });
    await user.click(botao);
    const alerta = await screen.findByRole('alert');
    expect(alerta.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
