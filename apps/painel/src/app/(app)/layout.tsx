import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { AppSidebar, MobileTopbar } from '@/components/layout/app-sidebar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-dvh bg-background md:flex">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 overflow-x-hidden p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
