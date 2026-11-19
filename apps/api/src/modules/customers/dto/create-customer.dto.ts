import { createZodDto } from '@anatine/zod-nestjs';
import { CustomerOrigin } from '@prisma/client';
import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  instagram: z.string().min(1).optional(),
  origin: z.nativeEnum(CustomerOrigin).default(CustomerOrigin.MANUAL),
});

export class CreateCustomerDto extends createZodDto(createCustomerSchema) {}
