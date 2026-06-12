export const CHECKIN_REALIZADO = 'CHECKIN_REALIZADO';

export interface CheckinRealizadoPayload {
  tenantId: string;
  customerId: string;
  appointmentId: string;
  reused: boolean;
  checkedInAt: Date;
}
