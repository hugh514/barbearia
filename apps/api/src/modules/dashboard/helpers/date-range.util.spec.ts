import { daysInRange, getComparableRange } from './date-range.util';
import { Period } from './period.enum';

describe('getComparableRange', () => {
  it('mês: em 31/03 compara com fevereiro até o último dia, sem invadir março', () => {
    const prev = getComparableRange(Period.MONTH, {
      from: new Date(2026, 2, 1),
      to: new Date(2026, 2, 31, 15, 0),
    });
    expect(prev.from).toEqual(new Date(2026, 1, 1));
    expect(prev.to).toEqual(new Date(2026, 1, 28, 15, 0));
  });

  it('hoje: ontem até a mesma hora', () => {
    const prev = getComparableRange(Period.TODAY, {
      from: new Date(2026, 10, 19),
      to: new Date(2026, 10, 19, 9, 30),
    });
    expect(prev).toEqual({
      from: new Date(2026, 10, 18),
      to: new Date(2026, 10, 18, 9, 30),
    });
  });

  it('7d: os sete dias anteriores', () => {
    const prev = getComparableRange(Period.LAST_7_DAYS, {
      from: new Date(2026, 10, 13),
      to: new Date(2026, 10, 19, 9, 30),
    });
    expect(prev.from).toEqual(new Date(2026, 10, 6));
    expect(prev.to).toEqual(new Date(2026, 10, 12, 9, 30));
  });
});

describe('daysInRange', () => {
  it('um item por dia, inclusive o de hoje', () => {
    expect(
      daysInRange({
        from: new Date(2026, 10, 17),
        to: new Date(2026, 10, 19, 8),
      }),
    ).toEqual(['2026-11-17', '2026-11-18', '2026-11-19']);
  });
});
