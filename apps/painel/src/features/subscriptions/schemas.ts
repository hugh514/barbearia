import { z } from 'zod';
import { paginated } from '@/lib/zod/base';
import type { BadgeTone } from '@/components/ui/status-badge';

export const SUBSCRIPTION_STATUSES = ['ATIVO', 'PENDENTE', 'SUSPENSO', 'CANCELADO'] as const;
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  planId: z.string(),
  status: subscriptionStatusSchema,
  startedAt: z.string().nullish(),
  nextBillingAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  createdAt: z.string(),
  plan: z
    .object({
      id: z.string(),
      name: z.string(),
      priceCents: z.number(),
      intervalDays: z.number(),
    })
    .optional(),
  customer: z.object({ id: z.string(), name: z.string(), phone: z.string() }).optional(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionListSchema = paginated(subscriptionSchema);

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ATIVO: 'Ativa',
  PENDENTE: 'Pendente',
  SUSPENSO: 'Suspensa',
  CANCELADO: 'Cancelada',
};

export const STATUS_TONE: Record<SubscriptionStatus, BadgeTone> = {
  ATIVO: 'success',
  PENDENTE: 'warning',
  SUSPENSO: 'danger',
  CANCELADO: 'neutral',
};

export type SubscriptionAction = 'activate' | 'suspend' | 'renew' | 'cancel';
export type RowAction = SubscriptionAction | 'pix';

export function actionsFor(status: SubscriptionStatus): RowAction[] {
  switch (status) {
    case 'ATIVO':
      return ['suspend', 'renew', 'cancel'];
    case 'PENDENTE':
      return ['activate', 'pix', 'cancel'];
    case 'SUSPENSO':
      return ['activate', 'cancel'];
    case 'CANCELADO':
      return [];
  }
}

export function parseStatusFilter(value: unknown): SubscriptionStatus | undefined {
  const r = subscriptionStatusSchema.safeParse(value);
  return r.success ? r.data : undefined;
}
