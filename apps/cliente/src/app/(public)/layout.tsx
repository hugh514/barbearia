import type { ReactNode } from 'react';
import { VezLogo } from '@/components/layout/vez-logo';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-4 py-10">
      <VezLogo className="mb-6" />
      <p className="mb-8 text-base text-muted-foreground">
        Entre na fila da barbearia pelo celular e acompanhe sua vez.
      </p>
      {children}
    </div>
  );
}
