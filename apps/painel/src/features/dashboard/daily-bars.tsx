import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Day {
  date: string; // AAAA-MM-DD
  count: number;
  revenue: number;
}

const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const plural = (n: number) => (n === 1 ? 'atendimento' : 'atendimentos');

export function DailyBars({ days }: { days: Day[] }) {
  const max = Math.max(0, ...days.map((d) => d.count));
  if (max === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum atendimento finalizado no período.
      </p>
    );
  }
  // Mês: rótulo a cada cinco dias e no último, para não encavalar no celular.
  const showLabel = (i: number) =>
    days.length <= 10 || i % 5 === 0 || i === days.length - 1;

  return (
    <figure>
      <div className="relative" aria-hidden>
        <span className="absolute -top-2 left-0 bg-card pr-1 text-xs tabular-nums text-muted-foreground">
          {max}
        </span>
        <div className="flex h-40 items-end gap-0.5 border-b border-input border-t border-t-border pt-3">
          {days.map((d) => (
            <div
              key={d.date}
              title={`${dayLabel(d.date)}: ${d.count} ${plural(d.count)}, ${formatBRL(d.revenue)}`}
              className="flex h-full min-w-0 flex-1 items-end hover:bg-secondary"
            >
              <div
                data-bar
                className="w-full rounded-t-[4px] bg-primary"
                style={{ height: `${(d.count / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-0.5">
          {days.map((d, i) => (
            <span
              key={d.date}
              className={cn(
                'min-w-0 flex-1 whitespace-nowrap text-center text-xs tabular-nums text-muted-foreground',
                // Pontas alinhadas para dentro: o rótulo não vaza do painel no celular.
                i === 0 && 'text-left',
                i === days.length - 1 && 'text-right',
              )}
            >
              {showLabel(i) ? dayLabel(d.date) : ''}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Atendimentos por dia</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Atendimentos</th>
            <th scope="col">Receita</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{d.count}</td>
              <td>{formatBRL(d.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
