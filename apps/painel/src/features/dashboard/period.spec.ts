import { describe, it, expect } from 'vitest';
import { compareWithPrevious, parsePeriod, periodStart } from './period';

describe('parsePeriod', () => {
  it('aceita hoje, 7 dias e mês', () => {
    expect(parsePeriod('today')).toBe('today');
    expect(parsePeriod('7d')).toBe('7d');
    expect(parsePeriod('month')).toBe('month');
  });

  it('valor ausente ou desconhecido cai em hoje', () => {
    expect(parsePeriod(undefined)).toBe('today');
    expect(parsePeriod('year')).toBe('today');
    expect(parsePeriod(['7d', 'month'])).toBe('today');
  });
});

describe('periodStart', () => {
  const now = new Date(2026, 10, 19, 15, 30);

  it('hoje começa à meia-noite', () => {
    expect(periodStart('today', now)).toEqual(new Date(2026, 10, 19));
  });

  it('7 dias começa seis dias antes, à meia-noite', () => {
    expect(periodStart('7d', now)).toEqual(new Date(2026, 10, 13));
  });

  it('mês começa no dia 1', () => {
    expect(periodStart('month', now)).toEqual(new Date(2026, 10, 1));
  });
});

describe('compareWithPrevious', () => {
  it('mostra alta em porcentagem', () => {
    expect(compareWithPrevious(12, 8, 'today')).toEqual({
      trend: 'up',
      text: '50% a mais que ontem até esta hora',
    });
  });

  it('mostra queda em porcentagem', () => {
    expect(compareWithPrevious(6, 8, '7d')).toEqual({
      trend: 'down',
      text: '25% a menos que nos 7 dias anteriores',
    });
  });

  it('igual ao anterior', () => {
    expect(compareWithPrevious(5, 5, 'month')).toEqual({
      trend: 'flat',
      text: 'Igual ao mês passado até o mesmo dia',
    });
  });

  it('sem base anterior não inventa porcentagem', () => {
    expect(compareWithPrevious(3, 0, 'today')).toEqual({
      trend: 'up',
      text: 'Ontem até esta hora não teve atendimento',
    });
    expect(compareWithPrevious(0, 0, 'today')).toEqual({
      trend: 'flat',
      text: 'Ontem até esta hora também não teve atendimento',
    });
  });
});
