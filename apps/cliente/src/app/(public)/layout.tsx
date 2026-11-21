import type { ReactNode } from 'react';
import { VezMark } from '@/components/layout/vez-logo';

function ScissorsArt() {
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden
      className="pointer-events-none absolute -right-20 -bottom-24 size-[22rem] rotate-[-18deg] opacity-[0.14] lg:-right-28 lg:-bottom-28 lg:size-[34rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinejoin="round"
    >
      <path d="M118 122 L226 20 C214 46 170 96 128 132 Z" />
      <path d="M118 122 L234 84 C212 104 166 126 128 136 Z" />
      <path d="M118 122 L74 160" />
      <path d="M124 134 L102 186" />
      <circle cx="58" cy="176" r="24" />
      <circle cx="94" cy="210" r="24" />
      <circle cx="122" cy="128" r="5" />
    </svg>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <header className="auth-band relative isolate overflow-hidden px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-16 text-primary-foreground lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div aria-hidden className="auth-stripes absolute inset-y-0 left-0 -z-10 w-2/3" />
        <ScissorsArt />
        <div className="flex items-center gap-2">
          <VezMark inverted className="size-8" />
          <span className="text-xl leading-none font-bold">Vez</span>
        </div>
        <p className="mt-8 max-w-[16ch] text-[28px] leading-[1.1] font-bold lg:mt-0 lg:text-5xl">
          Entre para ver sua vez na fila e seu plano.
        </p>
        <p className="hidden text-sm opacity-80 lg:block">
          Fila por ordem de chegada, sem marcar horário.
        </p>
      </header>
      <main className="relative -mt-8 px-4 pb-10 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:bg-card lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-[420px] rounded-lg border border-border bg-card p-5 sm:p-6 lg:border-0 lg:bg-transparent lg:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
