import { cn } from '@/lib/utils';

/**
 * Símbolo do Vez: um V de duas lâminas de tesoura que se cruzam num pino.
 * Fundo na cor da barbearia (--brand), lâminas em --brand-fg.
 * Mesmo desenho de app/icon.svg.
 */
export function VezMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <g className="stroke-primary-foreground" strokeWidth={3} strokeLinecap="round" fill="none">
        <path d="M9.5 6 L18 25.5" />
        <path d="M22.5 6 L14 25.5" />
      </g>
      <circle cx="16" cy="21" r="2.5" className="fill-primary-foreground" />
    </svg>
  );
}

/** Logotipo: símbolo + "Vez" em Archivo 700. */
export function VezLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <VezMark />
      <span className="text-xl leading-none font-bold">Vez</span>
    </span>
  );
}
