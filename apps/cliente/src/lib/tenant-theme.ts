import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { env } from '@/lib/env';
import { readAccessToken } from '@/lib/auth/cookies';
import { apiFetch } from '@/lib/http/server-fetch';
import { themeFrom, type TenantTheme } from '@/lib/theme';

/** Cookie não sensível com a última aparência conhecida (fallback do layout). */
export const THEME_COOKIE = env.cookies.theme;
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
// Nome antigo do cookie de tema: sai no próximo login para não sobrar com tema velho.
const LEGACY_THEME_COOKIE = 'vez_theme';

const appearanceSchema = z.object({
  businessName: z.string().nullish(),
  brandColor: z.string().nullish(),
  themeMode: z.string().nullish(),
});
export type Appearance = z.infer<typeof appearanceSchema>;

export type TenantAppearance = TenantTheme & { businessName: string | null };

function build(a: Appearance | null): TenantAppearance {
  const name = a?.businessName?.trim();
  return { ...themeFrom(a), businessName: name ? name.slice(0, 80) : null };
}

/** Lê o cookie de tema; qualquer coisa fora do formato vira null. */
export function parseThemeCookie(raw: string | undefined): Appearance | null {
  if (!raw) return null;
  try {
    const parsed = appearanceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Aparência da barbearia na API; null em qualquer falha (401, rede, formato). */
export async function fetchAppearance(accessToken: string): Promise<Appearance | null> {
  try {
    const res = await apiFetch('/channels/config/appearance', {
      accessToken,
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const parsed = appearanceSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Grava o cookie de tema. Só em Route Handler ou Server Action (layout não
 * pode gravar cookie). Guarda só cor, modo e nome: nada sensível.
 */
export async function rememberAppearance(input: unknown): Promise<void> {
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return;
  const a = parsed.data;
  const value: Appearance = {
    businessName: a.businessName ?? null,
    brandColor: a.brandColor ?? null,
    themeMode: a.themeMode ?? null,
  };
  const store = await cookies();
  store.delete(LEGACY_THEME_COOKIE);
  store.set(THEME_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE,
  });
}

// Login sem aparência não pode herdar o tema de outra barbearia.
export async function forgetAppearance(): Promise<void> {
  const store = await cookies();
  store.delete(THEME_COOKIE);
  store.delete(LEGACY_THEME_COOKIE);
}

/**
 * Tema e nome da barbearia do usuário logado, para o layout. Tenta a API com o
 * access token atual (sem refresh: o layout não grava cookie); se não houver
 * token ou a API falhar, usa o cookie bc_theme; sem ele, o padrão.
 * `cache` evita chamar a API duas vezes no mesmo request (layout raiz e do app).
 */
export const getTenantTheme = cache(async (): Promise<TenantAppearance> => {
  const token = await readAccessToken();
  if (token) {
    const fromApi = await fetchAppearance(token);
    if (fromApi) return build(fromApi);
  }
  const store = await cookies();
  return build(parseThemeCookie(store.get(THEME_COOKIE)?.value));
});
