import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-bold text-foreground">Entrar no painel</h1>
        <CardDescription>Use o e-mail cadastrado pela barbearia.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
