'use client';

import { useSyncExternalStore } from 'react';
import { Lock } from 'lucide-react';

const noSubscribe = () => () => {};

// O protocolo só é conhecido no navegador; no servidor fica escondido.
export function SecureBadge() {
  const https = useSyncExternalStore(
    noSubscribe,
    () => location.protocol === 'https:',
    () => false,
  );
  if (!https) return null;
  return (
    <p className="mx-auto mt-10 flex w-full max-w-[380px] items-center gap-1.5 text-sm text-muted-foreground">
      <Lock className="size-3.5" aria-hidden />
      Conexão segura
    </p>
  );
}
