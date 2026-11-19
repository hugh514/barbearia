import { NextResponse, type NextRequest } from 'next/server';
import { sessionFromToken } from '@/lib/auth/jwt';
import { isPublicRoute } from '@/config/route-access';
import { env } from '@/lib/env';

/** Proxy (middleware Next 16): protege rotas do cliente. */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get(env.cookies.access)?.value;
  const refreshToken = request.cookies.get(env.cookies.refresh)?.value;
  const session = sessionFromToken(accessToken);
  const maybeAuth = Boolean(session) || Boolean(refreshToken);

  if (isPublicRoute(pathname)) {
    if (session) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!maybeAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
