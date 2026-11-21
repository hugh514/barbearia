'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { formatCents } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  actionsFor,
  STATUS_LABEL,
  STATUS_TONE,
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionAction,
  type SubscriptionStatus,
} from './schemas';
import {
  chargeByPix,
  listSubscriptions,
  runSubscriptionAction,
  SUBSCRIPTIONS_KEY,
} from './services';
import { CreateSubscriptionDialog, PixPanel } from './create-subscription-dialog';

const DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const fmtDate = (iso?: string | null) => (iso ? DATE.format(new Date(iso)) : 'Sem data');

const FILTER_LABEL: Record<SubscriptionStatus, string> = {
  ATIVO: 'Ativas',
  PENDENTE: 'Pendentes',
  SUSPENSO: 'Suspensas',
  CANCELADO: 'Canceladas',
};

const ACTION: Record<
  SubscriptionAction,
  { label: string; confirm: string; done: string; destructive?: boolean; describe: (s: Subscription) => string }
> = {
  activate: {
    label: 'Ativar',
    confirm: 'Ativar assinatura',
    done: 'Assinatura ativada.',
    describe: (s) => `A assinatura de ${s.customer?.name ?? 'cliente'} fica ativa agora, com o pagamento recebido no balcão.`,
  },
  suspend: {
    label: 'Suspender',
    confirm: 'Suspender assinatura',
    done: 'Assinatura suspensa.',
    destructive: true,
    describe: (s) => `${s.customer?.name ?? 'O cliente'} fica sem os benefícios do plano até a assinatura ser ativada de novo.`,
  },
  renew: {
    label: 'Renovar',
    confirm: 'Renovar assinatura',
    done: 'Assinatura renovada.',
    describe: (s) => {
      const base = s.nextBillingAt ? new Date(s.nextBillingAt) : new Date();
      const next = new Date(base);
      next.setDate(next.getDate() + (s.plan?.intervalDays ?? 30));
      return `A próxima renovação passa de ${fmtDate(s.nextBillingAt)} para ${DATE.format(next)}. Use depois de receber o pagamento do ciclo.`;
    },
  },
  cancel: {
    label: 'Cancelar',
    confirm: 'Cancelar assinatura',
    done: 'Assinatura cancelada.',
    destructive: true,
    describe: (s) => `O cancelamento não pode ser desfeito. Para voltar ao plano, ${s.customer?.name ?? 'o cliente'} precisa assinar de novo.`,
  },
};

