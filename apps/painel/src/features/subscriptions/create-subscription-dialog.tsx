'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, fieldClass } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { usePlans } from '@/features/plans/use-plans';
import type { Payment } from '@/features/finance/schemas';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCents } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  chargeByPix,
  createSubscription,
  getPayment,
  searchCustomers,
  SUBSCRIPTIONS_KEY,
  type CustomerOption,
} from './services';

type Charge = 'counter' | 'pix';

export function CreateSubscriptionDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 300);
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [planId, setPlanId] = useState('');
  const [charge, setCharge] = useState<Charge>('counter');
  const [error, setError] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  const plans = usePlans();
  const activePlans = (plans.data?.data ?? []).filter((p) => p.active);
  const customers = useQuery({
    queryKey: ['customer-search', term],
    queryFn: ({ signal }) => searchCustomers(term, signal),
    enabled: term.length >= 2 && !customer,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });

  const pix = useMutation({
    mutationFn: (subId: string) => chargeByPix(subId),
    onSuccess: (p) => setPayment(p),
    onError: (e) =>
      setError(
        `A assinatura ficou pendente, mas o PIX não foi gerado: ${e instanceof Error ? e.message : 'erro inesperado'}`,
      ),
  });

  const create = useMutation({
    mutationFn: () =>
      createSubscription({ customerId: customer!.id, planId, activateNow: charge === 'counter' }),
    onSuccess: (sub) => {
      invalidate();
      if (charge === 'counter') {
        toast('Assinatura criada e ativa.');
        onClose();
        return;
      }
      setSubscriptionId(sub.id);
      pix.mutate(sub.id);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Não foi possível criar a assinatura.'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer) return setError('Escolha o cliente na busca.');
    if (!planId) return setError('Escolha o plano.');
    create.mutate();
  }

  const pending = create.isPending || pix.isPending;

  return (
    <Dialog
      open
      onClose={onClose}
      title={payment ? 'Cobrança por PIX' : 'Nova assinatura'}
      description={payment ? undefined : 'Assine um plano para um cliente que já está cadastrado.'}
    >
      {payment ? (
        <PixPanel payment={payment} onApproved={invalidate} onClose={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="sub-customer">Cliente</Label>
            {customer ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-input px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{customer.name}</span>
                  <span className="ml-2 tabular-nums text-muted-foreground">{customer.phone}</span>
                </span>
                <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setCustomer(null)}>
                  Trocar cliente
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="sub-customer"
                  type="search"
                  autoComplete="off"
                  placeholder="Nome ou telefone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {term.length >= 2 && (
                  <div aria-live="polite" className="max-h-48 overflow-y-auto rounded-md border border-border">
                    {customers.isLoading ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Buscando clientes…</p>
                    ) : customers.isError ? (
                      <p className="px-3 py-2 text-sm text-destructive">Não foi possível buscar. Tente outra vez.</p>
                    ) : (customers.data?.data ?? []).length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente com esse nome ou telefone. Cadastre em Clientes.</p>
                    ) : (
                      <ul>
                        {customers.data!.data.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setCustomer(c)}
                              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <span className="font-medium text-foreground">{c.name}</span>
                              <span className="tabular-nums text-muted-foreground">{c.phone}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-plan">Plano</Label>
            <select
              id="sub-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={fieldClass}
              disabled={plans.isLoading}
            >
              <option value="">{plans.isLoading ? 'Carregando planos…' : 'Escolha o plano'}</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}, {formatCents(p.priceCents)} a cada {p.intervalDays} dias
                </option>
              ))}
            </select>
            {!plans.isLoading && activePlans.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum plano ativo. Crie um em Planos.</p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-foreground">Pagamento</legend>
            {(
              [
                ['counter', 'Recebido no balcão', 'A assinatura fica ativa agora.'],
                ['pix', 'Gerar PIX', 'A assinatura fica pendente até o PIX ser pago.'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm',
                  charge === value ? 'border-ring bg-accent' : 'border-input',
                )}
              >
                <input
                  type="radio"
                  name="charge"
                  value={value}
                  checked={charge === value}
                  onChange={() => setCharge(value)}
                  className="mt-1 accent-primary"
                />
                <span>
                  <span className="block font-medium text-foreground">{label}</span>
                  <span className="text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Voltar
            </Button>
            {subscriptionId && !pix.isPending ? (
              <Button type="button" onClick={() => { setError(null); pix.mutate(subscriptionId); }}>
                Gerar PIX de novo
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? 'Criando…' : charge === 'pix' ? 'Criar e gerar PIX' : 'Criar assinatura'}
              </Button>
            )}
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function PixPanel({
  payment: initial,
  onApproved,
  onClose,
}: {
  payment: Payment;
  onApproved: () => void;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Acompanha o pagamento até sair de PENDENTE (webhook ou aprovação de teste).
  const live = useQuery({
    queryKey: ['payment', initial.id],
    queryFn: ({ signal }) => getPayment(initial.id, signal),
    initialData: initial,
    refetchInterval: (q) => (q.state.data?.status === 'PENDENTE' ? 3000 : false),
  });
  const payment = live.data;
  const approved = payment.status === 'APROVADO';

  // onApproved muda a cada render do pai; a flag garante um aviso só por aprovação.
  const notified = useRef(false);
  useEffect(() => {
    if (!approved || notified.current) return;
    notified.current = true;
    onApproved();
  }, [approved, onApproved]);

  useEffect(() => {
    if (!initial.qrCode) return;
    // A imagem leva o próprio fundo claro: QR precisa de contraste para ler.
    QRCode.toDataURL(initial.qrCode, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQrFailed(true));
  }, [initial.qrCode]);

  async function copy() {
    if (!initial.qrCode) return;
    try {
      await navigator.clipboard.writeText(initial.qrCode);
      setCopied(true);
    } catch {
      // Sem permissão de área de transferência: deixa o código selecionado para copiar à mão.
      const field = document.getElementById('pix-code') as HTMLInputElement | null;
      field?.select();
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mostre o QR ao cliente ou envie o código. Valor:{' '}
        <span className="font-semibold tabular-nums text-foreground">{formatCents(payment.amountCents)}</span>
      </p>
      <div className="flex justify-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL gerada no navegador
          <img src={qr} alt="QR do PIX" width={240} height={240} className="rounded-md border border-border" />
        ) : (
          <div className="flex size-60 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            {!initial.qrCode
              ? 'O provedor não devolveu QR.'
              : qrFailed
                ? 'Não foi possível desenhar o QR. Use o código abaixo.'
                : 'Gerando QR…'}
          </div>
        )}
      </div>
      {initial.qrCode && (
        <div className="space-y-2">
          <Label htmlFor="pix-code">PIX copia e cola</Label>
          <div className="flex gap-2">
            <Input id="pix-code" readOnly value={initial.qrCode} className="font-mono text-xs" />
            <Button type="button" variant="secondary" onClick={copy}>
              {copied ? 'Copiado' : 'Copiar código'}
            </Button>
          </div>
        </div>
      )}
      <p
        role="status"
        aria-live="polite"
        className={cn('text-sm font-medium', approved ? 'text-success' : 'text-muted-foreground')}
      >
        {approved
          ? 'Pagamento aprovado. A assinatura fica ativa em instantes.'
          : payment.status === 'PENDENTE'
            ? 'Aguardando o pagamento.'
            : 'O pagamento não foi aprovado. Use Cobrar por PIX na lista para gerar outro.'}
      </p>
      <div className="flex justify-end">
        <Button onClick={onClose}>{approved ? 'Concluir' : 'Fechar e acompanhar na lista'}</Button>
      </div>
    </div>
  );
}
