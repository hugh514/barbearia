'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/features/profile/services';
import { mySubscriptions } from '@/features/plans/services';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/features/auth/logout-button';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export default function PerfilPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: ({ signal }) => getMe(signal), staleTime: 60_000 });
  // A API não tem leitura do cadastro de cliente para o próprio cliente; o
  // telefone vem junto da assinatura, quando há uma.
  const subs = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: ({ signal }) => mySubscriptions(signal),
    staleTime: 15_000,
  });
  const phone = subs.data?.data.find((s) => s.customer?.phone)?.customer?.phone;

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Perfil</h1>

      {me.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card>
          <CardContent className="p-5">
            <dl className="space-y-4">
              {me.data?.name && <Field label="Nome" value={me.data.name} />}
              {phone && <Field label="Telefone" value={phone} />}
              {me.data?.email && <Field label="E-mail" value={me.data.email} />}
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              Para mudar nome ou telefone, fale com a barbearia.
            </p>
          </CardContent>
        </Card>
      )}

      <LogoutButton />
    </div>
  );
}
