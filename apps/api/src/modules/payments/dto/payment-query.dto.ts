import { createZodDto } from '@anatine/zod-nestjs';
import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from '@common/pagination/pagination.util';

export const paymentQuerySchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .default(DEFAULT_PER_PAGE),
});

export class PaymentQueryDto extends createZodDto(paymentQuerySchema) {}
