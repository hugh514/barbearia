'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { z } from 'zod';
import { apiClient } from '@/lib/http/client';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas';
import { withTenant } from '@/lib/tenant-slug';
import { FieldError, describedBy, errorId } from './field-error';

const resetResultSchema = z.object({ signedOut: z.boolean() });

export function ResetPasswordForm({
  token,
  tenantSlug,
}: {
  token: string;
  tenantSlug: string | null;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  // O token fica no formulário; fora da barra de endereço ele não vai para o
  // histórico, para print de tela nem para quem pega o aparelho depois.
  useEffect(() => {
    const clean = tenantSlug ? `/reset-password?tenant=${encodeURIComponent(tenantSlug)}` : '/reset-password';
    window.history.replaceState(window.history.state, '', clean);
  }, [tenantSlug]);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    try {
      const { signedOut } = await apiClient('/auth/reset-password', {
        method: 'POST',
        body: values,
        schema: resetResultSchema,
      });
      router.replace(withTenant(`/login?reset=${signedOut ? 'saiu' : '1'}`, tenantSlug));
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Senha nova</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-describedby={describedBy('password-hint', !!errors.password && errorId('password'))}
          invalid={!!errors.password}
          {...register('password')}
        />
        <p id="password-hint" className="text-sm text-muted-foreground">
          8 caracteres ou mais, com maiúscula, minúscula e número.
        </p>
        <FieldError field="password" message={errors.password?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repita a senha nova</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          invalid={!!errors.confirmPassword}
          aria-describedby={describedBy(!!errors.confirmPassword && errorId('confirmPassword'))}
          {...register('confirmPassword')}
        />
        <FieldError field="confirmPassword" message={errors.confirmPassword?.message} />
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}{' '}
          <Link href={withTenant('/forgot-password', tenantSlug)} className="inline-flex min-h-11 items-center font-semibold underline">
            Pedir novo link
          </Link>
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando…' : 'Salvar senha nova'}
      </Button>
    </form>
  );
}
