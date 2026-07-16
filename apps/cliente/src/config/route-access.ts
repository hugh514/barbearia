export const PUBLIC_ROUTES = ['/login', '/cadastro'] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}
