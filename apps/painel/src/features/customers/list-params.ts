interface ListState {
  page: number;
  q: string;
}

const MAX_PAGE = 100_000;

export function readListParams(sp: Pick<URLSearchParams, 'get'>): ListState {
  const raw = sp.get('page') ?? '';
  const n = /^\d+$/.test(raw) ? Number(raw) : 1;
  return {
    page: n >= 1 && n <= MAX_PAGE ? n : 1,
    q: (sp.get('q') ?? '').slice(0, 100),
  };
}

export function listHref({ page, q }: ListState): string {
  const sp = new URLSearchParams();
  if (q.trim()) sp.set('q', q.trim());
  if (page > 1) sp.set('page', String(page));
  const s = sp.toString();
  return s ? `/clientes?${s}` : '/clientes';
}
