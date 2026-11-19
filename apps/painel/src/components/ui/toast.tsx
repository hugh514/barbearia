'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = ++counter;
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex animate-pop items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-float',
              t.tone === 'error' && 'border-destructive',
            )}
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" />
            ) : (
              <XCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span>{t.message}</span>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => remove(t.id)}
              className="-my-1 -mr-2 ml-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve estar dentro de <ToastProvider>');
  return ctx;
}
