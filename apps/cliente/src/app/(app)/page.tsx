'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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
      <h1 className="text-[28px] leading-tight font-bold text-foreground">
        Olá, {user?.email?.split('@')[0] ?? 'cliente'}
      </h1>

      {/* Status na fila (após check-in) */}
      {inQueue && (
        <Card className="border-primary bg-accent" role="status">
          <CardContent className="p-5">
            <p className="text-4xl leading-none font-extrabold font-stretch-extra-condensed text-foreground">
              {inQueue.status === 'EM_ATENDIMENTO' ? 'Sua vez' : 'Na fila'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {inQueue.status === 'EM_ATENDIMENTO'
                ? `Você está na cadeira${inQueue.barber?.name ? ` com ${inQueue.barber.name}` : ''}.`
                : 'Fique por perto. A equipe chama pela ordem de chegada.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!inQueue && <QrCheckin />}

      {/* Plano */}
      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : active ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Seu plano</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-lg font-bold text-foreground">
                {active.plan?.name ?? 'Assinatura'}
              </p>
              <StatusBadge tone="success">Ativo</StatusBadge>
            </div>
            {active.plan && (
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatCents(active.plan.priceCents)} a cada{' '}
                {active.plan.intervalDays ?? 30} dias
              </p>
            )}
          </CardContent>
        </Card>
      ) : pending ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Seu plano</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-lg font-bold text-foreground">
                {pending.plan?.name ?? 'Assinatura'}
              </p>
              <StatusBadge tone="warning">Aguardando ativação</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ativa assim que a barbearia confirmar o pagamento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem plano.
            </p>
            <Link
              href="/planos"
              className="mt-1 inline-flex min-h-11 items-center text-base font-semibold text-primary-text hover:underline"
            >
              Ver planos da barbearia
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
