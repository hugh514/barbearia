'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ApiRequestError } from '@/lib/http/client';
import { maskPhone } from '@/lib/masks';
import { createCustomer, listCustomers } from '@/features/customers/services';
import { createCustomerSchema, type Customer } from '@/features/customers/schemas';
import { looksLikePhone, searchTerm } from '@/features/customers/search-term';
import { createAppointment } from './services';

function phoneTaken(e: unknown): unknown {
  return e instanceof ApiRequestError && e.status === 409
    ? new Error('Esse telefone já é de outro cliente. Busque pelo telefone.')
    : e;
}

export function ArrivalDialog({
  open,
  onClose,
  inQueue,
}: {
  open: boolean;
  onClose: () => void;
  inQueue: Set<string>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<'search' | 'new'>('search');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [error, setError] = useState<string | null>(null);
  // Cliente já cadastrado numa tentativa anterior: repetir só o pôr na fila.
  const created = useRef<{ key: string; customer: Customer } | null>(null);

  const term = searchTerm(useDebouncedValue(query, 300));
  const enabled = open && step === 'search' && term.length >= 2;
  const results = useQuery({
    queryKey: ['customers', 'arrival', term],
    queryFn: ({ signal }) => listCustomers({ page: 1, perPage: 6, search: term }, signal),
    enabled,
    staleTime: 10_000,
    retry: 0,
  });

  function close() {
    setQuery('');
    setStep('search');
    setName('');
    setPhone('');
    setFieldErrors({});
    setError(null);
    created.current = null;
    onClose();
  }

  const arrive = useMutation({
    mutationFn: async (target: Customer | { name: string; phone: string }) => {
      let customer: Customer;
      if ('id' in target) {
        customer = target;
      } else {
        const key = `${target.name}|${target.phone}`;
        if (created.current?.key !== key) {
          created.current = { key, customer: await createCustomer(target).catch((e) => Promise.reject(phoneTaken(e))) };
        }
        customer = created.current.customer;
      }
      await createAppointment(customer.id);
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast(`${customer.name} entrou na fila.`);
      close();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Não foi possível pôr na fila. Tente de novo.'),
  });

  function startNew() {
    const typed = query.trim();
    if (looksLikePhone(typed)) {
      setPhone(maskPhone(typed));
      setName('');
    } else {
      setName(typed);
      setPhone('');
    }
    setError(null);
    setStep('new');
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createCustomerSchema.safeParse({ name, phone });
    if (!parsed.success) {
      const errs: { name?: string; phone?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as 'name' | 'phone';
        errs[key] ??= issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setError(null);
    arrive.mutate({ name: parsed.data.name, phone });
  }

  const list = results.data?.data ?? [];

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Cliente chegou"
      description={
        step === 'search'
          ? 'Busque pelo nome ou telefone e ponha na fila.'
          : 'Cadastro rápido: nome e telefone. O cliente entra na fila em seguida.'
      }
    >
      {step === 'search' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Buscar cliente"
              placeholder="Nome ou telefone"
              autoComplete="off"
              spellCheck={false}
              className="h-11 pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
            />
          </div>

          {term.length < 2 ? (
            <p className="text-sm text-muted-foreground">Digite ao menos 2 letras ou números.</p>
          ) : results.isError ? (
            <div role="alert" className="space-y-2 text-sm text-destructive">
              <p>Não foi possível buscar clientes.</p>
              <Button variant="secondary" size="sm" onClick={() => results.refetch()}>
                Tentar de novo
              </Button>
            </div>
          ) : results.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente com esse nome ou telefone.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Clientes encontrados">
              {list.map((c) => {
                const already = inQueue.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={already || arrive.isPending}
                      onClick={() => {
                        setError(null);
                        arrive.mutate(c);
                      }}
                      aria-label={already ? `${c.name}, já está na fila` : `Pôr ${c.name} na fila`}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground" title={c.name}>
                          {c.name}
                        </span>
                        <span className="block text-sm tabular-nums text-muted-foreground">
                          {maskPhone(c.phone)}
                        </span>
                      </span>
                      <span
                        className={
                          already
                            ? 'shrink-0 text-sm text-muted-foreground'
                            : 'shrink-0 text-sm font-semibold text-primary-text'
                        }
                      >
                        {already ? 'Já está na fila' : 'Pôr na fila'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {term.length >= 2 && !results.isLoading && (
            <Button variant="secondary" size="lg" className="w-full" onClick={startNew}>
              <UserPlus />
              Cadastrar cliente novo
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={submitNew} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="arrival-name">Nome</Label>
            <Input
              id="arrival-name"
              className="h-11"
              autoComplete="off"
              value={name}
              invalid={!!fieldErrors.name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrival-phone">Telefone</Label>
            <Input
              id="arrival-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(11) 99999-9999"
              className="h-11"
              value={phone}
              invalid={!!fieldErrors.phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
            {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep('search')}>
              Voltar para a busca
            </Button>
            <Button type="submit" size="lg" disabled={arrive.isPending}>
              {arrive.isPending ? 'Pondo na fila…' : 'Cadastrar e pôr na fila'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
