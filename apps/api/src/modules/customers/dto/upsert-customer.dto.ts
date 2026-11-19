import { createZodDto } from '@anatine/zod-nestjs';
import { CustomerOrigin } from '@prisma/client';
import { z } from 'zod';

export const upsertCustomerSchema = z.object({
  phone: z.string().min(8),
  name: z.string().min(1).optional(),
  origin: z.nativeEnum(CustomerOrigin),
});

export class UpsertCustomerDto extends createZodDto(upsertCustomerSchema) {}
