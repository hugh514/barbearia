import { z } from 'zod';
import { apiClient, ApiRequestError } from '@/lib/http/client';

export const appearanceSchema = z.object({
  businessName: z.string().nullish(),
  brandColor: z.string().nullish(),
  themeMode: z.enum(['light', 'dark']).nullish(),
});
export type Appearance = { brandColor: string; themeMode: 'light' | 'dark' };

/** Aparência atual; a API devolve os padrões quando ainda não há configuração. */
export async function getAppearance(signal?: AbortSignal) {
  return apiClient('/channels/config/appearance', { schema: appearanceSchema, signal });
}

export const NO_CONFIG_MESSAGE =
  'Salve os dados da barbearia acima antes de escolher a aparência.';

/**
 * Grava cor e modo na configuração da barbearia (PATCH, só ADMIN).
 * Sem configuração a API responde 404, e criar por POST exige nome, endereço,
 * telefone e horário: o erro pede para salvar os dados da barbearia primeiro.
 */
export async function saveAppearance(body: Appearance) {
  try {
    return await apiClient('/channels/config', {
      method: 'PATCH',
      body,
      schema: appearanceSchema,
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      throw new ApiRequestError(404, NO_CONFIG_MESSAGE, err.body);
    }
    throw err;
  }
}
