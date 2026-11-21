'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/http/client';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/features/auth/schemas';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    await apiClient('/auth/forgot-password', {
      method: 'POST',
      body: values,
    }).catch(() => undefined);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <p className="rounded-md bg-secondary px-3 py-2.5 text-sm text-foreground" role="status">
          Se existir uma conta com esse e-mail, enviaremos um link para redefinir a
          senha. Verifique sua caixa de entrada.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
        >
          Voltar para Entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          className="h-11"
          invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Enviar link'}
      </Button>
      <Link
        href="/login"
        className="block text-sm font-medium text-primary-text underline-offset-4 hover:underline"
      >
        Voltar para Entrar
      </Link>
    </form>
  );
}
