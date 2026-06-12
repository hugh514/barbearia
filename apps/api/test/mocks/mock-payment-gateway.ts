import { createHmac, randomUUID } from 'crypto';
import { PaymentMethod } from '@prisma/client';
import {
  CreateGatewayPayment,
  GatewayPaymentResult,
  GatewayPaymentStatus,
  GatewayPaymentStatusValue,
  PaymentGateway,
} from '../../src/modules/payments/providers/payment-gateway.interface';

export const MOCK_WEBHOOK_SECRET = 'dev-mp-webhook-secret';

const statusByExternalId = new Map<string, GatewayPaymentStatusValue>();

export function setMockPaymentStatus(
  externalId: string,
  status: GatewayPaymentStatusValue,
): void {
  statusByExternalId.set(externalId, status);
}

export function resetMockPaymentGateway(): void {
  statusByExternalId.clear();
}

export function buildWebhookSignature(
  dataId: string,
  requestId: string,
  secret: string = MOCK_WEBHOOK_SECRET,
): string {
  const ts = Date.now().toString();
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

export class MockPaymentGateway implements PaymentGateway {
  private readonly references = new Map<string, string>();

  async createPayment(
    data: CreateGatewayPayment,
  ): Promise<GatewayPaymentResult> {
    const externalId = `mp-${randomUUID()}`;
    this.references.set(externalId, data.externalReference);
    statusByExternalId.set(externalId, 'pending');

    return {
      externalId,
      status: 'pending',
      paymentUrl: `https://pay.mock/${externalId}`,
      qrCode:
        data.method === PaymentMethod.PIX
          ? `00020126PIXMOCK${externalId}`
          : undefined,
      gatewayData: { mock: true, method: data.method },
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    _body: unknown,
    query?: Record<string, string | string[] | undefined>,
  ): boolean {
    const signature = headers['x-signature'];
    const requestId = headers['x-request-id'];
    const dataId = query?.['data.id'] ?? query?.id;

    if (
      typeof signature !== 'string' ||
      typeof requestId !== 'string' ||
      typeof dataId !== 'string'
    ) {
      return false;
    }

    const parts = signature.split(',');
    let ts: string | undefined;
    let v1: string | undefined;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') {
        ts = value?.trim();
      }
      if (key?.trim() === 'v1') {
        v1 = value?.trim();
      }
    }

    if (!ts || !v1) {
      return false;
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', MOCK_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');

    return expected === v1;
  }

  async getPaymentStatus(externalId: string): Promise<GatewayPaymentStatus> {
    return {
      externalId,
      status: statusByExternalId.get(externalId) ?? 'pending',
      externalReference: this.references.get(externalId),
      gatewayData: { mock: true, externalId },
    };
  }
}
