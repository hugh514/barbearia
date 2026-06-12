import { createZodDto } from '@anatine/zod-nestjs';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .refine((v) => /[A-Z]/.test(v), {
    message: 'A senha deve conter ao menos uma letra maiúscula',
  })
  .refine((v) => /[a-z]/.test(v), {
    message: 'A senha deve conter ao menos uma letra minúscula',
  })
  .refine((v) => /[0-9]/.test(v), {
    message: 'A senha deve conter ao menos um dígito numérico',
  });

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: passwordSchema,
  role: z.nativeEnum(UserRole),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
