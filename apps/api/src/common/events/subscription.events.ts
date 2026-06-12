export const PLANO_ASSINADO = 'PLANO_ASSINADO';
export const PLANO_CANCELADO = 'PLANO_CANCELADO';

export interface PlanoAssinadoPayload {
  subscriptionId: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: string;
}

export interface PlanoCanceladoPayload {
  subscriptionId: string;
  tenantId: string;
  customerId: string;
  planId: string;
  cancelledAt: Date;
}
