import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VezMark } from '@/components/layout/vez-logo';

// ponytail: o JWT ainda não traz o nome da barbearia; quando trouxer, ler daqui.
const TENANT_NAME = 'Barbearia';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
        <VezMark className="size-6" />
        <span className="truncate text-base font-semibold text-foreground">
          {TENANT_NAME}
        </span>
      </header>
      <main className="flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
