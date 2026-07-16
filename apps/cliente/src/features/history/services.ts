import { z } from 'zod';
import { apiClient } from '@/lib/http/client';
import { paginated } from '@/lib/zod/base';

export const historyItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  services: z.array(z.string()),
  barber: z.object({ id: z.string(), name: z.string() }).nullish(),
  createdAt: z.string(),
  finishedAt: z.string().nullish(),
});
export type HistoryItem = z.infer<typeof historyItemSchema>;
const historyListSchema = paginated(historyItemSchema);

export async function myHistory(signal?: AbortSignal) {
  return apiClient('/appointments/me?page=1&perPage=30', {
    schema: historyListSchema,
    signal,
  });
}
