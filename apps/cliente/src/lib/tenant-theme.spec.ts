import { describe, it, expect, vi, beforeEach } from 'vitest';

const jar = new Map<string, string>();
const set = vi.fn<(name: string, value: string, opts?: object) => void>((name, value) => {
  jar.set(name, value);
});
const del = vi.fn<(name: string) => void>((name) => {
  jar.delete(name);
});
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set,
    delete: del,
  }),
}));

const readAccessToken = vi.fn<() => Promise<string | undefined>>();
vi.mock('@/lib/auth/cookies', () => ({ readAccessToken: () => readAccessToken() }));

const apiFetch = vi.fn();
vi.mock('@/lib/http/server-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import {
  THEME_COOKIE,
  forgetAppearance,
  getTenantTheme,
  parseThemeCookie,
  rememberAppearance,
} from './tenant-theme';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) });

beforeEach(() => {
  jar.clear();
  vi.clearAllMocks();
});

describe('getTenantTheme', () => {
  it('usa a aparência da API quando há token', async () => {
    readAccessToken.mockResolvedValue('tok');
    apiFetch.mockResolvedValue(
      ok({ businessName: 'Barbearia Modelo', brandColor: '#6E1F2A', themeMode: 'dark' }),
    );
    const t = await getTenantTheme();
    expect(apiFetch.mock.calls[0][0]).toBe('/channels/config/appearance');
    expect(t.vars['--brand']).toBe('#6e1f2a');
    expect(t.mode).toBe('dark');
    expect(t.businessName).toBe('Barbearia Modelo');
  });

  it('API com 401 cai no cookie bc_theme', async () => {
    readAccessToken.mockResolvedValue('expirado');
    apiFetch.mockResolvedValue(fail(401));
    jar.set(THEME_COOKIE, JSON.stringify({ brandColor: '#0A6A82', themeMode: 'dark', businessName: 'Navalha' }));
    const t = await getTenantTheme();
    expect(t.vars['--brand']).toBe('#0a6a82');
    expect(t.mode).toBe('dark');
    expect(t.businessName).toBe('Navalha');
  });

  it('API fora do ar cai no cookie', async () => {
    readAccessToken.mockResolvedValue('tok');
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    jar.set(THEME_COOKIE, JSON.stringify({ brandColor: '#4B2A5E', themeMode: 'light' }));
    expect((await getTenantTheme()).vars['--brand']).toBe('#4b2a5e');
  });

  it('sem token usa o cookie sem chamar a API', async () => {
    readAccessToken.mockResolvedValue(undefined);
    jar.set(THEME_COOKIE, JSON.stringify({ brandColor: '#1F5A43' }));
    const t = await getTenantTheme();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(t.vars['--brand']).toBe('#1f5a43');
  });

  it('sem token e sem cookie usa o padrão', async () => {
    readAccessToken.mockResolvedValue(undefined);
    const t = await getTenantTheme();
    expect(t.vars['--brand']).toBe('#1f4fb8');
    expect(t.mode).toBe('light');
    expect(t.businessName).toBeNull();
  });

  it('cookie adulterado vira padrão', async () => {
    readAccessToken.mockResolvedValue(undefined);
    jar.set(THEME_COOKIE, '{"brandColor":"red;background:url(x)"');
    expect((await getTenantTheme()).vars['--brand']).toBe('#1f4fb8');
    jar.set(THEME_COOKIE, JSON.stringify({ brandColor: 'red;background:url(x)' }));
    expect((await getTenantTheme()).vars['--brand']).toBe('#1f4fb8');
  });
});

describe('cookie de tema', () => {
  it('rememberAppearance grava httpOnly e SameSite=Lax só com cor, modo e nome', async () => {
    await rememberAppearance({ brandColor: '#6E1F2A', themeMode: 'dark', businessName: 'X' });
    const [name, value, opts] = set.mock.calls[0];
    expect(name).toBe(THEME_COOKIE);
    expect(JSON.parse(value)).toEqual({ brandColor: '#6E1F2A', themeMode: 'dark', businessName: 'X' });
    expect(opts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });

  it('o cookie se chama bc_theme', () => {
    expect(THEME_COOKIE).toBe('bc_theme');
  });

  it('forgetAppearance apaga o cookie de tema', async () => {
    jar.set(THEME_COOKIE, JSON.stringify({ brandColor: '#6E1F2A' }));
    await forgetAppearance();
    expect(del).toHaveBeenCalledWith(THEME_COOKIE);
    expect(jar.has(THEME_COOKIE)).toBe(false);
  });

  it('gravar ou apagar o tema também apaga o cookie antigo vez_theme', async () => {
    jar.set('vez_theme', '{}');
    await rememberAppearance({ brandColor: '#6E1F2A' });
    expect(jar.has('vez_theme')).toBe(false);

    jar.set('vez_theme', '{}');
    await forgetAppearance();
    expect(jar.has('vez_theme')).toBe(false);
  });

  it('parseThemeCookie recusa lixo', () => {
    expect(parseThemeCookie(undefined)).toBeNull();
    expect(parseThemeCookie('não é json')).toBeNull();
    expect(parseThemeCookie('[1,2]')).toBeNull();
  });
});
