import { Customer, Plan, Subscription } from '@prisma/client';
import { SubscriptionResponseDto } from '@modules/subscriptions/dto/subscription-response.dto';

type SubscriptionWithRelations = Subscription & {
  plan?: Pick<Plan, 'id' | 'name' | 'priceCents' | 'intervalDays' | 'benefits'>;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
};

export function toSubscriptionResponse(
  subscription: SubscriptionWithRelations,
): SubscriptionResponseDto {
  return {
    id: subscription.id,
    tenantId: subscription.tenantId,
    customerId: subscription.customerId,
    planId: subscription.planId,
    status: subscription.status,
    startedAt: subscription.startedAt,
    nextBillingAt: subscription.nextBillingAt,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    ...(subscription.plan
      ? {
          plan: {
            id: subscription.plan.id,
            name: subscription.plan.name,
            priceCents: subscription.plan.priceCents,
            intervalDays: subscription.plan.intervalDays,
            benefits: subscription.plan.benefits,
          },
        }
      : {}),
    ...(subscription.customer
      ? {
          customer: {
            id: subscription.customer.id,
            name: subscription.customer.name,
            phone: subscription.customer.phone,
          },
        }
      : {}),
  };
}
