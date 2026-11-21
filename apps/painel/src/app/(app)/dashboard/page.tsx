import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { DailyBars } from '@/features/dashboard/daily-bars';
import { KeyFigures } from '@/features/dashboard/key-figures';
import {
  compareWithPrevious,
  parsePeriod,
  PERIOD_SENTENCE,
} from '@/features/dashboard/period';
import { PeriodPicker } from '@/features/dashboard/period-picker';
import {
  barbersMetricsSchema,
  conversationsMetricsSchema,
  dashboardSummarySchema,
  plansMetricsSchema,
} from '@/features/dashboard/schemas';
import { serverApiGet } from '@/lib/http/server-api';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

const value = <T,>(r: PromiseSettledResult<T>) =>
  r.status === 'fulfilled' ? r.value : null;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const q = `period=${period}`;

  // Só o resumo é obrigatório; os números de apoio somem se falharem.
  const [summaryR, plansR, convR, barbersR] = await Promise.allSettled([
    serverApiGet(`/dashboard/summary?${q}`, dashboardSummarySchema),
    serverApiGet(`/dashboard/plans?${q}`, plansMetricsSchema),
    serverApiGet(`/dashboard/conversations?${q}`, conversationsMetricsSchema),
    serverApiGet(`/dashboard/barbers?${q}`, barbersMetricsSchema),
  ]);
  const summary = value(summaryR);
  const plans = value(plansR);
  const conv = value(convR);
  const barbers = (value(barbersR)?.barbers ?? []).sort(
    (a, b) => b.totalAppointments - a.totalAppointments,
  );

  const comparison = summary
    ? compareWithPrevious(summary.totalAppointments, summary.previousTotalAppointments, period)
    : null;
  const TrendIcon = comparison ? TREND_ICON[comparison.trend] : Minus;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Atendimentos finalizados ${PERIOD_SENTENCE[period]}.`}
        actions={<PeriodPicker current={period} basePath="/dashboard" />}
      />

      {!summary && (
        <ErrorState
          message="Não foi possível carregar o dashboard."
          action={
            <Link href={`/dashboard?${q}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Tentar de novo
            </Link>
          }
        />
      )}

      {summary && comparison && (
        <div className="space-y-6">
          <KeyFigures
            main={{ label: 'Atendimentos', value: String(summary.totalAppointments) }}
            note={
              <span className="inline-flex items-center gap-1" data-testid="comparacao">
                <TrendIcon className="size-4" aria-hidden />
                {comparison.text}
              </span>
            }
            rest={[
              { label: 'Receita dos atendimentos', value: formatBRL(summary.revenue) },
              { label: 'Clientes novos', value: String(summary.newCustomers) },
              ...(plans ? [{ label: 'Assinantes ativos', value: String(plans.activeSubscribers) }] : []),
              ...(conv ? [{ label: 'Conversas esperando resposta', value: String(conv.waitingForHuman) }] : []),
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Atendimentos por dia</CardTitle>
              </CardHeader>
              <CardContent>
                {period !== 'today' ? (
                  <DailyBars days={summary.appointmentsByDay} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Escolha 7 dias ou Mês para ver a série por dia.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Por barbeiro</CardTitle>
              </CardHeader>
              <CardContent>
                {barbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum barbeiro ativo na equipe.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th scope="col" className="pb-2 font-medium">Barbeiro</th>
                        <th scope="col" className="pb-2 text-right font-medium">Atend.</th>
                        <th scope="col" className="pb-2 text-right font-medium">Receita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {barbers.map((b) => (
                        <tr key={b.barberId}>
                          <td className="max-w-0 truncate py-2.5 pr-3 text-foreground">{b.barberName}</td>
                          <td className="py-2.5 text-right tabular-nums">{b.totalAppointments}</td>
                          <td className="py-2.5 pl-3 text-right tabular-nums">{formatBRL(b.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
