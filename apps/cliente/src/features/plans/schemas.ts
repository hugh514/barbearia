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
  customer: z.object({ name: z.string(), phone: z.string() }).optional(),
  nextBillingAt: z.string().nullish(),
  createdAt: z.string().optional(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
export const subscriptionListSchema = paginated(subscriptionSchema);

// Suspensa é plano com pagamento atrasado: segue sendo o plano do cliente, que
// paga para reativar ou cancela. Não pode abrir espaço para assinar outro.
const CURRENT_ORDER = ['ATIVO', 'SUSPENSO', 'PENDENTE'];

export function currentSubscription(subs: Subscription[] | undefined): Subscription | null {
  if (!subs) return null;
  for (const status of CURRENT_ORDER) {
    const found = subs.find((s) => s.status === status);
    if (found) return found;
  }
  return null;
}

export const paymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  amountCents: z.number(),
  qrCode: z.string().nullish(),
  paymentUrl: z.string().nullish(),
  gatewayData: z.unknown().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

/**
 * O provedor fictício de dev marca a cobrança com gatewayData.mock. A API recusa
 * esse provedor em produção, então o botão de simular nunca aparece lá.
 */
export function isMockPayment(p: Pick<Payment, 'gatewayData'>): boolean {
  const g = p.gatewayData;
  return typeof g === 'object' && g !== null && (g as { mock?: unknown }).mock === true;
}
