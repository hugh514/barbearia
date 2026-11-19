import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { getTenantTheme } from '@/lib/tenant-theme';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VezMark } from '@/components/layout/vez-logo';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  const tenantName = (await getTenantTheme()).businessName ?? 'Barbearia';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header className="flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
        <VezMark className="size-6" />
        <span className="truncate text-base font-semibold text-foreground">
          {tenantName}
        </span>
      </header>
      <main className="flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
