'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useSession } from '@/features/auth/session-context';
import { logoutRequest } from '@/features/auth/services';
import { ROLE_LABEL } from '@/features/users/schemas';
import { navItemsForRole } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { VezMark } from './vez-logo';

function NavLinks({
  onNavigate,
  touch,
}: {
  onNavigate?: () => void;
  /** Na gaveta do celular os itens têm 44px. */
  touch?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  if (!user) return null;

  return (
    <ul className="space-y-0.5">
      {navItemsForRole(user.role).map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                touch ? 'h-11' : 'h-9',
                active
                  ? 'bg-accent font-semibold text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AccountFooter() {
  const router = useRouter();
  const { user } = useSession();
  if (!user) return null;

  async function handleLogout() {
    await logoutRequest().catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="min-w-0 px-3">
        <p className="truncate text-sm text-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="w-full justify-start text-muted-foreground"
      >
        <LogOut />
        Sair
      </Button>
      <p className="px-3 text-xs text-muted-foreground">Vez</p>
    </div>
  );
}

/** Navegação lateral do desktop. */
export function AppSidebar({ tenantName }: { tenantName: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card p-3 md:flex">
      <p className="flex items-center gap-2 px-2 pb-5 pt-2 text-base font-semibold text-foreground">
        <VezMark />
        <span className="truncate">{tenantName}</span>
      </p>
      <nav aria-label="Principal" className="flex-1 overflow-y-auto">
        <NavLinks />
      </nav>
      <AccountFooter />
    </aside>
  );
}

/** Barra superior do celular: abre a mesma navegação numa gaveta. */
export function MobileTopbar({ tenantName }: { tenantName: string }) {
  const [open, setOpen] = useState(false);

  // Ao passar para o desktop a gaveta fecha (e o Dialog libera o overflow).
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-2 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <span className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
        <VezMark className="size-6" />
        <span className="truncate">{tenantName}</span>
      </span>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={tenantName}
        placement="left"
        className="flex flex-col"
      >
        <nav aria-label="Principal" className="flex-1 overflow-y-auto">
          <NavLinks touch onNavigate={() => setOpen(false)} />
        </nav>
        <AccountFooter />
      </Dialog>
    </header>
  );
}
