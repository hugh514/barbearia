'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, Scissors } from 'lucide-react';
import { useSession } from '@/features/auth/session-context';
import { mySubscriptions } from '@/features/plans/services';
import { myHistory } from '@/features/history/services';
import { QrCheckin } from '@/features/checkin/qr-checkin';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCents } from '@/lib/format';

function isActive(status: string) {
  return status.toUpperCase().startsWith('ATIV');
}
function isPending(status: string) {
  return status.toUpperCase().startsWith('PEND');
}

export default function HomePage() {
  const { user } = useSession();
  const { data: subs, isLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: ({ signal }) => mySubscriptions(signal),
    staleTime: 15_000,
  });
  const { data: history } = useQuery({
    queryKey: ['my-history'],
    queryFn: ({ signal }) => myHistory(signal),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const active = subs?.data.find((s) => isActive(s.status));
  const pending = subs?.data.find((s) => isPending(s.status));
  const inQueue = history?.data.find(
    (h) => h.status === 'AGUARDANDO' || h.status === 'EM_ATENDIMENTO',
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-2xl font-bold text-foreground">
          {user?.email?.split('@')[0] ?? 'Membro'}
        </h1>
      </div>

      {/* Status na fila (após check-in) */}
      {inQueue && (
        <Card className="border-primary/40">
          <CardContent className="flex items-center gap-3 p-4">
            {inQueue.status === 'EM_ATENDIMENTO' ? (
              <Scissors className="size-5 text-primary" />
            ) : (
              <Clock className="size-5 text-primary" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {inQueue.status === 'EM_ATENDIMENTO'
                  ? 'Você está sendo atendido'
                  : 'Você está na fila'}
              </p>
              <p className="text-xs text-muted-foreground">
                {inQueue.status === 'EM_ATENDIMENTO'
                  ? inQueue.barber?.name ?? 'Aguarde, já é sua vez'
                  : 'Aguarde ser chamado'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plano */}
      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : active ? (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide opacity-80">
                Plano ativo
              </span>
              <StatusBadge tone="neutral">Ativo</StatusBadge>
            </div>
            <p className="mt-2 text-xl font-bold">{active.plan?.name ?? 'Assinatura'}</p>
            {active.plan && (
              <p className="text-sm opacity-90">
                {formatCents(active.plan.priceCents)} / {active.plan.intervalDays ?? 30}d
              </p>
            )}
          </CardContent>
        </Card>
      ) : pending ? (
        <Card className="border-primary/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Plano
              </span>
              <StatusBadge tone="amberSoft">Aguardando ativação</StatusBadge>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {pending.plan?.name ?? 'Assinatura'}
            </p>
            <p className="text-sm text-muted-foreground">
              Sua assinatura será ativada após a confirmação na barbearia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem um plano ativo
            </p>
            <a
              href="/planos"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Conheça nossos planos
            </a>
          </CardContent>
        </Card>
      )}

      <QrCheckin />
    </div>
  );
}
