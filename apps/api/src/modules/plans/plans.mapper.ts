import { Plan } from '@prisma/client';
import { PlanResponseDto } from '@modules/plans/dto/plan-response.dto';

export function toPlanResponse(plan: Plan): PlanResponseDto {
  return {
    id: plan.id,
    tenantId: plan.tenantId,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    intervalDays: plan.intervalDays,
    benefits: plan.benefits,
    active: plan.active,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
