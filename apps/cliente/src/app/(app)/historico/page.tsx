'use client';

import { useQuery } from '@tanstack/react-query';
import { myHistory } from '@/features/history/services';
import { Card, CardContent } from '@/components/ui/card';
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
      <h1 className="text-2xl font-bold text-foreground">Histórico</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Você ainda não tem atendimentos.
        </p>
      ) : (
        <div className="space-y-2">
          {data!.data.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {h.services.join(', ') || 'Atendimento'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.barber?.name ?? 'Sem barbeiro'} · {formatDateTime(h.createdAt)}
                  </p>
                </div>
                <StatusBadge
                  tone={h.status === 'FINALIZADO' ? 'success' : 'neutral'}
                >
                  {STATUS_LABEL[h.status] ?? h.status}
                </StatusBadge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
