'use client';

import { useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { usePlans, usePlanActions } from '@/features/plans/use-plans';
import { PlanDialog } from '@/features/plans/plan-dialog';
import type { Plan } from '@/features/plans/schemas';
import { formatCents } from '@/lib/format';

export default function PlanosPage() {
  const { data, isLoading, isError, refetch } = usePlans();
  const { setActive, archive } = usePlanActions();
  const { toast } = useToast();
  // Arquivar e reativar são só do ADMIN na API; o gerente só vê os planos.
  const canArchive = useSession().user?.role === 'ADMIN';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [toggling, setToggling] = useState<Plan | null>(null);

  const plans = data?.data ?? [];
  const activePlans = plans.filter((p) => p.active);
  const inactivePlans = plans.filter((p) => !p.active);

  function confirmToggle() {
    if (!toggling) return;
    const done = {
      onSuccess: () => {
        toast(toggling.active ? 'Plano arquivado.' : 'Plano reativado.');
        setToggling(null);
      },
      onError: (e: unknown) => {
        toast(e instanceof Error ? e.message : 'Não foi possível alterar o plano.', 'error');
        setToggling(null);
      },
    };
    if (toggling.active) archive.mutate(toggling.id, done);
    else setActive.mutate({ id: toggling.id, active: true }, done);
  }

  const renderPlan = (plan: Plan) => (
    <Card key={plan.id}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatCents(plan.priceCents)}
          <span className="text-sm font-normal text-muted-foreground">
            {' '}a cada {plan.intervalDays} dias
          </span>
        </p>
        {plan.benefits.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {plan.benefits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditing(plan);
              setDialogOpen(true);
            }}
          >
            <Pencil className="size-4" />
            Editar plano
          </Button>
          {canArchive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setToggling(plan)}
              aria-label={`${plan.active ? 'Arquivar' : 'Reativar'} plano ${plan.name}`}
            >
              {plan.active ? <Archive className="size-4" /> : <RotateCcw className="size-4" />}
              {plan.active ? 'Arquivar' : 'Reativar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Planos de assinatura que o cliente contrata pelo app."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo plano
          </Button>
        }
      />

      {isError && (
        <div className="mb-4">
          <ErrorState
            message="Não foi possível carregar os planos."
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            }
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlans.map(renderPlan)}
            {activePlans.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum plano ativo. Use Novo plano para criar o primeiro.
              </p>
            )}
          </div>

          {inactivePlans.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Arquivados
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactivePlans.map(renderPlan)}
              </div>
            </div>
          )}
        </div>
      )}

      {dialogOpen && (
      <PlanDialog
        key={editing?.id ?? 'novo'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        plan={editing}
      />
      )}

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        onConfirm={confirmToggle}
        title={toggling?.active ? 'Arquivar plano?' : 'Reativar plano?'}
        description={
          toggling?.active
            ? `${toggling?.name} sai da vitrine e ninguém mais consegue assinar. Quem já assina continua com o plano até cancelar.`
            : `${toggling?.name} volta a aparecer para novos clientes.`
        }
        confirmLabel={toggling?.active ? 'Arquivar plano' : 'Reativar plano'}
        tone={toggling?.active ? 'destructive' : 'default'}
        loading={setActive.isPending || archive.isPending}
      />
    </div>
  );
}
