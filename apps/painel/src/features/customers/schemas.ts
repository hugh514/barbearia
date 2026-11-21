import { z } from 'zod';
import { paginated } from '@/lib/zod/base';
import { appointmentSchema } from '@/features/queue/schemas';

export const customerOriginSchema = z.enum([
  'MANUAL',
  'WHATSAPP',
  'INSTAGRAM',
]);
export type CustomerOrigin = z.infer<typeof customerOriginSchema>;

export const planStatusSchema = z.enum([
  'NONE',
  'ACTIVE',
  'PENDING',
  'OVERDUE',
  'CANCELLED',
]);
export type PlanStatus = z.infer<typeof planStatusSchema>;

export const customerSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  phone: z.string(),
  instagramId: z.string().nullish(),
  instagramUser: z.string().nullish(),
  origin: customerOriginSchema,
  planStatus: planStatusSchema,
  lastVisit: z.string().nullish(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;

export const customerListSchema = paginated(customerSchema);
export type CustomerList = z.infer<typeof customerListSchema>;

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  phone: z
    .string()
    .trim()
    .min(8, 'Telefone inválido')
    .regex(/^[0-9()+\-\s]+$/, 'Telefone contém caracteres inválidos'),
  instagramUser: z.string().trim().optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerHistorySchema = paginated(appointmentSchema);

const customerPaymentSchema = z.object({
  id: z.string(),
  method: z.enum(['PIX', 'CARD', 'BOLETO']),
  amountCents: z.number(),
  status: z.enum(['PENDENTE', 'APROVADO', 'RECUSADO', 'EXPIRADO', 'REEMBOLSADO']),
  paidAt: z.string().nullish(),
  createdAt: z.string(),
  plan: z.object({ name: z.string() }).nullish(),
});
export const customerPaymentsSchema = paginated(customerPaymentSchema);

const customerConversationSchema = z.object({
  id: z.string(),
  channel: z.enum(['WHATSAPP', 'INSTAGRAM']),
  status: z.enum(['ABERTA', 'AGUARDANDO', 'EM_ATENDIMENTO', 'FECHADA']),
  updatedAt: z.string(),
  lastMessage: z
    .object({ content: z.string(), direction: z.string(), createdAt: z.string() })
    .nullish(),
});
export const customerConversationsSchema = paginated(customerConversationSchema);

const customerSubscriptionSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDENTE', 'ATIVO', 'SUSPENSO', 'CANCELADO']),
  startedAt: z.string().nullish(),
  nextBillingAt: z.string().nullish(),
  createdAt: z.string(),
  plan: z.object({ name: z.string(), priceCents: z.number() }).nullish(),
});
export type CustomerSubscription = z.infer<typeof customerSubscriptionSchema>;
export const customerSubscriptionsSchema = paginated(customerSubscriptionSchema);

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  NONE: 'Sem plano',
  ACTIVE: 'Ativo',
  PENDING: 'Pendente',
  OVERDUE: 'Em atraso',
  CANCELLED: 'Cancelado',
};

export const ORIGIN_LABEL: Record<CustomerOrigin, string> = {
  MANUAL: 'Manual',
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
};
