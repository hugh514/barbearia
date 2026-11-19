import { Card, CardContent } from '@/components/ui/card';
import { RegisterForm } from '@/features/auth/components/register-form';

export default function CadastroPage() {
  return (
    <Card>
      <CardContent className="p-5">
        <h1 className="mb-5 text-[28px] leading-tight font-bold text-foreground">Criar conta</h1>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
