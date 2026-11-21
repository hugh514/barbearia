import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DailyBars } from './daily-bars';

const days = [
  { date: '2026-11-17', count: 2, revenue: 80 },
  { date: '2026-11-18', count: 0, revenue: 0 },
  { date: '2026-11-19', count: 4, revenue: 160 },
];

describe('DailyBars', () => {
  it('desenha uma barra por dia com altura proporcional ao maior dia', () => {
    const { container } = render(<DailyBars days={days} />);
    const bars = container.querySelectorAll('[data-bar]');
    expect(bars).toHaveLength(3);
    expect((bars[0] as HTMLElement).style.height).toBe('50%');
    expect((bars[2] as HTMLElement).style.height).toBe('100%');
  });

  it('traz a mesma série numa tabela para leitor de tela', () => {
    render(<DailyBars days={days} />);
    const table = screen.getByRole('table', { name: 'Atendimentos por dia' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[3]).getByText('19/11')).toBeInTheDocument();
    expect(within(rows[3]).getByText('4')).toBeInTheDocument();
  });

  it('sem nenhum atendimento mostra o vazio em texto', () => {
    render(<DailyBars days={days.map((d) => ({ ...d, count: 0 }))} />);
    expect(screen.getByText('Nenhum atendimento finalizado no período.')).toBeInTheDocument();
  });
});
