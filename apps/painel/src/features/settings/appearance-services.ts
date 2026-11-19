import { z } from 'zod';
import { apiClient, ApiRequestError } from '@/lib/http/client';

export const appearanceSchema = z.object({
  brandColor: z.string().nullish(),
  themeMode: z.enum(['light', 'dark']).nullish(),
});
export type Appearance = { brandColor: string; themeMode: 'light' | 'dark' };

/** Tema salvo da barbearia; null se a API ainda não tem /settings (404). */
export async function getAppearance(signal?: AbortSignal) {
  try {
    return await apiClient('/settings', { schema: appearanceSchema, signal });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function saveAppearance(body: Appearance) {
  return apiClient('/settings', { method: 'PATCH', body, schema: appearanceSchema });
}
