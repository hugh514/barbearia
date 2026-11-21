import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/http/server-fetch';
import { setSessionCookies } from '@/lib/auth/cookies';
import { sessionFromToken } from '@/lib/auth/jwt';
import { registerClientSchema, tokenPairSchema } from '@/features/auth/schemas';
import { fetchAppearance, forgetAppearance, rememberAppearance } from '@/lib/tenant-theme';

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = registerClientSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 },
      { status: 400 },
    );
  }

  const res = await apiFetch('/auth/register-client', {
    method: 'POST',
    body: parsed.data,
  });
  const json = await res.json().catch(() => null);
  // Erro interno da API não chega à tela (pode trazer detalhe do banco).
  if (res.status >= 500) {
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Não foi possível criar a conta agora. Tente de novo.', statusCode: 502 },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(json ?? { message: 'Falha no cadastro' }, {
      status: res.status,
    });
  }

  const tokens = tokenPairSchema.safeParse(json);
  if (!tokens.success) {
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Resposta inesperada', statusCode: 502 },
      { status: 502 },
    );
  }

  await setSessionCookies(tokens.data.accessToken, tokens.data.refreshToken);
  const appearance = await fetchAppearance(tokens.data.accessToken);
  if (appearance) await rememberAppearance(appearance);
  else await forgetAppearance();
  const session = sessionFromToken(tokens.data.accessToken);
  return NextResponse.json({ user: session?.user ?? null }, { status: 201 });
}
