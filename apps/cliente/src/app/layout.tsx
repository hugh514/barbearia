import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import { getServerSession } from '@/lib/auth/session';
import { getTenantTheme } from '@/lib/tenant-theme';
import { Providers } from './providers';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
});

export const metadata: Metadata = {
  title: { default: 'Vez', template: '%s | Vez' },
  description:
    'Entre na fila da barbearia pelo celular, acompanhe sua vez e assine um plano.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, theme] = await Promise.all([getServerSession(), getTenantTheme()]);
  return (
    <html
      lang="pt-BR"
      data-theme={theme.mode}
      style={theme.vars as CSSProperties}
      className={`${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <Providers user={session?.user ?? null}>{children}</Providers>
      </body>
    </html>
  );
}
