import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { slugFromLink, withTenant } from '@/lib/tenant-slug';

// O token vai na URL: no-referrer evita que ele saia em Referer.
export const metadata: Metadata = { title: 'Criar senha nova', referrer: 'no-referrer' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; tenant?: string | string[] }>;
}) {
  const { token, tenant } = await searchParams;
  const t = Array.isArray(token) ? token[0] : token;
  const tenantSlug = slugFromLink(tenant);
  return (
    <>
      <h1 className="mb-5 text-[28px] leading-tight font-bold text-foreground">Criar senha nova</h1>
      {t ? (
        <ResetPasswordForm token={t} tenantSlug={tenantSlug} />
      ) : (
        <p role="alert" className="text-base text-destructive">
          Este link está incompleto. Peça um novo em{' '}
          <Link href={withTenant('/forgot-password', tenantSlug)} className="inline-flex min-h-11 items-center font-semibold underline">
            Esqueci a senha
          </Link>
          .
        </p>
      )}
    </>
  );
}
