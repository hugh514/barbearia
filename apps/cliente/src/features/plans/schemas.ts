import { z } from 'zod';
import { paginated } from '@/lib/zod/base';

export const planSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  priceCents: z.number(),
  intervalDays: z.number(),
  benefits: z.array(z.string()),
  active: z.boolean(),
});
export type Plan = z.infer<typeof planSchema>;
export const planListSchema = paginated(planSchema);

export const subscriptionStatusSchema = z.enum([
  'PENDENTE',
  'ATIVO',
  'ATIVA',
  'SUSPENSO',
  'SUSPENSA',
  'CANCELADO',
  'CANCELADA',
]);

export const subscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  plan: z
    .object({
      id: z.string(),
      name: z.string(),
      priceCents: z.number(),
      intervalDays: z.number().optional(),
      benefits: z.array(z.string()).optional(),
    })
    .optional(),
  currentPeriodEnd: z.string().nullish(),
  createdAt: z.string().optional(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
export const subscriptionListSchema = paginated(subscriptionSchema);
