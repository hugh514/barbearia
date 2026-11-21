'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { mySubscriptions } from '@/features/plans/services';
import { currentSubscription } from '@/features/plans/schemas';
import { getMe } from '@/features/profile/services';
import { myQueue } from '@/features/queue/services';
import { queueCopy } from '@/features/queue/queue-copy';
import { QrCheckin } from '@/features/checkin/qr-checkin';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionBadge } from '@/features/plans/subscription-badge';
import { formatCents } from '@/lib/format';
import { cn } from '@/lib/utils';

const DAY = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const linkClass =
  'mt-1 inline-flex min-h-11 items-center rounded-sm text-base font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function HomePage() {
  const me = useQuery({ queryKey: ['me'], queryFn: ({ signal }) => getMe(signal), staleTime: 60_000 });
  const queue = useQuery({
    queryKey: ['my-queue'],
    queryFn: ({ signal }) => myQueue(signal),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  const subs = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: ({ signal }) => mySubscriptions(signal),
    staleTime: 15_000,
  });

  const firstName = me.data?.name?.trim().split(/\s+/)[0];
  const ticket = queue.data ? queueCopy(queue.data) : null;
  const sub = currentSubscription(subs.data?.data);

  return (
    <div className="space-y-6">
      <h1 className={cn('text-[28px] leading-tight font-bold text-foreground', !firstName && 'sr-only')}>
        {firstName ? `Olá, ${firstName}` : 'Início'}
      </h1>

      <section aria-label="Sua vez na fila" aria-busy={queue.isLoading}>
        {/* Só a senha é região viva: o leitor de tela lê de novo quando ela muda. */}
        <div aria-live="polite" aria-atomic="true" data-testid="senha">
          {ticket && (
            <div className="rounded-lg border border-border bg-card px-5 py-4">
              {ticket.kind === 'next' ? (
                <p className="text-[min(14vw,4.5rem)] leading-[0.95] font-extrabold font-stretch-condensed text-primary-text">
                  {ticket.title}
                </p>
              ) : (
                <p className="sr-only">{ticket.title}</p>
              )}

              {ticket.kind === 'chair' && (
                <div aria-hidden>
                  <p className="text-xl font-semibold text-foreground">Você está na</p>
                  <p className="mt-1 text-[min(30vw,8rem)] leading-[0.85] font-extrabold font-stretch-extra-condensed text-primary-text">
                    cadeira
                  </p>
                </div>
              )}

              {ticket.kind === 'waiting' ? (
                <div className="flex items-center gap-5">
                  <p
                    aria-hidden
                    className="shrink-0 text-[min(42vw,10rem)] leading-[0.8] font-extrabold font-stretch-extra-condensed tabular-nums text-foreground"
                  >
                    {ticket.position}
                    {/* "o" alto e de largura normal no lugar do º: o º da Archivo vem
                        sublinhado e, condensado, o "o" parece um zero. */}
                    <span className="ml-[0.04em] inline-block align-top text-[0.3em] leading-[1.3] font-bold font-stretch-normal">
                      o
                    </span>
                  </p>
                  <div className="min-w-0">
                    <p aria-hidden className="text-sm font-semibold text-muted-foreground">
                      Sua posição na fila
                    </p>
                    <p className="mt-0.5 text-lg leading-snug font-semibold whitespace-nowrap text-foreground">
                      {ticket.detail}
                    </p>
                    {ticket.wait && <p className="text-base text-muted-foreground">{ticket.wait}</p>}
                  </div>
                </div>
              ) : (
                <p className="mt-4 border-t border-dashed border-input pt-3 text-base text-muted-foreground">
                  {ticket.detail}
                  {ticket.wait && <span className="block">{ticket.wait}</span>}
                </p>
              )}
            </div>
          )}
        </div>
        {queue.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : ticket ? null : (
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-[34px] leading-[1.05] font-extrabold font-stretch-condensed text-foreground">
              Chegou na barbearia?
            </p>
            <p className="mt-2 mb-5 text-base text-muted-foreground">
              Mostre o QR na recepção e você entra na fila.
            </p>
            <QrCheckin />
          </div>
        )}
        {queue.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Não foi possível ver a fila agora. A tela tenta de novo sozinha.
          </p>
        )}
      </section>

      {ticket && <QrCheckin variant="secondary" />}

      {subs.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : sub ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Seu plano</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-lg font-bold text-foreground">{sub.plan?.name ?? 'Assinatura'}</p>
              <SubscriptionBadge status={sub.status} />
            </div>
            {sub.status === 'ATIVO' ? (
              <p className="text-sm tabular-nums text-muted-foreground">
                {sub.plan ? `${formatCents(sub.plan.priceCents)} a cada ${sub.plan.intervalDays ?? 30} dias` : ''}
                {sub.nextBillingAt ? `, renova em ${DAY.format(new Date(sub.nextBillingAt))}` : ''}
              </p>
            ) : (
              <Link href="/planos" className={linkClass}>
                {sub.status === 'SUSPENSO' ? 'Pagar com PIX para reativar' : 'Pagar com PIX'}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Você ainda não tem plano.</p>
            <Link href="/planos" className={linkClass}>
              Ver planos da barbearia
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
