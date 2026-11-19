'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { getConfig } from '@/features/settings/services';
import { getAppearance } from '@/features/settings/appearance-services';
import { ConfigFormView } from '@/features/settings/config-form';
import { AppearanceForm } from '@/features/settings/appearance-form';
import { DEFAULT_BRAND } from '@/lib/theme';

export default function ConfiguracoesPage() {
  const { hasRole } = useSession();
  const isAdmin = hasRole('ADMIN');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['channel-config'],
    queryFn: ({ signal }) => getConfig(signal),
    staleTime: 30_000,
  });

  const appearance = useQuery({
    queryKey: ['appearance'],
    queryFn: ({ signal }) => getAppearance(signal),
    enabled: isAdmin,
    staleTime: 30_000,
    retry: false,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Configurações"
        description="Dados que o assistente usa para responder os clientes."
      />

      {isError && (
        <p className="text-sm text-destructive">
          Não foi possível carregar as configurações. Recarregue a página.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <ConfigFormView config={data ?? null} />
      )}

      {isAdmin &&
        (appearance.isLoading || isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : appearance.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar a aparência. Recarregue a página.
          </p>
        ) : (
          <AppearanceForm
            configExists={Boolean(data)}
            initial={{
              brandColor: appearance.data?.brandColor ?? DEFAULT_BRAND,
              themeMode: appearance.data?.themeMode ?? 'light',
            }}
          />
        ))}
    </div>
  );
}
