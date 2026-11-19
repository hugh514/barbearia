'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  registerClientSchema,
  type RegisterClientInput,
} from '@/features/auth/schemas';
import { registerRequest } from '@/features/auth/services';

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterClientInput>({
    resolver: zodResolver(registerClientSchema),
    defaultValues: { tenantSlug: 'barbearia-modelo' },
  });

  async function onSubmit(values: RegisterClientInput) {
    setServerError(null);
    try {
      await registerRequest(values);
      router.replace('/');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível cadastrar.');
    }
  }

  const field = (
    id: keyof RegisterClientInput,
    label: string,
    type = 'text',
    autoComplete?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} autoComplete={autoComplete} invalid={!!errors[id]} {...register(id)} />
      {errors[id] && <p className="text-sm text-destructive">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {field('name', 'Nome', 'text', 'name')}
      {field('phone', 'Telefone', 'tel', 'tel')}
      {field('email', 'E-mail', 'email', 'email')}
      {field('password', 'Senha', 'password', 'new-password')}
      {field('tenantSlug', 'Barbearia')}
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Cadastrando…' : 'Criar conta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary-text hover:underline">Entrar</Link>
      </p>
    </form>
  );
}
