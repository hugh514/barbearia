'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/features/auth/session-context';
import type { SessionUser } from '@/lib/auth/jwt';

export function Providers({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider user={user}>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
