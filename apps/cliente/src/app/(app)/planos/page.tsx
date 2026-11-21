'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import {
  cancelSubscription,
  createPixPayment,
  forgetPayment,
  getPayment,
  listPlans,
  mySubscriptions,
  recallPayment,
  rememberPayment,
  subscribe,
} from '@/features/plans/services';
import { currentSubscription, type Subscription } from '@/features/plans/schemas';
import { PixPayment } from '@/features/plans/pix-payment';
import { getMe } from '@/features/profile/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionBadge } from '@/features/plans/subscription-badge';
import { ApiRequestError } from '@/lib/http/client';
import { formatCents } from '@/lib/format';

const DAY = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function errorText(e: unknown, fallback: string, conflict?: string): string {
  if (conflict && e instanceof ApiRequestError && e.status === 409) return conflict;
  return e instanceof Error ? e.message : fallback;
}

export default function PlanosPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: ({ signal }) => listPlans(signal),
    staleTime: 60_000,
  });
  const subs = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: ({ signal }) => mySubscriptions(signal),
    // Pagando: confere a cada 3 s até a assinatura ficar ativa.
    refetchInterval: (q) => {
      const status = currentSubscription(q.state.data?.data)?.status;
      return paymentId && status && status !== 'ATIVO' ? 3000 : false;
    },
  });
  const current = currentSubscription(subs.data?.data);
  const awaitingPayment = current?.status === 'PENDENTE' || current?.status === 'SUSPENSO';
  if (paymentId && current?.status === 'ATIVO' && !paid) {
    setPaid(true);
    setPaymentId(null);
  }
  const activeId = current?.status === 'ATIVO' ? current.id : null;
  useEffect(() => {
    if (activeId) forgetPayment(activeId);
  }, [activeId]);

  async function startPayment(sub: Subscription) {
    // Só retoma o PIX guardado se ainda estiver aberto: o de um ciclo já pago
    // prenderia a tela em "ativando" com o plano suspenso.
    const stored = recallPayment(sub.id);
    if (stored) {
      const previous = await getPayment(stored).catch(() => null);
      if (previous?.status === 'PENDENTE') {
        setPaymentId(stored);
        return;
      }
      forgetPayment(sub.id);
    }
    const payment = await createPixPayment(sub.id);
    rememberPayment(sub.id, payment.id);
    setPaymentId(payment.id);
  }

  const subscribeMut = useMutation({
    mutationFn: async (planId: string) => {
      const me = await getMe();
      if (!me.customerId) throw new Error('Sua conta não tem cadastro de cliente. Fale com a barbearia.');
      const sub = await subscribe(me.customerId, planId);
      await startPayment(sub);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] }),
    onError: (e) =>
      setError(errorText(e, 'Não foi possível assinar. Tente de novo.', 'Você já tem um plano. Atualize a página.')),
  });

  const payMut = useMutation({
    mutationFn: (opts: { sub: Subscription; fresh?: boolean }) => {
      if (opts.fresh) {
        return createPixPayment(opts.sub.id).then((p) => {
          rememberPayment(opts.sub.id, p.id);
          setPaymentId(p.id);
        });
      }
      return startPayment(opts.sub);
    },
    onError: (e) =>
      setError(
        errorText(
          e,
          'Não foi possível gerar o PIX. Tente de novo.',
          'Já existe um PIX aberto para este plano, gerado em outro aparelho. Pague por lá ou cancele e assine de novo.',
        ),
      ),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelSubscription(id),
    onSuccess: (_, id) => {
      forgetPayment(id);
      setConfirmCancel(false);
      setPaymentId(null);
      setPaid(false);
      setNotice('Assinatura cancelada.');
      return queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
    onError: (e) => setError(errorText(e, 'Não foi possível cancelar. Tente de novo.')),
  });

  const busy = subscribeMut.isPending || payMut.isPending;

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Planos</h1>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div aria-live="polite">
        {paid && current?.status === 'ATIVO' && (
          <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-base font-semibold text-success">
            Pagamento confirmado. {current.plan?.name ?? 'Seu plano'} está ativo.
          </p>
        )}
        {notice && !current && (
          <p role="status" className="rounded-md bg-secondary px-4 py-3 text-base text-foreground">
            {notice}
          </p>
        )}
      </div>

      {subs.isLoading || plans.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : current ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Seu plano</p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <p className="text-lg font-bold text-foreground">{current.plan?.name ?? 'Assinatura'}</p>
                <SubscriptionBadge status={current.status} />
              </div>
              {current.plan && (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatCents(current.plan.priceCents)} a cada {current.plan.intervalDays ?? 30} dias
                  {current.status === 'ATIVO' && current.nextBillingAt
                    ? `, renova em ${DAY.format(new Date(current.nextBillingAt))}`
                    : ''}
                </p>
              )}
              {current.status === 'SUSPENSO' && (
                <p className="mt-2 text-base text-foreground">Pague por PIX para reativar o plano.</p>
              )}
            </div>

            {awaitingPayment &&
              (paymentId ? (
                <PixPayment
                  paymentId={paymentId}
                  onRetry={() => {
                    setError(null);
                    payMut.mutate({ sub: current, fresh: true });
                  }}
                />
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    payMut.mutate({ sub: current });
                  }}
                >
                  {busy ? 'Gerando PIX…' : 'Pagar com PIX'}
                </Button>
              ))}

            <Button variant="secondary" className="w-full" onClick={() => setConfirmCancel(true)}>
              Cancelar assinatura
            </Button>
          </CardContent>
        </Card>
      ) : (
        (plans.data?.data ?? [])
          .filter((p) => p.active)
          .map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="text-lg font-bold text-foreground">{plan.name}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatCents(plan.priceCents)} a cada {plan.intervalDays} dias
                  </p>
                </div>
                {plan.benefits.length > 0 && (
                  <ul className="space-y-1">
                    {plan.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="size-4 shrink-0 text-primary-text" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    subscribeMut.mutate(plan.id);
                  }}
                >
                  {subscribeMut.isPending && subscribeMut.variables === plan.id
                    ? 'Gerando PIX…'
                    : `Assinar ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))
      )}

      <Dialog
        open={confirmCancel && Boolean(current)}
        onClose={() => setConfirmCancel(false)}
        title={current?.plan?.name ? `Cancelar o plano ${current.plan.name}?` : 'Cancelar o plano?'}
        description="Os benefícios param na hora. Para voltar, é só assinar de novo."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmCancel(false)}>
            Manter plano
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={cancelMut.isPending}
            onClick={() => current && cancelMut.mutate(current.id)}
          >
            {cancelMut.isPending ? 'Cancelando…' : 'Cancelar assinatura'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
