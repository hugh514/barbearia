import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          BM
        </div>
        <h1 className="text-2xl font-bold text-foreground">Clube Modelo</h1>
        <p className="text-sm text-muted-foreground">Clube de vantagens da barbearia</p>
      </div>
      {children}
    </div>
  );
}
