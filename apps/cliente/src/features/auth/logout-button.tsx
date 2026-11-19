'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoutRequest } from '@/features/auth/services';

export function LogoutButton() {
  const router = useRouter();
  async function handle() {
    await logoutRequest().catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }
  return (
    <Button variant="outline" className="w-full" onClick={handle}>
      <LogOut className="size-4" />
      Sair
    </Button>
  );
}
