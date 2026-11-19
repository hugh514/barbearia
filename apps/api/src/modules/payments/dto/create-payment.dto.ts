import { createZodDto } from '@anatine/zod-nestjs';
import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const createPaymentSchema = z.object({
  subscriptionId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
});

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
