import { CustomerOrigin, UserRole } from '@prisma/client';

export interface AtendimentoFinalizadoPayload {
  tenantId: string;
  appointmentId: string;
  customerId: string;
  barberId: string | null;
  finishedAt: Date;
  totalPrice: string | null;
  services: string[];
}

export interface PagamentoAprovadoPayload {
  tenantId: string;
  paymentId: string;
  subscriptionId: string;
  customerId: string;
}

export interface PagamentoRecusadoPayload {
  tenantId: string;
  paymentId: string;
  subscriptionId: string;
  customerId: string;
  reason?: string;
}

export interface ClienteCadastradoPayload {
  tenantId: string;
  customerId: string;
  phone: string;
  name: string;
  origin: CustomerOrigin | string;
}

export interface SenhaRecuperacaoSolicitadaPayload {
  tenantId: string;
  userId: string;
  email: string;
  tenantSlug: string;
  role: UserRole;
  token: string;
}
