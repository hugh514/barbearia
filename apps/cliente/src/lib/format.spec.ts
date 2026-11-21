import { describe, expect, it } from 'vitest';
import { formatRelative } from './format';

const now = new Date('2026-11-19T15:00:00-03:00');

describe('formatRelative', () => {
  it('menos de um minuto é agora', () => {
    expect(formatRelative('2026-11-19T14:59:40-03:00', now)).toBe('agora');
  });
  it('minutos', () => {
    expect(formatRelative('2026-11-19T14:48:00-03:00', now)).toBe('há 12 min');
  });
  it('horas no mesmo dia', () => {
    expect(formatRelative('2026-11-19T12:00:00-03:00', now)).toBe('há 3 h');
  });
  it('ontem', () => {
    expect(formatRelative('2026-11-18T09:00:00-03:00', now)).toBe('ontem');
  });
  it('dias da última semana', () => {
    expect(formatRelative('2026-11-15T09:00:00-03:00', now)).toBe('há 4 dias');
  });
  it('longe vira data absoluta', () => {
    expect(formatRelative('2026-10-02T09:00:00-03:00', now)).toBe('02/10/2026');
  });
  it('data inválida', () => {
    expect(formatRelative('lixo', now)).toBe('sem data');
  });
});
