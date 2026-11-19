import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './dialog';

function Harness({ onCloseOuter = () => {} }: { onCloseOuter?: () => void }) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Dialog
        open={open}
        onClose={() => {
          onCloseOuter();
          setOpen(false);
        }}
        title="Externo"
      >
        <input aria-label="Nome" />
        <button onClick={() => setInner(true)}>Abrir interno</button>
        <Dialog open={inner} onClose={() => setInner(false)} title="Interno">
          <button>Ok</button>
        </Dialog>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('tem role dialog, aria-modal e nome pelo título', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = screen.getByRole('dialog', { name: 'Externo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('prende o foco: Tab no último volta ao primeiro e Shift+Tab no primeiro vai ao último', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const first = screen.getByRole('button', { name: 'Fechar' });
    const last = screen.getByRole('button', { name: 'Abrir interno' });
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('Esc fecha e devolve o foco a quem abriu', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Esc fecha só o diálogo do topo', async () => {
    const user = userEvent.setup();
    const onCloseOuter = vi.fn();
    render(<Harness onCloseOuter={onCloseOuter} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Abrir interno' }));
    expect(screen.getByRole('dialog', { name: 'Interno' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Interno' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Externo' })).toBeInTheDocument();
    expect(onCloseOuter).not.toHaveBeenCalled();
  });
});
