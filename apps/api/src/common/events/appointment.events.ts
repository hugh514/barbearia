export const ATENDIMENTO_INICIADO = 'ATENDIMENTO_INICIADO';
export const ATENDIMENTO_FINALIZADO = 'ATENDIMENTO_FINALIZADO';

export interface AtendimentoIniciadoPayload {
  appointmentId: string;
  tenantId: string;
  customerId: string;
  barberId: string;
  startedAt: Date;
}

export interface AtendimentoFinalizadoPayload {
  appointmentId: string;
  tenantId: string;
  customerId: string;
  barberId: string | null;
  finishedAt: Date;
  totalPrice: string | null;
  services: string[];
}
