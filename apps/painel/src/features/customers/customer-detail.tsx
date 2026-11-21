'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type BadgeTone } from '@/components/ui/status-badge';
import { useSession } from '@/features/auth/session-context';
import { ApiRequestError } from '@/lib/http/client';
import { formatBRL, formatCents, formatDateTime } from '@/lib/format';
import { maskPhone } from '@/lib/masks';
import { timeAgo } from '@/lib/relative-time';
import type { Paginated } from '@/lib/zod/base';
import {
  getCustomer,
  listCustomerConversations,
  listCustomerHistory,
  listCustomerPayments,
  listCustomerSubscriptions,
} from './services';
import { ORIGIN_LABEL, type Customer } from './schemas';
import { PlanBadge } from './plan-badge';
import { CustomerEditForm } from './customer-edit-form';
import { currentSubscription } from './detail-logic';

const DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const date = (v?: string | null) => (v ? DATE.format(new Date(v)) : 'sem data');

const SUB_LABEL = { PENDENTE: 'Pendente', ATIVO: 'Ativo', SUSPENSO: 'Suspenso', CANCELADO: 'Cancelado' } as const;
const SUB_TONE: Record<keyof typeof SUB_LABEL, BadgeTone> = {
  PENDENTE: 'warning',
  ATIVO: 'success',
  SUSPENSO: 'danger',
  CANCELADO: 'neutral',
};
const PAY_LABEL = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  REEMBOLSADO: 'Reembolsado',
} as const;
const PAY_TONE: Record<keyof typeof PAY_LABEL, BadgeTone> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  RECUSADO: 'danger',
  EXPIRADO: 'neutral',
  REEMBOLSADO: 'neutral',
};
const METHOD_LABEL = { PIX: 'PIX', CARD: 'Cartão', BOLETO: 'Boleto' } as const;
const CONV_LABEL = { ABERTA: 'Aberta', AGUARDANDO: 'Aguardando', EM_ATENDIMENTO: 'Em atendimento', FECHADA: 'Fechada' } as const;
const CHANNEL_LABEL = { WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram' } as const;

function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  const id = `sec-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={id} className="font-semibold text-foreground">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ListBody<T>({
  query,
  empty,
  page,
  onPage,
  children,
}: {
  query: UseQueryResult<Paginated<T>>;
  empty: string;
  page: number;
  onPage: (p: number) => void;
  children: (rows: T[]) => ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm text-destructive">
        <span className="flex-1">Não foi possível carregar. Confira a conexão.</span>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  const data = query.data;
  if (!data || data.data.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <>
      <div className="overflow-x-auto">{children(data.data)}</div>
      {data.meta.lastPage > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            Página {data.meta.page} de {data.meta.lastPage}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.meta.lastPage}
              onClick={() => onPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

const th = 'px-4 py-2 text-left font-semibold whitespace-nowrap';
const td = 'px-4 py-2.5 align-top';

function History({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['customer', id, 'history', page],
    queryFn: ({ signal }) => listCustomerHistory(id, page, signal),
  });
  return (
    <Panel title="Atendimentos">
      <ListBody query={query} empty="Nenhum atendimento ainda." page={page} onPage={setPage}>
        {(rows) => (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className={th}>Data</th>
                <th className={th}>Serviços</th>
                <th className={th}>Barbeiro</th>
                <th className={`${th} text-right`}>Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={`${td} tabular-nums whitespace-nowrap`}>
                    {date(a.finishedAt ?? a.createdAt)}
                  </td>
                  <td className={td}>
                    {a.status === 'CANCELADO' ? (
                      <span className="text-muted-foreground">Cancelado</span>
                    ) : a.services.length ? (
                      a.services.join(', ')
                    ) : (
                      <span className="text-muted-foreground">
                        {a.status === 'FINALIZADO' ? 'Sem serviço registrado' : 'Na fila'}
                      </span>
                    )}
                  </td>
                  <td className={`${td} max-w-40 truncate`} title={a.barber?.name ?? undefined}>
                    {a.barber?.name ?? <span className="text-muted-foreground">sem barbeiro</span>}
                  </td>
                  <td className={`${td} text-right tabular-nums whitespace-nowrap`}>
                    {Number(a.totalPrice) > 0 ? formatBRL(Number(a.totalPrice)) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ListBody>
    </Panel>
  );
}

function Payments({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['customer', id, 'payments', page],
    queryFn: ({ signal }) => listCustomerPayments(id, page, signal),
  });
  return (
    <Panel title="Pagamentos">
      <ListBody query={query} empty="Nenhum pagamento registrado." page={page} onPage={setPage}>
        {(rows) => (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className={th}>Data</th>
                <th className={th}>Plano</th>
                <th className={th}>Forma</th>
                <th className={th}>Situação</th>
                <th className={`${th} text-right`}>Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className={`${td} tabular-nums whitespace-nowrap`}>{date(p.paidAt ?? p.createdAt)}</td>
                  <td className={td}>{p.plan?.name ?? 'Plano'}</td>
                  <td className={td}>{METHOD_LABEL[p.method]}</td>
                  <td className={td}>
                    <StatusBadge tone={PAY_TONE[p.status]}>{PAY_LABEL[p.status]}</StatusBadge>
                  </td>
                  <td className={`${td} text-right tabular-nums whitespace-nowrap`}>
                    {formatCents(p.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ListBody>
    </Panel>
  );
}

function Conversations({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['customer', id, 'conversations', page],
    queryFn: ({ signal }) => listCustomerConversations(id, page, signal),
  });
  return (
    <Panel title="Conversas">
      <ListBody query={query} empty="Nenhuma conversa por WhatsApp ou Instagram." page={page} onPage={setPage}>
        {(rows) => (
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium text-foreground">{CHANNEL_LABEL[c.channel]}</span>
                  <StatusBadge>{CONV_LABEL[c.status]}</StatusBadge>
                  <time className="ml-auto tabular-nums text-muted-foreground" dateTime={c.updatedAt}>
                    {timeAgo(c.updatedAt)}
                  </time>
                </p>
                {c.lastMessage && (
                  <p className="mt-1 line-clamp-2 break-words text-muted-foreground">{c.lastMessage.content}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </ListBody>
    </Panel>
  );
}

function CurrentPlan({ customer, canSeeBilling }: { customer: Customer; canSeeBilling: boolean }) {
  const subs = useQuery({
    queryKey: ['customer', customer.id, 'subscriptions'],
    queryFn: ({ signal }) => listCustomerSubscriptions(customer.id, signal),
    enabled: canSeeBilling,
  });

  if (!canSeeBilling) {
    return (
      <Panel title="Plano">
        <div className="p-4">
          <PlanBadge status={customer.planStatus} />
        </div>
      </Panel>
    );
  }

  const sub = subs.data ? currentSubscription(subs.data.data) : null;
  return (
    <Panel title="Plano">
      {subs.isLoading ? (
        <div className="p-4" aria-busy="true">
          <Skeleton className="h-10 w-full" />
        </div>
      ) : subs.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm text-destructive">
          <span className="flex-1">Não foi possível carregar o plano.</span>
          <Button variant="secondary" size="sm" onClick={() => subs.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : sub ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm">
          <dt className="text-muted-foreground">Plano</dt>
          <dd className="font-semibold text-foreground">{sub.plan?.name ?? 'Plano'}</dd>
          <dt className="text-muted-foreground">Situação</dt>
          <dd>
            <StatusBadge tone={SUB_TONE[sub.status]}>{SUB_LABEL[sub.status]}</StatusBadge>
          </dd>
          {sub.plan && (
            <>
              <dt className="text-muted-foreground">Valor</dt>
              <dd className="tabular-nums">{formatCents(sub.plan.priceCents)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Renova em</dt>
          <dd className="tabular-nums">{sub.nextBillingAt ? date(sub.nextBillingAt) : 'sem data'}</dd>
        </dl>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">Sem plano. O cliente assina pelo app ou no balcão.</p>
      )}
    </Panel>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const { hasRole } = useSession();
  const canSeeBilling = hasRole('ADMIN', 'GERENTE');
  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: ({ signal }) => getCustomer(id, signal),
    retry: (n, e) => !(e instanceof ApiRequestError && e.status < 500) && n < 1,
  });

  const back = (
    <Link
      href="/clientes"
      className="mb-4 inline-flex h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Voltar para Clientes
    </Link>
  );

  if (query.isLoading) {
    return (
      <div aria-busy="true">
        {back}
        <Skeleton className="mb-6 h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiRequestError && [400, 404].includes(query.error.status);
    return (
      <div>
        {back}
        <div role="alert" className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-bold text-foreground">
            {notFound ? 'Cliente não encontrado' : 'Não foi possível abrir o cliente'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notFound
              ? 'O link pode estar errado ou o cliente é de outra barbearia.'
              : 'Confira a conexão e tente de novo.'}
          </p>
          {!notFound && (
            <Button variant="secondary" className="mt-4" onClick={() => query.refetch()}>
              Tentar de novo
            </Button>
          )}
        </div>
      </div>
    );
  }

  const c = query.data;
  return (
    <div>
      {back}
      <div className="mb-6">
        <h1 className="text-2xl font-bold break-words text-foreground">{c.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="tabular-nums">{maskPhone(c.phone)}</span>. Veio por {ORIGIN_LABEL[c.origin]}, cliente
          desde {date(c.createdAt)}.{' '}
          {c.lastVisit && (
            <>
              Última visita <time dateTime={c.lastVisit} title={formatDateTime(c.lastVisit)}>{timeAgo(c.lastVisit)}</time>.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Panel title="Dados">
            <div className="p-4">
              <CustomerEditForm key={c.updatedAt} customer={c} />
            </div>
          </Panel>
          <CurrentPlan customer={c} canSeeBilling={canSeeBilling} />
        </div>

        <div className="min-w-0 space-y-6">
          {canSeeBilling ? (
            <>
              <History id={c.id} />
              <Payments id={c.id} />
              <Conversations id={c.id} />
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Atendimentos, pagamentos e conversas do cliente ficam com o gerente e o administrador.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
