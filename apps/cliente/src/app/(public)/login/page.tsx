import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="p-5">
        <h1 className="mb-5 text-[28px] leading-tight font-bold text-foreground">Entrar</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
