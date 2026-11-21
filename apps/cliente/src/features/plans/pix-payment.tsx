'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents } from '@/lib/format';
import { getPayment, mockApprovePayment } from './services';
import { isMockPayment } from './schemas';

const STATUS_TEXT: Record<string, string> = {
  PENDENTE: 'Aguardando pagamento. Esta tela muda sozinha quando o PIX cair.',
  APROVADO: 'Pagamento recebido. Ativando seu plano.',
  RECUSADO: 'O pagamento foi recusado. Gere um PIX novo.',
  EXPIRADO: 'Este PIX venceu. Gere um PIX novo.',
};

export function PixPayment({
  paymentId,
  onRetry,
}: {
  paymentId: string;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState<'sim' | 'erro' | null>(null);
  const payment = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: ({ signal }) => getPayment(paymentId, signal),
    // Para de consultar quando a consulta falha: a tela oferece gerar outro PIX.
    refetchInterval: (q) =>
      q.state.status !== 'error' && (!q.state.data || q.state.data.status === 'PENDENTE') ? 3000 : false,
  });
  const code = payment.data?.qrCode ?? null;
  const qr = useQuery({
    queryKey: ['pix-qr', code],
    queryFn: () => QRCode.toDataURL(code!, { width: 240, margin: 1 }),
    enabled: Boolean(code),
    staleTime: Infinity,
  });
  const simulate = useMutation({
    mutationFn: () => mockApprovePayment(paymentId),
    onSuccess: () => payment.refetch(),
  });

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied('sim');
    } catch {
      setCopied('erro');
    }
  }

  if (payment.isLoading) return <Skeleton className="h-72 w-full" />;
  if (payment.isError || !payment.data) {
    // Cobrança guardada no aparelho que a API não devolve mais: deixa gerar outra.
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar este PIX.
        </p>
        <Button className="w-full" onClick={onRetry}>
          Gerar PIX novo
        </Button>
      </div>
    );
  }

  const pix = payment.data;
  const failed = pix.status === 'RECUSADO' || pix.status === 'EXPIRADO';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pague <strong className="tabular-nums text-foreground">{formatCents(pix.amountCents)}</strong> pelo
        app do seu banco: leia o QR ou cole o código.
      </p>

      {!failed && (
        <>
          <div className="mx-auto flex size-60 items-center justify-center rounded-md border border-border bg-qr p-2">
            {qr.data ? (
              // eslint-disable-next-line @next/next/no-img-element -- QR é data URL gerada no navegador; next/image não otimiza data URL
              <img src={qr.data} alt="QR do PIX" className="size-full" />
            ) : (
              <Skeleton className="size-full" />
            )}
          </div>

          {code && (
            <div className="space-y-2">
              <label htmlFor="pix-code" className="text-[13px] font-semibold text-foreground">
                PIX copia e cola
              </label>
              <textarea
                id="pix-code"
                readOnly
                value={code}
                rows={3}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full resize-none rounded-md border border-input bg-secondary px-3 py-2 text-sm break-all text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <Button variant="secondary" className="w-full" onClick={copy}>
                <Copy />
                {copied === 'sim' ? 'Código copiado' : 'Copiar código'}
              </Button>
              {copied === 'erro' && (
                <p role="alert" className="text-sm text-destructive">
                  Não deu para copiar. Toque no código, selecione e copie.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <p aria-live="polite" role="status" className="text-base font-semibold text-foreground">
        {STATUS_TEXT[pix.status] ?? 'Conferindo o pagamento.'}
      </p>

      {failed && (
        <Button className="w-full" onClick={onRetry}>
          Gerar PIX novo
        </Button>
      )}

      {pix.status === 'PENDENTE' && isMockPayment(pix) && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          disabled={simulate.isPending}
          onClick={() => simulate.mutate()}
        >
          Simular pagamento (dev)
        </Button>
      )}
      {simulate.isError && (
        <p role="alert" className="text-sm text-destructive">
          A simulação falhou. Tente de novo.
        </p>
      )}
    </div>
  );
}