export function SubscriptionsView({ status, page }: { status?: SubscriptionStatus; page: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [charging, setCharging] = useState<Subscription | null>(null);
  const [pending, setPending] = useState<{ sub: Subscription; action: SubscriptionAction } | null>(null);

  const query = useQuery({
    queryKey: [...SUBSCRIPTIONS_KEY, status ?? 'todas', page],
    queryFn: ({ signal }) => listSubscriptions({ status, page }, signal),
    placeholderData: keepPreviousData,
  });

  const run = useMutation({
    mutationFn: ({ sub, action }: { sub: Subscription; action: SubscriptionAction }) =>
      runSubscriptionAction(sub.id, action),
    onSuccess: (_d, { action }) => {
      toast(ACTION[action].done);
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Não foi possível alterar a assinatura.', 'error'),
    onSettled: () => setPending(null),
  });

  const href = (s?: SubscriptionStatus, p = 1) => {
    const q = new URLSearchParams();
    if (s) q.set('status', s);
    if (p > 1) q.set('page', String(p));
    const qs = q.toString();
    return qs ? `/assinaturas?${qs}` : '/assinaturas';
  };

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        description="Quem assina cada plano, quando renova e o que fazer com cada assinatura."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Nova assinatura
          </Button>
        }
      />

      <nav aria-label="Filtrar por status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {[undefined, ...SUBSCRIPTION_STATUSES].map((s) => {
          const active = s === status;
          return (
            <Link
              key={s ?? 'todas'}
              href={href(s)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                active
                  ? 'bg-accent font-semibold text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {s ? FILTER_LABEL[s] : 'Todas'}
            </Link>
          );
        })}
      </nav>

      {query.isError && (
        <ErrorState
          message="Não foi possível carregar as assinaturas."
          action={
            <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
              Tentar de novo
            </Button>
          }
        />
      )}

      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Carregando assinaturas">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !query.isError && rows.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
          {status
            ? `Nenhuma assinatura ${FILTER_LABEL[status].toLowerCase()}.`
            : 'Nenhuma assinatura ainda. Use Nova assinatura para assinar um plano para um cliente.'}
        </div>
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Assinaturas</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 font-medium">Plano</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Próxima renovação</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-foreground">{s.customer?.name ?? 'Cliente'}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{s.customer?.phone}</span>
                  </td>
                  <td className="px-4 py-3">{s.plan?.name ?? 'Plano'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {s.status === 'CANCELADO'
                      ? `Cancelada em ${fmtDate(s.cancelledAt)}`
                      : s.status === 'PENDENTE'
                        ? 'Aguardando pagamento'
                        : fmtDate(s.nextBillingAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {s.plan ? formatCents(s.plan.priceCents) : ''}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex gap-1">
                      {actionsFor(s.status).map((a) =>
                        a === 'pix' ? (
                          <Button
                            key={a}
                            size="sm"
                            variant="ghost"
                            aria-label={`Cobrar por PIX a assinatura de ${s.customer?.name ?? 'cliente'}`}
                            onClick={() => setCharging(s)}
                          >
                            Cobrar por PIX
                          </Button>
                        ) : (
                          <Button
                            key={a}
                            size="sm"
                            variant="ghost"
                            aria-label={`${ACTION[a].confirm} de ${s.customer?.name ?? 'cliente'}`}
                            className={cn(ACTION[a].destructive && 'text-destructive')}
                            onClick={() => setPending({ sub: s, action: a })}
                          >
                            {ACTION[a].label}
                          </Button>
                        ),
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {meta && meta.lastPage > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">Página {meta.page} de {meta.lastPage}</span>
          <span className="flex gap-2">
            {meta.page > 1 && (
              <Link href={href(status, meta.page - 1)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                Página anterior
              </Link>
            )}
            {meta.page < meta.lastPage && (
              <Link href={href(status, meta.page + 1)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                Próxima página
              </Link>
            )}
          </span>
        </nav>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => pending && run.mutate(pending)}
        title={pending ? `${ACTION[pending.action].confirm}?` : ''}
        description={pending ? ACTION[pending.action].describe(pending.sub) : undefined}
        confirmLabel={pending ? ACTION[pending.action].confirm : undefined}
        tone={pending && ACTION[pending.action].destructive ? 'destructive' : 'default'}
        loading={run.isPending}
      />

      {charging && (
        <ChargePixDialog
          subscription={charging}
          onDone={() => queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })}
          onClose={() => {
            setCharging(null);
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
          }}
        />
      )}

      {creating && (
        <CreateSubscriptionDialog
          onClose={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
          }}
        />
      )}
    </div>
  );
}

function ChargePixDialog({
  subscription,
  onDone,
  onClose,
}: {
  subscription: Subscription;
  onDone: () => void;
  onClose: () => void;
}) {
  const charge = useQuery({
    queryKey: ['pix-charge', subscription.id],
    queryFn: () => chargeByPix(subscription.id),
    staleTime: Infinity,
    // Reabrir depois de recusado ou expirado precisa pedir de novo, não ler o cache.
    gcTime: 0,
    retry: false,
  });
  return (
    <Dialog open onClose={onClose} title="Cobrança por PIX" description={subscription.customer?.name}>
      {charge.isPending ? (
        <p className="text-sm text-muted-foreground">Gerando o PIX…</p>
      ) : charge.isError ? (
        <ErrorState
          message={charge.error instanceof Error ? charge.error.message : 'Não foi possível gerar o PIX.'}
          action={
            <Button variant="secondary" size="sm" onClick={() => charge.refetch()}>
              Tentar de novo
            </Button>
          }
        />
      ) : (
        <PixPanel payment={charge.data} onApproved={onDone} onClose={onClose} />
      )}
    </Dialog>
  );
}
