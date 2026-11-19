import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1).optional(),
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
