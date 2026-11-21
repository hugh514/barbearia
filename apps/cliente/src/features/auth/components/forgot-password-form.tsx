'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/http/client';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schemas';
import { withTenant } from '@/lib/tenant-slug';
import { FieldError, describedBy, errorId } from './field-error';

export function ForgotPasswordForm({ tenantSlug }: { tenantSlug: string | null }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: tenantSlug ? { tenantSlug } : undefined,
  });

  async function onSubmit(values: ForgotPasswordInput) {
    // A resposta é a mesma exista a conta ou não; erro só em limite ou falha.
    setError(null);
    try {
      await apiClient('/auth/forgot-password', { method: 'POST', body: values });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o link agora.');
    }
  }

  return (
    <div className="space-y-4">
      {sent ? (
        <p role="status" className="rounded-md bg-secondary px-3 py-3 text-base text-foreground">
          Se houver uma conta com esse e-mail, o link chega em alguns minutos. Confira também
          a caixa de spam.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" inputMode="email" autoComplete="email" invalid={!!errors.email} aria-describedby={describedBy(!!errors.email && errorId('email'))} {...register('email')} />
            <FieldError field="email" message={errors.email?.message} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link
          href={withTenant('/login', tenantSlug)}
          className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
