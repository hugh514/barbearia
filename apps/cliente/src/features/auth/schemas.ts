import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
  tenantSlug: z.string().trim().min(1).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string().min(10),
  refreshToken: z.string().min(10),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

const strongPassword = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Z]/, 'Inclua uma maiúscula')
  .regex(/[a-z]/, 'Inclua uma minúscula')
  .regex(/[0-9]/, 'Inclua um número');

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
  tenantSlug: z.string().trim().min(1).optional(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(200),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não são iguais',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const registerClientSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  phone: z
    .string()
    .trim()
    .min(8, 'Telefone inválido')
    .regex(/^[0-9()+\-\s]+$/, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  password: strongPassword,
  tenantSlug: z.string().trim().min(1),
});
export type RegisterClientInput = z.infer<typeof registerClientSchema>;
