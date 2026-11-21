import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';
import { AuthHeading } from '@/features/auth/components/auth-heading';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Entrar" description="Use o e-mail e a senha da sua conta." />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
