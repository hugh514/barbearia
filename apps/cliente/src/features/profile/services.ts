import { z } from 'zod';
import { apiClient } from '@/lib/http/client';
import { roleSchema } from '@/lib/zod/base';

const meSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string(),
  role: roleSchema,
  tenantId: z.string(),
  customerId: z.string().nullish(),
});
export type Me = z.infer<typeof meSchema>;

export async function getMe(signal?: AbortSignal): Promise<Me> {
  return apiClient('/auth/me', { schema: meSchema, signal });
}
