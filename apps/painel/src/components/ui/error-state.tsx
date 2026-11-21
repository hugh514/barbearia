import type { ReactNode } from 'react';

export function ErrorState({ message, action }: { message: string; action: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive bg-destructive-soft px-4 py-3 text-sm text-destructive"
    >
      <span>{message}</span>
      {action}
    </div>
  );
}
