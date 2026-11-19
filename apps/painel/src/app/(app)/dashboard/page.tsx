import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyFigures } from '@/features/dashboard/key-figures';
import {
  dashboardSummarySchema,
  PERIOD_PHRASE,
  type Period,
} from '@/features/dashboard/schemas';
import { serverApiGet, ServerApiError } from '@/lib/http/server-api';
import { formatBRL, formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = (['today', 'week', 'month', 'year'] as const).includes(
    sp.period as Period,
  )
    ? (sp.period as Period)
    : 'month';

  let summary = null;
  let error: string | null = null;
  try {
    summary = await serverApiGet(
      `/dashboard/summary?period=${period}`,
      dashboardSummarySchema,
    );
  } catch (e) {
    error =
      e instanceof ServerApiError
        ? e.message
        : 'Não foi possível carregar o dashboard. Recarregue a página.';
  }

  const max = Math.max(1, ...(summary?.appointmentsByBarber.map((b) => b.count) ?? []));

  return (
    <div>
      <PageHeader title="Dashboard" description={`Números ${PERIOD_PHRASE[period]}.`} />

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {summary && (
        <div className="space-y-6">
          <KeyFigures
            main={{ label: 'Atendimentos', value: String(summary.totalAppointments) }}
            rest={[
              { label: 'Receita', value: formatBRL(summary.revenue) },
              { label: 'Novos clientes', value: String(summary.newCustomers) },
              { label: 'Ocupação', value: formatPercent(summary.occupancyRate) },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Atendimentos por barbeiro</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.appointmentsByBarber.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum atendimento no período.
                </p>
              ) : (
                <ul className="space-y-3">
                  {summary.appointmentsByBarber.map((b) => (
                    <li
                      key={b.barberId ?? b.barberName}
                      className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm"
                    >
                      <span className="truncate text-foreground">{b.barberName}</span>
                      <span className="h-2 rounded-sm bg-secondary" aria-hidden>
                        <span
                          className="block h-full rounded-sm bg-primary"
                          style={{ width: `${(b.count / max) * 100}%` }}
                        />
                      </span>
                      <span className="text-right font-medium tabular-nums text-foreground">
                        {b.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
