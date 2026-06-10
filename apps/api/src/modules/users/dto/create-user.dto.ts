import { createZodDto } from '@anatine/zod-nestjs';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
