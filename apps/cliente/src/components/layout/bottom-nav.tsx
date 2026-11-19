'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, Clock, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/planos', label: 'Planos', icon: CreditCard },
  { href: '/historico', label: 'Histórico', icon: Clock },
  { href: '/perfil', label: 'Perfil', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-[480px]">
        {ITEMS.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  active ? 'font-semibold text-primary-text' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
