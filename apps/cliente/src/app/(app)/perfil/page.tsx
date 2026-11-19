'use client';

import { useQuery } from '@tanstack/react-query';
import { User, Mail } from 'lucide-react';
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
      <h1 className="text-2xl font-bold text-foreground">Perfil</h1>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
                <User className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {data?.name ?? 'Membro'}
                </p>
                <p className="text-xs text-muted-foreground">Cliente</p>
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="size-4" />
                {data?.email}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <LogoutButton />
    </div>
  );
}
