import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // staff: só quem trabalha na barbearia, sem os logins de cliente do app.
  scope: z.enum(['staff']).optional(),
});

export class ListUsersQueryDto extends createZodDto(listUsersQuerySchema) {}
