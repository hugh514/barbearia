import type { ReactNode } from 'react';
import { VezLogo } from '@/components/layout/vez-logo';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <VezLogo className="mb-8" />
        {children}
      </div>
    </div>
  );
}
