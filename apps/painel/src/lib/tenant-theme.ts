import 'server-only';
import { z } from 'zod';
import { readAccessToken } from '@/lib/auth/cookies';
import { apiFetch } from '@/lib/http/server-fetch';
import { themeFrom, type TenantTheme } from '@/lib/theme';

const settingsSchema = z.object({
  brandColor: z.string().nullish(),
  themeMode: z.string().nullish(),
});

/**
 * Tema da barbearia do usuário logado (GET /settings). Sem sessão, sem
 * endpoint ou com qualquer falha, devolve o padrão.
 * Só lê o access token atual: o layout raiz não pode gravar cookie, então
 * não dispara refresh aqui (isso fica com o proxy e as rotas).
 */
export async function getTenantTheme(): Promise<TenantTheme> {
  const token = await readAccessToken();
  if (!token) return themeFrom(null);
  try {
    const res = await apiFetch('/settings', {
      accessToken: token,
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return themeFrom(null);
    const parsed = settingsSchema.safeParse(await res.json());
    return themeFrom(parsed.success ? parsed.data : null);
  } catch {
    return themeFrom(null);
  }
}
