import { Card, CardContent } from '@/components/ui/card';
import { RegisterForm } from '@/features/auth/components/register-form';

export default function CadastroPage() {
  return (
    <Card>
      <CardContent className="p-6">
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
