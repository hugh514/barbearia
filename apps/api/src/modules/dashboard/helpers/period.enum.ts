export enum Period {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export const PERIOD_VALUES = Object.values(Period) as [Period, ...Period[]];
