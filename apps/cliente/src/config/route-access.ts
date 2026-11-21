export const PUBLIC_ROUTES = [
  '/login',
  '/cadastro',
  '/forgot-password',
  '/reset-password',
] as const;

// Só estas mandam para a home quem já tem sessão. A troca de senha abre mesmo
// logado: o link do e-mail precisa funcionar em qualquer caso.
const SIGNED_OUT_ONLY = ['/login', '/cadastro'] as const;

function matches(routes: readonly string[], pathname: string): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function isPublicRoute(pathname: string): boolean {
  return matches(PUBLIC_ROUTES, pathname);
}

export function isSignedOutOnly(pathname: string): boolean {
  return matches(SIGNED_OUT_ONLY, pathname);
}
