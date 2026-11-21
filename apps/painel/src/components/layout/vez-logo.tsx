import { cn } from '@/lib/utils';

/**
 * Símbolo do Vez: um V de duas lâminas de tesoura que se cruzam num pino.
 * Fundo na cor da barbearia (--brand), lâminas em --brand-fg.
 * Mesmo desenho de app/icon.svg.
 */
export function VezMark({
  className,
  inverse = false,
}: {
  className?: string;
  /** Sobre fundo na cor da marca: quadrado em --brand-fg, lâminas na marca. */
  inverse?: boolean;
}) {
  // Classes literais: o Tailwind só gera o que encontra escrito por inteiro.
  const box = inverse ? 'fill-primary-foreground' : 'fill-primary';
  const blade = inverse ? 'stroke-primary' : 'stroke-primary-foreground';
  const pin = inverse ? 'fill-primary' : 'fill-primary-foreground';
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="7" className={box} />
      <g className={blade} strokeWidth={3} strokeLinecap="round" fill="none">
        <path d="M9.5 6 L18 25.5" />
        <path d="M22.5 6 L14 25.5" />
      </g>
      <circle cx="16" cy="21" r="2.5" className={pin} />
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
