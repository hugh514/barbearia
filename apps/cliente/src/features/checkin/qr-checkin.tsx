'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { z } from 'zod';
import { QrCode, X } from 'lucide-react';
import { apiClient } from '@/lib/http/client';
import { Button } from '@/components/ui/button';

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
      setError(e instanceof Error ? e.message : 'Erro ao gerar QR.');
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
      <Button className="w-full" onClick={generate} disabled={loading}>
        <QrCode className="size-4" />
        {loading ? 'Gerando…' : 'Já estou na barbearia'}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {open && dataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-card p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Mostre na recepção
              </span>
              <button aria-label="Fechar" onClick={() => setOpen(false)}>
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="QR de check-in"
              className="mx-auto rounded-lg bg-white p-2"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              {remaining > 0 ? (
                <>
                  Expira em <strong className="text-foreground">{remaining}s</strong>
                </>
              ) : (
                'Expirado — gere um novo.'
              )}
            </p>
            {remaining === 0 && (
              <Button className="mt-3 w-full" onClick={generate}>
                Gerar novo QR
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
