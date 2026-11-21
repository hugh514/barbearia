'use client';

import { useQuery } from '@tanstack/react-query';
import { myHistory } from '@/features/history/services';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatBRL, formatDateTime, formatRelative } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: 'Na fila',
  EM_ATENDIMENTO: 'Na cadeira',
  CANCELADO: 'Cancelado',
};

function price(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? formatBRL(n) : null;
}

export default function HistoricoPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['my-history'],
    queryFn: ({ signal }) => myHistory(signal),
    staleTime: 15_000,
  });
  const items = history?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Histórico</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Nenhum atendimento ainda. Quando você passar pela barbearia, ele aparece aqui.
        </p>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((h) => {
              const value = h.status === 'FINALIZADO' ? price(h.totalPrice) : null;
              const when = h.finishedAt ?? h.createdAt;
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-foreground">
                      {h.services.join(', ') || 'Atendimento'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {h.barber?.name ? `${h.barber.name}, ` : ''}
                      <time dateTime={when} title={formatDateTime(when)}>
                        {formatRelative(when)}
                      </time>
                    </p>
                  </div>
                  {value ? (
                    <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
                      {value}
                    </span>
                  ) : (
                    STATUS_LABEL[h.status] && (
                      <StatusBadge tone={h.status === 'CANCELADO' ? 'danger' : 'neutral'}>
                        {STATUS_LABEL[h.status]}
                      </StatusBadge>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
