'use client';

import { useQuery } from '@tanstack/react-query';
import { myHistory } from '@/features/history/services';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ATENDIMENTO: 'Em atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export default function HistoricoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-history'],
    queryFn: ({ signal }) => myHistory(signal),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Histórico</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum atendimento ainda. Quando você passar pela barbearia, ele aparece aqui.
        </p>
      ) : (
        <Card className="divide-y divide-border">
          {data!.data.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {h.services.join(', ') || 'Atendimento'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.barber?.name ? `${h.barber.name}, ` : ''}
                    <span className="tabular-nums">{formatDateTime(h.createdAt)}</span>
                  </p>
                </div>
                {h.status !== 'FINALIZADO' && (
                  <StatusBadge tone={h.status === 'CANCELADO' ? 'danger' : 'neutral'}>
                    {STATUS_LABEL[h.status] ?? h.status}
                  </StatusBadge>
                )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
