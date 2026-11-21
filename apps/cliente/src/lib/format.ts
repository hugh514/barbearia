const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata um valor em reais (número decimal). */
export function formatBRL(value: number): string {
  return BRL.format(Number.isFinite(value) ? value : 0);
}

/** Formata um valor em centavos (inteiro) para reais. */
export function formatCents(cents: number): string {
  return formatBRL((cents ?? 0) / 100);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value ?? 0).toFixed(digits)}%`;
}

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const TIME = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' });

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? 'sem data' : DATE_TIME.format(d);
}

export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? 'sem hora' : TIME.format(d);
}

const DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return 'sem data';
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);
  const days = dayNumber(now) - dayNumber(d);
  if (days === 0) {
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    return `há ${Math.floor(minutes / 60)} h`;
  }
  if (days === 1) return 'ontem';
  if (days > 1 && days < 7) return `há ${days} dias`;
  return DATE.format(d);
}
