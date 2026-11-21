import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PERIOD_LABEL, PERIOD_OPTIONS, type PanelPeriod } from './period';

export function PeriodPicker({
  current,
  basePath,
  params = {},
}: {
  current: PanelPeriod;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label="Período" className="inline-flex rounded-md border border-input bg-card p-0.5">
      {PERIOD_OPTIONS.map((p) => {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
        q.set('period', p);
        const active = p === current;
        return (
          <Link
            key={p}
            href={`${basePath}?${q.toString()}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-[4px] px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              active
                ? 'bg-accent font-semibold text-accent-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {PERIOD_LABEL[p]}
          </Link>
        );
      })}
    </nav>
  );
}
