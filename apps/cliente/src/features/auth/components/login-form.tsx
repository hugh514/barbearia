'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { loginRequest } from '@/features/auth/services';
import { safeFrom } from '@/lib/safe-redirect';
import { withTenant } from '@/lib/tenant-slug';
import { FieldError, describedBy, errorId } from './field-error';

const linkClass =
  'inline-flex min-h-11 items-center font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm';

export function LoginForm({ tenantSlug, from }: { tenantSlug: string | null; from: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: tenantSlug ? { tenantSlug } : undefined,
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await loginRequest(values);
      router.replace(safeFrom(from));
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" inputMode="email" invalid={!!errors.email} aria-describedby={describedBy(!!errors.email && errorId('email'))} {...register('email')} />
        <FieldError field="email" message={errors.email?.message} />
      </div>
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="password">Senha</Label>
          <Link href={withTenant('/forgot-password', tenantSlug)} className={`${linkClass} -my-3 text-sm`}>
            Esqueci a senha
          </Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" invalid={!!errors.password} aria-describedby={describedBy(!!errors.password && errorId('password'))} {...register('password')} />
        <FieldError field="password" message={errors.password?.message} />
      </div>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Primeira vez aqui?{' '}
        <Link href={withTenant('/cadastro', tenantSlug)} className={linkClass}>
          Criar conta
        </Link>
      </p>
    </form>
  );
}
