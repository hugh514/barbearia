'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { listPlans, mySubscriptions, subscribe } from '@/features/plans/services';
import { getMe } from '@/features/profile/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents } from '@/lib/format';

export default function PlanosPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: ({ signal }) => listPlans(signal),
    staleTime: 60_000,
  });
  const { data: subs } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: ({ signal }) => mySubscriptions(signal),
  });

  const activePlanId = subs?.data.find((s) =>
    s.status.toUpperCase().startsWith('ATIV'),
  )?.plan?.id;

  const sub = useMutation({
    mutationFn: async (planId: string) => {
      const me = await getMe();
      if (!me.customerId) throw new Error('Perfil sem cliente vinculado.');
      await subscribe(me.customerId, planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : 'Não foi possível assinar. Tente de novo.'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Planos</h1>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        (plans?.data ?? [])
          .filter((p) => p.active)
          .map((plan) => {
            const current = plan.id === activePlanId;
            return (
              <Card key={plan.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {plan.name}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatCents(plan.priceCents)} a cada {plan.intervalDays} dias
                      </p>
                    </div>
                  </div>
                  {plan.benefits.length > 0 && (
                    <ul className="space-y-1">
                      {plan.benefits.map((b, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="size-4 shrink-0 text-primary-text" aria-hidden />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant={current ? 'secondary' : 'primary'}
                    className="w-full"
                    disabled={current || sub.isPending}
                    onClick={() => {
                      setError(null);
                      sub.mutate(plan.id);
                    }}
                  >
                    {current ? 'Seu plano atual' : `Assinar plano ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })
      )}
    </div>
  );
}
