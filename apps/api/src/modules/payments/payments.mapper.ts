import { Payment, Prisma } from '@prisma/client';
import { PaymentResponseDto } from '@modules/payments/dto/payment-response.dto';

type PaymentWithPlan = Payment &
  Prisma.PaymentGetPayload<{
    include: {
      customer: { select: { id: true; name: true } };
      subscription: {
        include: {
          plan: { select: { id: true; name: true; priceCents: true } };
        };
      };
    };
  }>;

export function toPaymentResponse(
  payment: PaymentWithPlan,
): PaymentResponseDto {
  return {
    id: payment.id,
    tenantId: payment.tenantId,
    subscriptionId: payment.subscriptionId,
    customerId: payment.customerId,
    externalId: payment.externalId,
    method: payment.method,
    amountCents: payment.amountCents,
    status: payment.status,
    paymentUrl: payment.paymentUrl,
    qrCode: payment.qrCode,
    gatewayData: payment.gatewayData ?? undefined,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    customer: payment.customer
      ? { id: payment.customer.id, name: payment.customer.name }
      : undefined,
    plan: payment.subscription?.plan
      ? {
          id: payment.subscription.plan.id,
          name: payment.subscription.plan.name,
          priceCents: payment.subscription.plan.priceCents,
        }
      : undefined,
  };
}
