// Os valores são os mesmos do query param period da API.
export const PERIOD_OPTIONS = ['today', '7d', 'month'] as const;
export type PanelPeriod = (typeof PERIOD_OPTIONS)[number];

export const PERIOD_LABEL: Record<PanelPeriod, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  month: 'Mês',
};

export const PERIOD_SENTENCE: Record<PanelPeriod, string> = {
  today: 'de hoje',
  '7d': 'dos últimos 7 dias',
  month: 'deste mês',
};

const PREVIOUS: Record<PanelPeriod, { than: string; equal: string; empty: string }> = {
  today: {
    than: 'ontem até esta hora',
    equal: 'Igual a ontem até esta hora',
    empty: 'Ontem até esta hora',
  },
  '7d': {
    than: 'nos 7 dias anteriores',
    equal: 'Igual aos 7 dias anteriores',
    empty: 'Os 7 dias anteriores',
  },
  month: {
    than: 'o mês passado até o mesmo dia',
    equal: 'Igual ao mês passado até o mesmo dia',
    empty: 'O mês passado até o mesmo dia',
  },
};

export function parsePeriod(value: string | string[] | undefined): PanelPeriod {
  return PERIOD_OPTIONS.includes(value as PanelPeriod)
    ? (value as PanelPeriod)
    : 'today';
}

/** Início local do período, no mesmo critério da API. */
export function periodStart(period: PanelPeriod, now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '7d') d.setDate(d.getDate() - 6);
  if (period === 'month') d.setDate(1);
  return d;
}

export function compareWithPrevious(
  current: number,
  previous: number,
  period: PanelPeriod,
): { trend: 'up' | 'down' | 'flat'; text: string } {
  const ref = PREVIOUS[period];
  if (previous === 0) {
    return current === 0
      ? { trend: 'flat', text: `${ref.empty} também não teve atendimento` }
      : { trend: 'up', text: `${ref.empty} não teve atendimento` };
  }
  if (current === previous) return { trend: 'flat', text: ref.equal };
  const pct = Math.round((Math.abs(current - previous) / previous) * 100);
  return current > previous
    ? { trend: 'up', text: `${pct}% a mais que ${ref.than}` }
    : { trend: 'down', text: `${pct}% a menos que ${ref.than}` };
}
