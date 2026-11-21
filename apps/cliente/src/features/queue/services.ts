import { z } from 'zod';
import { ApiRequestError, apiClient } from '@/lib/http/client';
import type { MyQueue } from './queue-copy';

const myQueueSchema = z.object({
  position: z.number().int().nullable(),
  ahead: z.number().int().nullable(),
  status: z.string().nullable(),
  enteredAt: z.string().nullable(),
  estimatedWaitMinutes: z.number().nullish(),
});

const OUT_OF_QUEUE: MyQueue = { position: null, ahead: null, status: null, enteredAt: null };

export async function myQueue(signal?: AbortSignal): Promise<MyQueue> {
  try {
    return await apiClient('/appointments/me/queue', { schema: myQueueSchema, signal });
  } catch (e) {
    // 422: conta sem cadastro de cliente. Não há fila para ela; não é erro de rede.
    if (e instanceof ApiRequestError && e.status === 422) return OUT_OF_QUEUE;
    throw e;
  }
}
