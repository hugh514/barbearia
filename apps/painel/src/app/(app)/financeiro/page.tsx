import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyFigures } from '@/features/dashboard/key-figures';
import { PERIODS, PERIOD_PHRASE } from '@/features/dashboard/schemas';
import { revenueMetricsSchema } from '@/features/finance/schemas';
import { serverApiGet, ServerApiError } from '@/lib/http/server-api';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';


export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = PERIODS.includes(sp.period as (typeof PERIODS)[number])
    ? (sp.period as (typeof PERIODS)[number])
    : 'month';

  let metrics = null;
  let error: string | null = null;
  try {
    metrics = await serverApiGet(
      `/dashboard/revenue?period=${period}`,
      revenueMetricsSchema,
    );
  } catch (e) {
    error =
      e instanceof ServerApiError ? e.message : 'Não foi possível carregar o financeiro. Recarregue a página.';
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description={`Quanto entrou ${PERIOD_PHRASE[period]}, por atendimento e por plano.`}
      />

      {error && (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {metrics && (
        <>
          <KeyFigures
            main={{ label: 'Receita total', value: formatBRL(metrics.totalRevenue) }}
            rest={[
              { label: 'Atendimentos', value: formatBRL(metrics.appointmentRevenue) },
              { label: 'Planos', value: formatBRL(metrics.planRevenue) },
            ]}
          />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Receita por barbeiro</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.revenueByBarber.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma receita no período.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {metrics.revenueByBarber.map((b) => (
                    <li
                      key={b.barberId ?? b.barberName}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-sm text-foreground">
                        {b.barberName}
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                          {b.appointmentCount}{' '}
                          {b.appointmentCount === 1 ? 'atendimento' : 'atendimentos'}
                        </span>
                      </span>
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatBRL(b.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
