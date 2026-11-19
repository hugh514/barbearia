'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/features/profile/services';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from '@/features/auth/logout-button';

export default function PerfilPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Perfil</h1>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-semibold text-foreground">{data?.name ?? 'Cliente'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-mail</p>
              <p className="break-all text-foreground">{data?.email}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <LogoutButton />
    </div>
  );
}
