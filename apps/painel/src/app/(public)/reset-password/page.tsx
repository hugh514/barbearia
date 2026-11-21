import Link from 'next/link';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { AuthHeading } from '@/features/auth/components/auth-heading';

export const metadata: Metadata = { title: 'Nova senha' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <AuthHeading
        title="Definir nova senha"
        description="Use ao menos 8 caracteres, com maiúscula, minúscula e número."
      />
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2.5 text-sm text-destructive">
          Este link não vale mais. Peça outro em{' '}
          <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
            Recuperar senha
          </Link>
          .
        </p>
      )}
    </>
  );
}
