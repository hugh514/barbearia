import { z } from 'zod';
import { apiClient } from '@/lib/http/client';
import { roleSchema } from '@/lib/zod/base';
import type { LoginInput, RegisterClientInput } from './schemas';

const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
  tenantId: z.string(),
});
const authResponseSchema = z.object({ user: sessionUserSchema.nullable() });
export type AuthUser = z.infer<typeof sessionUserSchema>;

export async function loginRequest(input: LoginInput): Promise<AuthUser> {
  const res = await apiClient('/auth/login', {
    method: 'POST',
    body: input,
    schema: authResponseSchema,
  });
  if (!res.user) throw new Error('Sessão inválida após login.');
  return res.user;
}

export async function registerRequest(
  input: RegisterClientInput,
): Promise<AuthUser> {
  const res = await apiClient('/auth/register', {
    method: 'POST',
    body: input,
    schema: authResponseSchema,
  });
  if (!res.user) throw new Error('Sessão inválida após cadastro.');
  return res.user;
}

export async function logoutRequest(): Promise<void> {
  await apiClient('/auth/logout', { method: 'POST' });
}
