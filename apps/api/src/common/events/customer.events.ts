export const CLIENTE_CADASTRADO = 'CLIENTE_CADASTRADO';

export interface ClienteCadastradoPayload {
  customerId: string;
  tenantId: string;
  phone: string;
  name: string;
  origin: string;
}
