import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentMethod } from '@prisma/client';
import {
  CreateGatewayPayment,
  GatewayPaymentResult,
  GatewayPaymentStatus,
  PaymentGateway,
} from '@modules/payments/providers/payment-gateway.interface';

/**
 * Provedor fictício de dev: devolve QR code e copia e cola falsos e nunca
 * cobra ninguém. A aprovação é feita por POST /payments/:id/mock-approve.
 * Não aceita webhooks (não há gateway real por trás) e é recusado em produção
 * pela validação do ambiente.
 */
@Injectable()
export class MockPaymentProvider implements PaymentGateway {
  readonly isMock = true;

  async createPayment(
    data: CreateGatewayPayment,
  ): Promise<GatewayPaymentResult> {
    const externalId = `mock-${randomUUID()}`;
    return {
      externalId,
      status: 'pending',
      paymentUrl: `https://pagamento.mock.example/${externalId}`,
      qrCode:
        data.method === PaymentMethod.PIX
          ? `00020126MOCKPIX${externalId.replace(/-/g, '')}5204000053039865802BR`
          : undefined,
      gatewayData: { mock: true, method: data.method },
    };
  }

  verifyWebhook(): boolean {
    return false;
  }

  async getPaymentStatus(externalId: string): Promise<GatewayPaymentStatus> {
    return {
      externalId,
      status: 'pending',
      gatewayData: { mock: true, externalId },
    };
  }
}
