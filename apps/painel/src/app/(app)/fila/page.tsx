'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueue } from '@/features/queue/use-queue';
import { QueueBoard } from '@/features/queue/queue-board';
import { ArrivalDialog } from '@/features/queue/arrival-dialog';

export default function FilaPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQueue();
  const [arrival, setArrival] = useState(false);
  const inQueue = new Set(
    (data ?? [])
      .filter((a) => a.status === 'AGUARDANDO' || a.status === 'EM_ATENDIMENTO')
      .map((a) => a.customerId),
  );

  return (
    <div>
      <PageHeader
        title="Fila de hoje"
        description="Por ordem de chegada. A lista se atualiza sozinha."
        actions={
          <Button variant="secondary" size="lg" onClick={() => setArrival(true)}>
            <UserPlus />
            Cliente chegou
          </Button>
        }
      />

      {isError && (
        <div className="mb-4">
          <ErrorState
            message={error instanceof Error ? error.message : 'Não foi possível carregar a fila.'}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
                Tentar de novo
              </Button>
            }
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Carregando a fila">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError && !data ? null : (
        <QueueBoard appointments={data ?? []} />
      )}

      <ArrivalDialog open={arrival} onClose={() => setArrival(false)} inQueue={inQueue} />
    </div>
  );
}
