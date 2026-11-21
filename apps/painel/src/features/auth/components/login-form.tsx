'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { loginRequest } from '@/features/auth/services';
import { safeRedirect } from '@/features/auth/safe-redirect';
import { ApiRequestError } from '@/lib/http/client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsTenant, setNeedsTenant] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await loginRequest(values);
      router.replace(safeRedirect(params.get('from')));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 400) {
        setNeedsTenant(true);
      }
      setServerError(
        err instanceof Error ? err.message : 'Não foi possível entrar. Tente de novo.',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
      aria-describedby={serverError ? 'login-error' : undefined}
    >
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="voce@barbearia.com"
          className="h-11"
          invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/forgot-password"
            className="rounded-sm text-sm font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Esqueci a senha
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="h-11 pr-12"
            invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-controls="password"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      {needsTenant && (
        <div className="space-y-2">
          <Label htmlFor="tenantSlug">Barbearia</Label>
          <Input
            id="tenantSlug"
            type="text"
            placeholder="identificador-da-barbearia"
            className="h-11"
            spellCheck={false}
            {...register('tenantSlug')}
          />
          <p className="text-sm text-muted-foreground">
            Seu e-mail está em mais de uma barbearia. Informe o identificador.
          </p>
        </div>
      )}

      {serverError && (
        <p
          id="login-error"
          role="alert"
          className="rounded-md bg-destructive-soft px-3 py-2.5 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden />}
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
