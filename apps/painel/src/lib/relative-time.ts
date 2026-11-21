const DAY_MS = 24 * 60 * 60 * 1000;
const DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

function minutesBetween(from: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
}

/** Tempo decorrido em texto curto: "12 min", "1 h 05 min", "2 h". */
export function duration(from: string | Date, now: Date = new Date()): string {
  const min = minutesBetween(toDate(from), now);
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

/** Espera para linha estreita: "agora" no primeiro minuto, depois "há 12 min". */
export function waited(from: string | Date, now: Date = new Date()): string {
  return minutesBetween(toDate(from), now) < 1 ? 'agora' : `há ${duration(from, now)}`;
}

/**
 * Data relativa quando perto ("há 12 min", "ontem", "há 3 dias") e absoluta
 * quando longe (dd/mm/aaaa). "Ontem" segue o dia do relógio local.
 */
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return 'sem data';
  const min = minutesBetween(date, now);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) return `há ${Math.floor(min / 60)} h`;
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return DATE.format(date);
}
