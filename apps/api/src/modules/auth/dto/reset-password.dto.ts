import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
