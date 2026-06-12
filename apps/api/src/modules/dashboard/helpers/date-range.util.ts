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
    case Period.WEEK: {
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
