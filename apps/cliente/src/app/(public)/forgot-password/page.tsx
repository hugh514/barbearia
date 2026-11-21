import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { slugFromLink } from '@/lib/tenant-slug';

export const metadata: Metadata = { title: 'Esqueci a senha' };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string | string[] }>;
}) {
  const { b } = await searchParams;
  const tenantSlug = slugFromLink(b);
  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold text-foreground">Esqueci a senha</h1>
      <p className="mt-1 mb-5 text-base text-muted-foreground">
        Mandamos um link para o seu e-mail. Por ele você cria uma senha nova.
      </p>
      <ForgotPasswordForm tenantSlug={tenantSlug} />
    </>
  );
}
