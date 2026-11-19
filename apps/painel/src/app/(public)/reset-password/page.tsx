import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Definir nova senha</CardTitle>
        <CardDescription>Escolha uma senha forte para sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-destructive">
            Link inválido ou expirado. Solicite um novo em{' '}
            <Link href="/forgot-password" className="underline">
              recuperar senha
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
