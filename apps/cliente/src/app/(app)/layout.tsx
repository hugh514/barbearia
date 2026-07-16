import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { BottomNav } from '@/components/layout/bottom-nav';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-6">
      {children}
      <BottomNav />
    </div>
  );
}
