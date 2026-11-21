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
