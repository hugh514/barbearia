'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Customer } from './schemas';
import { PlanBadge } from './plan-badge';
import { ORIGIN_LABEL } from './schemas';
import { formatDateTime } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

const ROW_HEIGHT = 64;

export function CustomersTable({
  customers,
  loading,
}: {
  customers: Customer[];
  loading?: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // useVirtualizer é incompatível com o React Compiler por design; o componente só não é memorizado.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Nenhum cliente encontrado. Confira a busca ou use Novo cliente.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[calc(100vh-16rem)] overflow-auto rounded-lg border border-border bg-card"
    >
      <div
        style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const c = customers[vi.index];
          return (
            <div
              key={c.id}
              className="absolute left-0 top-0 flex w-full items-center gap-4 border-b border-border px-4"
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="tabular-nums">{c.phone}</span>
                  <span className="ml-3">{ORIGIN_LABEL[c.origin]}</span>
                </p>
              </div>
              <div className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                {c.lastVisit ? formatDateTime(c.lastVisit) : 'Sem visitas'}
              </div>
              <PlanBadge status={c.planStatus} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
