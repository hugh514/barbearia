import { describe, it, expect } from 'vitest';
import { duration, waited } from './relative-time';

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
