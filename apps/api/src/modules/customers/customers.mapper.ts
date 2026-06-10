import { Customer } from '@prisma/client';
import { CustomerResponseDto } from '@modules/customers/dto/customer-response.dto';

export function toCustomerResponse(customer: Customer): CustomerResponseDto {
  return {
    id: customer.id,
    tenantId: customer.tenantId,
    name: customer.name,
    phone: customer.phone,
    instagramId: customer.instagramId,
    instagramUser: customer.instagramUser,
    origin: customer.origin,
    planStatus: customer.planStatus,
    lastVisit: customer.lastVisit,
    active: customer.active,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
