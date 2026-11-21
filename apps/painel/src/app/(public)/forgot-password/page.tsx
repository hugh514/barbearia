import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { AuthHeading } from '@/features/auth/components/auth-heading';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Recuperar senha"
        description="Informe o e-mail da sua conta. Enviamos um link para criar uma senha nova."
      />
      <ForgotPasswordForm />
    </>
  );
}
