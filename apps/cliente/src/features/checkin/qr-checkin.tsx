'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { z } from 'zod';
import { QrCode } from 'lucide-react';
import { apiClient } from '@/lib/http/client';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

const tokenResponseSchema = z.object({
  token: z.string(),
  expiresInSeconds: z.number(),
});

export function QrCheckin() {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient('/checkin/token', {
        method: 'POST',
        schema: tokenResponseSchema,
      });
      const url = await QRCode.toDataURL(res.token, { width: 260, margin: 1 });
      setDataUrl(url);
      setRemaining(res.expiresInSeconds);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o QR. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [open, remaining]);

  return (
    <>
      <Button size="lg" className="w-full" onClick={generate} disabled={loading}>
        <QrCode />
        {loading ? 'Gerando…' : 'Mostrar QR de entrada'}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      <Dialog
        open={open && Boolean(dataUrl)}
        onClose={() => setOpen(false)}
        title="Mostre na recepção"
        description="A equipe lê este código e você entra na fila."
        className="max-w-xs text-center"
      >
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="QR de check-in" className="mx-auto rounded-md" />
        )}
        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {remaining > 0 ? (
            <>
              Expira em{' '}
              <strong className="tabular-nums text-foreground">{remaining}s</strong>
            </>
          ) : (
            'Expirado. Gere um novo código.'
          )}
        </p>
        {remaining === 0 && (
          <Button className="mt-3 w-full" onClick={generate}>
            Gerar novo QR
          </Button>
        )}
      </Dialog>
    </>
  );
}
