import Link from 'next/link';
import type { Customer } from './schemas';
import { PlanBadge } from './plan-badge';
import { maskPhone } from '@/lib/masks';
import { formatDateTime } from '@/lib/format';
import { timeAgo } from '@/lib/relative-time';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomersTable({
  customers,
  loading,
}: {
  customers: Customer[];
  loading?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">Clientes da barbearia</caption>
        <thead className="border-b border-border text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
            <th scope="col" className="hidden w-44 px-4 py-3 font-semibold sm:table-cell">Telefone</th>
            <th scope="col" className="w-28 px-4 py-3 text-right font-semibold sm:w-36">Última visita</th>
            <th scope="col" className="hidden w-32 px-4 py-3 font-semibold md:table-cell">Plano</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            : customers.map((c) => (
                <tr key={c.id} className="relative hover:bg-secondary">
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="block truncate font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:-outline-offset-2 after:focus-visible:outline-ring"
                      title={c.name}
                    >
                      {c.name}
                    </Link>
                    <span className="block truncate tabular-nums text-muted-foreground sm:hidden">
                      {maskPhone(c.phone)}
                    </span>
                    <span className="mt-1 block md:hidden">
                      <PlanBadge status={c.planStatus} />
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">
                    {maskPhone(c.phone)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {c.lastVisit ? (
                      <time dateTime={c.lastVisit} title={formatDateTime(c.lastVisit)}>
                        {timeAgo(c.lastVisit)}
                      </time>
                    ) : (
                      'Sem visita'
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <PlanBadge status={c.planStatus} />
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
