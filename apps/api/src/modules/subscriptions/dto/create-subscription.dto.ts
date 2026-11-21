import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  /** Só equipe: false cria PENDENTE para cobrar por PIX. Padrão true (balcão). */
  activateNow: z.boolean().optional(),
});

export class CreateSubscriptionDto extends createZodDto(
  createSubscriptionSchema,
) {}
