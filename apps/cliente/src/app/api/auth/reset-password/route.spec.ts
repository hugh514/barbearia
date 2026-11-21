import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
vi.mock('@/lib/http/server-fetch', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

const readRefreshToken = vi.fn<() => Promise<string | undefined>>();
const readAccessToken = vi.fn<() => Promise<string | undefined>>();
const clearSessionCookies = vi.fn(async () => undefined);
vi.mock('@/lib/auth/cookies', () => ({
  readAccessToken: () => readAccessToken(),
  readRefreshToken: () => readRefreshToken(),
  clearSessionCookies: () => clearSessionCookies(),
}));

import { POST } from './route';

const body = { token: 'abc', password: 'Trocada123', confirmPassword: 'Trocada123' };
const call = () => POST(new Request('http://x/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }));
const res = (status: number, json: unknown = {}) => new Response(JSON.stringify(json), { status });

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockReset();
  readAccessToken.mockResolvedValue(undefined);
  readRefreshToken.mockResolvedValue(undefined);
});

describe('POST /api/auth/reset-password', () => {
  it('troca a senha sem sessão aberta', async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }));
    const r = await call();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, signedOut: false });
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it('com sessão aberta, sai da conta depois de trocar', async () => {
    readAccessToken.mockResolvedValue('at');
    readRefreshToken.mockResolvedValue('rt');
    apiFetch.mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(res(200));
    const r = await call();
    expect(await r.json()).toEqual({ ok: true, signedOut: true });
    expect(apiFetch).toHaveBeenLastCalledWith('/auth/logout', expect.objectContaining({ body: { refreshToken: 'rt' } }));
    expect(clearSessionCookies).toHaveBeenCalled();
  });

  it('link vencido vira mensagem curta', async () => {
    apiFetch.mockResolvedValue(res(401, { message: 'Invalid token' }));
    const r = await call();
    expect(r.status).toBe(401);
    expect((await r.json()).message).toBe('Link vencido ou já usado.');
  });

  it('erro 5xx da API não repassa o corpo', async () => {
    apiFetch.mockResolvedValue(res(500, { message: 'PrismaClientKnownRequestError: detalhe do banco' }));
    const r = await call();
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toContain('Prisma');
  });

  it('API fora do ar vira 502 em vez de estourar', async () => {
    apiFetch.mockRejectedValue(new TypeError('fetch failed'));
    const r = await call();
    expect(r.status).toBe(502);
  });
});
