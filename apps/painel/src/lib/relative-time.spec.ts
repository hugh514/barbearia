import { describe, it, expect } from 'vitest';
import { duration, timeAgo, waited } from './relative-time';

// Datas locais, para "ontem" seguir o dia do relógio da barbearia.
const now = new Date(2026, 10, 19, 15, 0, 0);
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m, 0);

describe('waited', () => {
  it.each([
    [new Date(2026, 10, 19, 14, 59, 40), 'agora'],
    [at(19, 14, 48), 'há 12 min'],
    [at(19, 13, 55), 'há 1 h 05 min'],
  ])('%s vira %s', (from, label) => {
    expect(waited(from, now)).toBe(label);
  });
});

describe('duration', () => {
  it.each([
    [new Date(2026, 10, 19, 14, 59, 40), 'menos de 1 min'],
    [at(19, 14, 48), '12 min'],
    [at(19, 13, 55), '1 h 05 min'],
    [at(19, 13, 0), '2 h'],
  ])('%s até agora dura %s', (from, txt) => {
    expect(duration(from, now)).toBe(txt);
  });

  it('aceita string ISO e não fica negativo com relógio adiantado', () => {
    expect(duration(at(19, 15, 2).toISOString(), now)).toBe('menos de 1 min');
  });
});

describe('timeAgo', () => {
  it.each([
    [new Date(2026, 10, 19, 14, 59, 30), 'agora'],
    [at(19, 14, 48), 'há 12 min'],
    [at(19, 9, 30), 'há 5 h'],
    [at(18, 23, 50), 'ontem'],
    [at(16, 10), 'há 3 dias'],
    [at(2, 10), '02/11/2026'],
  ])('%s vira %s', (when, txt) => {
    expect(timeAgo(when, now)).toBe(txt);
  });

  it('menos de uma hora atrás, mesmo de ontem, ainda conta em minutos', () => {
    expect(timeAgo(at(19, 0, 10), at(19, 0, 40))).toBe('há 30 min');
    expect(timeAgo(at(18, 23, 50), at(19, 0, 10))).toBe('há 20 min');
  });

  it('data inválida não quebra', () => {
    expect(timeAgo('xx', now)).toBe('sem data');
  });
});
