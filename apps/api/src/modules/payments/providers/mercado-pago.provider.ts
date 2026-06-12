import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';
import MercadoPagoConfig, {
  Payment,
  Preference,
  WebhookSignatureValidator,
} from 'mercadopago';
import { Env } from '@common/config/env.schema';
import {
  CreateGatewayPayment,
  GatewayPaymentResult,
  GatewayPaymentStatus,
  GatewayPaymentStatusValue,
  PaymentGateway,
} from '@modules/payments/providers/payment-gateway.interface';

const MP_STATUS_MAP: Record<string, GatewayPaymentStatusValue> = {
  pending: 'pending',
  in_process: 'pending',
  in_mediation: 'pending',
  authorized: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'expired',
  expired: 'expired',
  refunded: 'refunded',
  charged_back: 'refunded',
};

@Injectable()
export class MercadoPagoProvider implements PaymentGateway {
  private readonly paymentClient: Payment;
  private readonly preferenceClient: Preference;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const accessToken = this.configService.get('MERCADO_PAGO_ACCESS_TOKEN', {
      infer: true,
    });

    const config = new MercadoPagoConfig({ accessToken });
    this.paymentClient = new Payment(config);
    this.preferenceClient = new Preference(config);
    this.webhookSecret = this.configService.get('MERCADO_PAGO_WEBHOOK_SECRET', {
      infer: true,
    });
  }

  async createPayment(
    data: CreateGatewayPayment,
  ): Promise<GatewayPaymentResult> {
    if (data.method === PaymentMethod.PIX) {
      return this.createPixPayment(data);
    }

    return this.createCheckoutPreference(data);
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
    query?: Record<string, string | string[] | undefined>,
  ): boolean {
    const bodyRecord = body as { data?: { id?: string } } | null;
    const dataId =
      query?.['data.id'] ?? query?.id ?? bodyRecord?.data?.id ?? null;

    try {
      WebhookSignatureValidator.validate({
        xSignature: headers['x-signature'],
        xRequestId: headers['x-request-id'],
        dataId,
        secret: this.webhookSecret,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getPaymentStatus(externalId: string): Promise<GatewayPaymentStatus> {
    const response = await this.paymentClient.get({ id: externalId });

    return {
      externalId: String(response.id),
      status: this.mapMpStatus(response.status),
      externalReference: response.external_reference,
      gatewayData: response,
    };
  }

  private async createPixPayment(
    data: CreateGatewayPayment,
  ): Promise<GatewayPaymentResult> {
    const response = await this.paymentClient.create({
      body: {
        transaction_amount: data.amountCents / 100,
        description: data.description,
        payment_method_id: 'pix',
        payer: { email: data.payerEmail },
        external_reference: data.externalReference,
        ...(data.notificationUrl
          ? { notification_url: data.notificationUrl }
          : {}),
      },
    });

    const transactionData = response.point_of_interaction?.transaction_data;

    return {
      externalId: String(response.id),
      status: this.mapMpStatus(response.status),
      paymentUrl: transactionData?.ticket_url,
      qrCode: transactionData?.qr_code,
      gatewayData: response,
    };
  }

  private async createCheckoutPreference(
    data: CreateGatewayPayment,
  ): Promise<GatewayPaymentResult> {
    const excludedPaymentTypes =
      data.method === PaymentMethod.BOLETO
        ? [{ id: 'credit_card' }, { id: 'debit_card' }]
        : data.method === PaymentMethod.CARD
          ? [{ id: 'ticket' }]
          : undefined;

    const response = await this.preferenceClient.create({
      body: {
        items: [
          {
            id: data.externalReference,
            title: data.description,
            quantity: 1,
            unit_price: data.amountCents / 100,
          },
        ],
        payer: { email: data.payerEmail },
        external_reference: data.externalReference,
        ...(data.notificationUrl
          ? { notification_url: data.notificationUrl }
          : {}),
        ...(excludedPaymentTypes
          ? {
              payment_methods: { excluded_payment_types: excludedPaymentTypes },
            }
          : {}),
      },
    });

    return {
      externalId: response.id!,
      status: 'pending',
      paymentUrl: response.init_point,
      gatewayData: response,
    };
  }

  private mapMpStatus(status: string | undefined): GatewayPaymentStatusValue {
    if (!status) {
      return 'pending';
    }

    return MP_STATUS_MAP[status] ?? 'pending';
  }
}
