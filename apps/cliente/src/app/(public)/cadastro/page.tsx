import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';
import { env } from '@/lib/env';
import { isTenantSlug } from '@/lib/tenant-slug';

export const metadata: Metadata = { title: 'Criar conta' };

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string | string[] }>;
}) {
  const { b } = await searchParams;
  const fromLink = Array.isArray(b) ? b[0] : b;
  // Link com ?b= quebrado não pode cair em outra barbearia sem avisar.
  if (fromLink !== undefined && !isTenantSlug(fromLink)) {
    return (
      <>
        <h1 className="mb-5 text-[28px] leading-tight font-bold text-foreground">Criar conta</h1>
        <p role="alert" className="text-base text-destructive">
          Este link de cadastro não é válido. Peça o link certo para a barbearia.
        </p>
      </>
    );
  }
  const tenantSlug = fromLink ?? env.defaultTenantSlug;
  return (
    <>
      <h1 className="mb-5 text-[28px] leading-tight font-bold text-foreground">Criar conta</h1>
      <RegisterForm tenantSlug={tenantSlug} linkSlug={fromLink ?? null} />
    </>
  );
}
