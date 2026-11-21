import { apiClient } from '@/lib/http/client';
import {
  userListSchema,
  userSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type User,
} from './schemas';

export async function listStaff(signal?: AbortSignal) {
  return apiClient('/users?scope=staff&page=1&limit=100', {
    schema: userListSchema,
    signal,
  });
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return apiClient(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
    schema: userSchema,
  });
}

/** Desativa (soft delete): a pessoa não entra mais, o histórico fica. */
export async function deactivateUser(id: string): Promise<User> {
  return apiClient(`/users/${encodeURIComponent(id)}`, { method: 'DELETE', schema: userSchema });
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return apiClient('/users', {
    method: 'POST',
    body: input,
    schema: userSchema,
  });
}
