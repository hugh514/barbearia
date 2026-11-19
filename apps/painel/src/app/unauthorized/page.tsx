import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-6xl font-extrabold tabular-nums font-stretch-extra-condensed text-muted-foreground">403</p>
      <h1 className="text-xl font-semibold text-foreground">Acesso negado</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Seu papel na equipe não dá acesso a esta página. Peça ao administrador da barbearia, se precisar.
      </p>
      <Link href="/" className={buttonVariants()}>
        Voltar ao início
      </Link>
    </div>
  );
}
