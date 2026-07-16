import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const registerClientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  tenantSlug: z.string().min(1),
});

export class RegisterClientDto extends createZodDto(registerClientSchema) {}
