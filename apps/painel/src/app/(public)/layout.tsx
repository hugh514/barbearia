import type { ReactNode } from 'react';
import { VezLogo, VezMark } from '@/components/layout/vez-logo';
import { SecureBadge } from '@/features/auth/components/secure-badge';

const BENEFITS = [
  'Quem chega entra na vez certa, sem papel de senha no balcão.',
  'O histórico e o plano de cada cliente aparecem na hora do corte.',
  'Assinaturas e pagamentos acompanhados no mesmo painel.',
];

/**
 * Desenho do painel de marca, só em traço: o símbolo da tesoura grande e
 * cortado pela borda, uma faixa de dentes de pente e listras diagonais de
 * poste de barbeiro. Usa currentColor (--brand-fg) com opacidade baixa.
 */
function BrandArt() {
  const blades = [
    '8.1,6.6 10.9,5.4 19.4,24.9 16.6,26.1',
    '23.9,6.6 21.1,5.4 12.6,24.9 15.4,26.1',
  ];
  const teeth = Array.from({ length: 34 }, (_, i) => 40 + i * 12);

  return (
    <svg
      aria-hidden
      viewBox="0 0 600 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <defs>
        <pattern
          id="vez-poste"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-35)"
        >
          <rect width="9" height="28" fill="currentColor" />
        </pattern>
        <radialGradient
          id="vez-poste-fade"
          gradientUnits="userSpaceOnUse"
          cx="600"
          cy="0"
          r="360"
        >
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="vez-poste-mask">
          <rect x="240" y="0" width="360" height="360" fill="url(#vez-poste-fade)" />
        </mask>
      </defs>

      <rect
        x="240"
        y="0"
        width="360"
        height="360"
        fill="url(#vez-poste)"
        mask="url(#vez-poste-mask)"
        opacity="0.07"
      />

      <g
        transform="translate(250 390) scale(19)"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        opacity="0.16"
      >
        {blades.map((points) => (
          <polygon key={points} points={points} strokeWidth={0.09} />
        ))}
        <circle cx="16" cy="21" r="2.5" strokeWidth={0.09} />
      </g>

      <g stroke="currentColor" opacity="0.14" strokeWidth="1.25">
        <line x1="34" y1="812" x2="446" y2="812" />
        {teeth.map((x, i) => (
          <line key={x} x1={x} y1="812" x2={x} y2={i % 2 ? 846 : 858} />
        ))}
      </g>
    </svg>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary bg-[linear-gradient(160deg,var(--brand)_0%,color-mix(in_srgb,var(--brand)_68%,black)_100%)] text-primary-foreground lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <BrandArt />
      <span className="relative inline-flex items-center gap-3">
        <VezMark inverse className="size-9" />
        <span className="text-2xl leading-none font-bold">Vez</span>
      </span>

      <div className="relative max-w-md pb-24">
        <p className="text-[2.5rem] leading-[1.08] font-extrabold text-balance font-stretch-condensed">
          Fila, clientes e planos da barbearia num lugar só.
        </p>
        <ul className="mt-8 space-y-3 text-base leading-relaxed opacity-90">
          {BENEFITS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-card lg:grid lg:grid-cols-[45fr_55fr]">
      <BrandPanel />
      <main className="flex min-h-dvh flex-col px-4 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col pt-6 lg:justify-center lg:pt-0">
          <VezLogo className="mb-10 lg:hidden" />
          {children}
        </div>
        <SecureBadge />
      </main>
    </div>
  );
}
