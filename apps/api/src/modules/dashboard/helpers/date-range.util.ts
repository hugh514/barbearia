import { Period } from './period.enum';

const BUSINESS_HOURS_PER_DAY = 10;

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangeWithPrevious extends DateRange {
  previousFrom: Date;
  previousTo: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function startOfYear(date: Date): Date {
  const d = startOfDay(date);
  d.setMonth(0, 1);
  return d;
}

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  // setMonth direto em 31/03 vira 03/03; prende o dia ao fim do mês de destino.
  const lastDay = new Date(
    d.getFullYear(),
    d.getMonth() - months + 1,
    0,
  ).getDate();
  d.setDate(Math.min(d.getDate(), lastDay));
  d.setMonth(d.getMonth() - months);
  return d;
}

function subtractYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export function getDateRange(period: Period): DateRange {
  const now = new Date();

  switch (period) {
    case Period.TODAY:
      return { from: startOfDay(now), to: now };
    case Period.WEEK:
      return { from: startOfWeek(now), to: now };
    case Period.LAST_7_DAYS:
      return { from: subtractDays(startOfDay(now), 6), to: now };
    case Period.MONTH:
      return { from: startOfMonth(now), to: now };
    case Period.YEAR:
      return { from: startOfYear(now), to: now };
  }
}

export function getDateRangeWithPrevious(
  period: Period,
): DateRangeWithPrevious {
  const current = getDateRange(period);
  const durationMs = current.to.getTime() - current.from.getTime();

  switch (period) {
    case Period.TODAY: {
      const previousTo = new Date(current.from.getTime() - 1);
      return {
        ...current,
        previousFrom: startOfDay(previousTo),
        previousTo,
      };
    }
    case Period.WEEK:
    case Period.LAST_7_DAYS: {
      const previousTo = new Date(current.from.getTime() - 1);
      return {
        ...current,
        previousFrom: subtractDays(current.from, 7),
        previousTo,
      };
    }
    case Period.MONTH: {
      const previousTo = new Date(current.from.getTime() - 1);
      return {
        ...current,
        previousFrom: subtractMonths(current.from, 1),
        previousTo,
      };
    }
    case Period.YEAR: {
      const previousTo = new Date(current.from.getTime() - 1);
      return {
        ...current,
        previousFrom: subtractYears(current.from, 1),
        previousTo,
      };
    }
    default: {
      const previousTo = new Date(current.from.getTime() - 1);
      return {
        ...current,
        previousFrom: new Date(current.from.getTime() - durationMs),
        previousTo,
      };
    }
  }
}

export function getOpenHoursInRange(from: Date, to: Date): number {
  const msPerHour = 60 * 60 * 1000;
  const msPerDay = 24 * msPerHour;
  const diffMs = to.getTime() - from.getTime();

  if (diffMs <= msPerDay) {
    const hoursElapsed = diffMs / msPerHour;
    return Math.min(hoursElapsed, BUSINESS_HOURS_PER_DAY);
  }

  const start = startOfDay(from);
  const end = startOfDay(to);
  let days = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return days * BUSINESS_HOURS_PER_DAY;
}

/**
 * Mesmo trecho no período anterior, para comparar sem favorecer o passado:
 * hoje até agora contra ontem até a mesma hora, mês até hoje contra o mês
 * anterior até o mesmo dia.
 */
export function getComparableRange(
  period: Period,
  range: DateRange,
): DateRange {
  const shift = (d: Date): Date => {
    switch (period) {
      case Period.TODAY:
        return subtractDays(d, 1);
      case Period.WEEK:
      case Period.LAST_7_DAYS:
        return subtractDays(d, 7);
      case Period.MONTH:
        return subtractMonths(d, 1);
      case Period.YEAR:
        return subtractYears(d, 1);
    }
  };
  return { from: shift(range.from), to: shift(range.to) };
}

/** Chave local AAAA-MM-DD, no mesmo fuso de getDateRange. */
export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function daysInRange(range: DateRange): string[] {
  const days: string[] = [];
  const cursor = startOfDay(range.from);
  while (cursor <= range.to) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
