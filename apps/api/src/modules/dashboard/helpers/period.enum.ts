export enum Period {
  TODAY = 'today',
  WEEK = 'week',
  /** Hoje e os seis dias anteriores. */
  LAST_7_DAYS = '7d',
  MONTH = 'month',
  YEAR = 'year',
}

export const PERIOD_VALUES = Object.values(Period) as [Period, ...Period[]];
