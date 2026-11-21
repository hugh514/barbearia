import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';
import { slugFromLink } from '@/lib/tenant-slug';
import { safeFrom } from '@/lib/safe-redirect';

export const metadata: Metadata = { title: 'Entrar' };

type Search = Promise<{ b?: string | string[]; from?: string | string[]; reset?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const { b, from, reset } = await searchParams;
  // Sem ?b= o login não manda tenant: a API acha a conta pelo e-mail.
  const tenantSlug = slugFromLink(b);
  return (
    <>
      <h1 className="mb-5 text-[28px] leading-tight font-bold text-foreground">Entrar</h1>
      {(reset === '1' || reset === 'saiu') && (
        <p role="status" className="mb-4 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          {reset === 'saiu'
            ? 'Senha trocada. Você saiu da conta neste aparelho: entre com a senha nova.'
            : 'Senha trocada. Entre com a senha nova.'}
        </p>
      )}
      <LoginForm
        tenantSlug={tenantSlug}
        from={safeFrom(Array.isArray(from) ? from[0] : from)}
      />
    </>
  );
}
