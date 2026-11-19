import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
});

export class CreateSubscriptionDto extends createZodDto(
  createSubscriptionSchema,
) {}
