'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listStaff, createUser, deactivateUser, updateUser } from './services';
import type { CreateUserInput, UpdateUserInput } from './schemas';

const KEY = ['users'];

export function useUsers() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => listStaff(signal),
    staleTime: 30_000,
  });
}

export function useUserActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const create = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: refresh,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: refresh,
  });
  return { create, update, deactivate };
}
