import { createZodDto } from '@anatine/zod-nestjs';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.nativeEnum(UserRole).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
