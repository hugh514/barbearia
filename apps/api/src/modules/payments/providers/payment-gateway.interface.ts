import { PaymentMethod } from '@prisma/client';

export type GatewayPaymentStatusValue =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'refunded';

export interface CreateGatewayPayment {
  amountCents: number;
  method: PaymentMethod;
  description: string;
  payerEmail: string;
  externalReference: string;
  notificationUrl?: string;
}

export interface GatewayPaymentResult {
  externalId: string;
  status: GatewayPaymentStatusValue;
  paymentUrl?: string;
  qrCode?: string;
  gatewayData: unknown;
}

export interface GatewayPaymentStatus {
  externalId: string;
  status: GatewayPaymentStatusValue;
  externalReference?: string;
  gatewayData: unknown;
}

export interface PaymentGateway {
  /** true no provedor fictício de dev (habilita o mock-approve). */
  readonly isMock?: boolean;
  createPayment(data: CreateGatewayPayment): Promise<GatewayPaymentResult>;
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
    query?: Record<string, string | string[] | undefined>,
  ): boolean;
  getPaymentStatus(externalId: string): Promise<GatewayPaymentStatus>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
