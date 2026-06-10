import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export class LogoutDto extends createZodDto(logoutSchema) {}
