'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal: role=dialog, aria-modal, foco preso dentro, Esc fecha e o
 * foco volta para quem abriu. `placement="left"` vira gaveta lateral.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  placement = 'center',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  placement?: 'center' | 'left';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Primeiro campo; sem campo, o primeiro controle que não é o Fechar.
    const target =
      panel?.querySelector<HTMLElement>('input, select, textarea') ??
      panel?.querySelector<HTMLElement>(`${FOCUSABLE}:not([data-dialog-close])`) ??
      panel;
    target?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex bg-overlay',
        placement === 'center' ? 'items-center justify-center p-4' : 'items-stretch',
      )}
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'overflow-y-auto border border-border bg-card text-card-foreground shadow-float outline-none',
          placement === 'center'
            ? 'max-h-[90dvh] w-full max-w-md animate-pop rounded-lg p-6'
            : 'h-dvh w-72 max-w-[85vw] animate-slide-in border-y-0 border-l-0 p-4',
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar"
            data-dialog-close
            className="-mr-2 -mt-2 text-muted-foreground"
          >
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
