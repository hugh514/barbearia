import { z } from 'zod';
import { paginated } from '@/lib/zod/base';
import type { BadgeTone } from '@/components/ui/status-badge';

export const revenueMetricsSchema = z.object({
  period: z.string(),
  appointmentRevenue: z.number(),
  planRevenue: z.number(),
  totalRevenue: z.number(),
  revenueByBarber: z.array(
    z.object({
      barberId: z.string().nullable(),
      barberName: z.string(),
      revenue: z.number(),
      appointmentCount: z.number(),
    }),
  ),
});
export type RevenueMetrics = z.infer<typeof revenueMetricsSchema>;

export const paymentStatusSchema = z.enum([
  'PENDENTE',
  'APROVADO',
  'RECUSADO',
  'EXPIRADO',
  'REEMBOLSADO',
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentMethodSchema = z.enum(['PIX', 'CARD', 'BOLETO']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  customerId: z.string(),
  method: paymentMethodSchema,
  amountCents: z.number(),
  status: paymentStatusSchema,
  paymentUrl: z.string().nullish(),
  qrCode: z.string().nullish(),
  paidAt: z.string().nullish(),
  createdAt: z.string(),
  plan: z.object({ id: z.string(), name: z.string() }).optional(),
  customer: z.object({ id: z.string(), name: z.string() }).optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const paymentListSchema = paginated(paymentSchema);

export const paymentTotalsSchema = z.object({
  count: z.number(),
  totalCents: z.number(),
  byStatus: z.array(
    z.object({ status: paymentStatusSchema, count: z.number(), amountCents: z.number() }),
  ),
});
export type PaymentTotals = z.infer<typeof paymentTotalsSchema>;

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  REEMBOLSADO: 'Reembolsado',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  RECUSADO: 'danger',
  EXPIRADO: 'neutral',
  REEMBOLSADO: 'neutral',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CARD: 'Cartão',
  BOLETO: 'Boleto',
};
