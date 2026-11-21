import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/http/server-fetch';
import { clearSessionCookies, readAccessToken, readRefreshToken } from '@/lib/auth/cookies';
import { resetPasswordSchema } from '@/features/auth/schemas';

const unavailable = () =>
  NextResponse.json(
    { statusCode: 502, error: 'Bad Gateway', message: 'Não foi possível trocar a senha agora. Tente de novo.' },
    { status: 502 },
  );

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, error: 'Bad Request', message: 'Dados inválidos' },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const res = await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  }).catch(() => null);
  if (!res || res.status >= 500) return unavailable();
  if (res.status === 401) {
    return NextResponse.json(
      { statusCode: 401, error: 'Unauthorized', message: 'Link vencido ou já usado.' },
      { status: 401 },
    );
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    return NextResponse.json(json ?? { message: 'Não foi possível trocar a senha.' }, {
      status: res.status,
    });
  }

  // Sessão aberta neste aparelho foi feita com a senha velha: sai dela também.
  const accessToken = await readAccessToken();
  const refreshToken = await readRefreshToken();
  if (!accessToken && !refreshToken) return NextResponse.json({ ok: true, signedOut: false });
  if (accessToken && refreshToken) {
    await apiFetch('/auth/logout', { method: 'POST', accessToken, body: { refreshToken } }).catch(() => null);
  }
  await clearSessionCookies();
  return NextResponse.json({ ok: true, signedOut: true });
}
