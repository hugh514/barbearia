import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { fieldClass } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { KeyFigures } from '@/features/dashboard/key-figures';
import { PERIOD_SENTENCE } from '@/features/dashboard/period';
import { PeriodPicker } from '@/features/dashboard/period-picker';
import { parsePaymentFilters, paymentsQuery } from '@/features/finance/filters';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  paymentListSchema,
  paymentMethodSchema,
  paymentStatusSchema,
  paymentTotalsSchema,
  revenueMetricsSchema,
} from '@/features/finance/schemas';
import { serverApiGet } from '@/lib/http/server-api';
import { formatBRL, formatCents, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parsePaymentFilters(await searchParams);
  const apiQuery = paymentsQuery(filters);
  const urlParams = { status: filters.status, method: filters.method };
  const selfHref = (page = filters.page) => {
    const q = new URLSearchParams({ period: filters.period });
    if (filters.status) q.set('status', filters.status);
    if (filters.method) q.set('method', filters.method);
    if (page > 1) q.set('page', String(page));
    return `/financeiro?${q.toString()}`;
  };

  const [listR, totalsR, revenueR] = await Promise.allSettled([
    serverApiGet(`/payments?${apiQuery}&perPage=20`, paymentListSchema),
    // Totais do período inteiro: os filtros de status e método só valem na lista.
    serverApiGet(
      `/payments/totals?${paymentsQuery({ ...filters, status: undefined, method: undefined, page: 1 })}`,
      paymentTotalsSchema,
    ),
    serverApiGet(`/dashboard/revenue?period=${filters.period}`, revenueMetricsSchema),
  ]);
  const list = listR.status === 'fulfilled' ? listR.value : null;
  const totals = totalsR.status === 'fulfilled' ? totalsR.value : null;
  const revenue = revenueR.status === 'fulfilled' ? revenueR.value : null;
  const sumOf = (s: string) =>
    totals?.byStatus.find((r) => r.status === s)?.amountCents ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description={`Cobranças de planos criadas ${PERIOD_SENTENCE[filters.period]}.`}
        actions={<PeriodPicker current={filters.period} basePath="/financeiro" params={urlParams} />}
      />

      {(!list || !totals) && (
        <ErrorState
          message="Não foi possível carregar os pagamentos."
          action={
            <Link href={selfHref()} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Tentar de novo
            </Link>
          }
        />
      )}

      {totals && (
        <KeyFigures
          main={{ label: 'Recebido em planos', value: formatCents(sumOf('APROVADO')) }}
          rest={[
            { label: 'A receber', value: formatCents(sumOf('PENDENTE')) },
            { label: 'Cobranças', value: String(totals.count) },
            ...(revenue
              ? [{ label: 'Receita dos atendimentos', value: formatBRL(revenue.appointmentRevenue) }]
              : []),
          ]}
        />
      )}

      <form method="get" action="/financeiro" className="flex flex-wrap items-end gap-3" aria-label="Filtrar pagamentos">
        <input type="hidden" name="period" value={filters.period} />
        <div className="space-y-1.5">
          <Label htmlFor="f-status">Status</Label>
          <select id="f-status" name="status" defaultValue={filters.status ?? ''} className={`${fieldClass} w-44`}>
            <option value="">Todos</option>
            {paymentStatusSchema.options.map((s) => (
              <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-method">Método</Label>
          <select id="f-method" name="method" defaultValue={filters.method ?? ''} className={`${fieldClass} w-36`}>
            <option value="">Todos</option>
            {paymentMethodSchema.options.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">Filtrar pagamentos</Button>
        {(filters.status || filters.method) && (
          <Link href={`/financeiro?period=${filters.period}`} className={buttonVariants({ variant: 'ghost' })}>
            Limpar filtros
          </Link>
        )}
      </form>

      {list && (
        list.data.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            Nenhum pagamento com estes filtros. Cobranças por PIX criadas em Assinaturas aparecem aqui.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Pagamentos</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Data</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Plano</th>
                  <th scope="col" className="px-4 py-3 font-medium">Método</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3 text-foreground">{p.customer?.name ?? 'Cliente removido'}</td>
                    <td className="px-4 py-3">{p.plan?.name ?? 'Sem plano'}</td>
                    <td className="px-4 py-3">{PAYMENT_METHOD_LABEL[p.method]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={PAYMENT_STATUS_TONE[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCents(p.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {list && list.meta.lastPage > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">Página {list.meta.page} de {list.meta.lastPage}</span>
          <span className="flex gap-2">
            {list.meta.page > 1 && (
              <Link href={selfHref(list.meta.page - 1)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Página anterior</Link>
            )}
            {list.meta.page < list.meta.lastPage && (
              <Link href={selfHref(list.meta.page + 1)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Próxima página</Link>
            )}
          </span>
        </nav>
      )}

      {revenue && revenue.revenueByBarber.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Receita dos atendimentos por barbeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {revenue.revenueByBarber.map((b) => (
                <li key={b.barberId ?? b.barberName} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-foreground">
                    {b.barberName}
                    <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                      {b.appointmentCount} {b.appointmentCount === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums text-foreground">{formatBRL(b.revenue)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
