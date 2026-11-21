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
import { registerClientSchema, type RegisterClientInput } from '@/features/auth/schemas';
import { registerRequest } from '@/features/auth/services';
import { withTenant } from '@/lib/tenant-slug';
import { FieldError, describedBy, errorId } from './field-error';

// linkSlug só existe quando a barbearia veio do link: a padrão do ambiente não vai para o "Entrar".
export function RegisterForm({
  tenantSlug,
  linkSlug,
}: {
  tenantSlug: string;
  linkSlug: string | null;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterClientInput>({
    resolver: zodResolver(registerClientSchema),
    defaultValues: { tenantSlug },
  });

  async function onSubmit(values: RegisterClientInput) {
    setServerError(null);
    try {
      await registerRequest({ ...values, tenantSlug });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    }
  }

  const error = (id: keyof RegisterClientInput) => <FieldError field={id} message={errors[id]?.message} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" autoComplete="name" invalid={!!errors.name} aria-describedby={describedBy(!!errors.name && errorId('name'))} {...register('name')} />
        {error('name')}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" invalid={!!errors.phone} aria-describedby={describedBy(!!errors.phone && errorId('phone'))} {...register('phone')} />
        {error('phone')}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" inputMode="email" autoComplete="email" invalid={!!errors.email} aria-describedby={describedBy(!!errors.email && errorId('email'))} {...register('email')} />
        {error('email')}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
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
        {error('password')}
      </div>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Criando conta…' : 'Criar conta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link
          href={withTenant('/login', linkSlug)}
          className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
