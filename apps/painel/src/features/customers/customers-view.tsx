'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { useCustomers } from './use-customers';
import { CustomersTable } from './customers-table';
import { CreateCustomerDialog } from './create-customer-dialog';
import { listHref, readListParams } from './list-params';
import { searchTerm } from './search-term';

const PER_PAGE = 20;

export function CustomersView() {
  const router = useRouter();
  const pathname = usePathname();
  const { page, q } = readListParams(useSearchParams());
  const [search, setSearch] = useState(q);
  const [urlQ, setUrlQ] = useState(q);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounced = useDebouncedValue(search, 350);
  const lastSent = useRef(debounced);

  // A URL mudou por fora (voltar do navegador, link): o campo acompanha.
  if (q !== urlQ) {
    setUrlQ(q);
    setSearch(q);
  }

  // O que a pessoa digita vai para a URL (página 1); replace não enche o histórico.
  useEffect(() => {
    if (debounced === lastSent.current) return;
    lastSent.current = debounced;
    if (pathname !== '/clientes' || debounced.trim() === q.trim()) return;
    router.replace(listHref({ page: 1, q: debounced }), { scroll: false });
  }, [debounced, q, router, pathname]);

  const term = searchTerm(q);
  const { data, isLoading, isError, error, refetch, isFetching } = useCustomers({
    page,
    perPage: PER_PAGE,
    search: term || undefined,
  });
  const meta = data?.meta;
  const rows = data?.data ?? [];
  const from = meta ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = meta ? from + rows.length - 1 : 0;
  const pageLink = (p: number) => listHref({ page: p, q });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Quem já passou pela barbearia e a situação do plano de cada um."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Novo cliente
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, telefone ou Instagram"
          className="h-11 pl-9"
          aria-label="Buscar clientes"
          spellCheck={false}
        />
      </div>

      {isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Não foi possível carregar os clientes.'}
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Tentar de novo
            </Button>
          }
        />
      ) : !isLoading && rows.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {meta && meta.total > 0 ? (
            <p>
              Esta página não existe mais.{' '}
              <Link href={pageLink(1)} className="font-semibold text-primary underline-offset-4 hover:underline">
                Ir para a página 1
              </Link>
            </p>
          ) : q ? (
            <p>
              Nenhum cliente com <span className="font-semibold text-foreground">{q}</span>. Confira a
              busca ou cadastre em Novo cliente.
            </p>
          ) : (
            <p>Nenhum cliente ainda. Use Novo cliente para cadastrar o primeiro.</p>
          )}
        </div>
      ) : (
        <CustomersTable customers={rows} loading={isLoading} />
      )}

      {meta && rows.length > 0 && (
        <nav
          aria-label="Páginas de clientes"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
        >
          <span className="tabular-nums">
            {from} a {to} de {meta.total}, página {meta.page} de {meta.lastPage}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageLink(page - 1)} className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                Página anterior
              </Link>
            ) : (
              <span aria-disabled className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'opacity-50')}>
                Página anterior
              </span>
            )}
            {page < meta.lastPage ? (
              <Link href={pageLink(page + 1)} className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                Próxima página
              </Link>
            ) : (
              <span aria-disabled className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'opacity-50')}>
                Próxima página
              </span>
            )}
          </div>
        </nav>
      )}

      <CreateCustomerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
