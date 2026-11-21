import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/http/server-fetch';
import { setSessionCookies } from '@/lib/auth/cookies';
import { sessionFromToken } from '@/lib/auth/jwt';
import { fetchAppearance, forgetAppearance, rememberAppearance } from '@/lib/tenant-theme';
import { loginSchema, tokenPairSchema } from '@/features/auth/schemas';

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 },
      { status: 400 },
    );
  }

  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: parsed.data,
  });

  const json = await res.json().catch(() => null);
  // Erro interno da API não chega à tela (pode trazer detalhe do banco).
  if (res.status >= 500) {
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Não foi possível entrar agora. Tente de novo.', statusCode: 502 },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(json ?? { message: 'Falha no login' }, {
      status: res.status,
    });
  }

  const tokens = tokenPairSchema.safeParse(json);
  if (!tokens.success) {
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Resposta inesperada da API', statusCode: 502 },
      { status: 502 },
    );
  }

  await setSessionCookies(tokens.data.accessToken, tokens.data.refreshToken);
  // Guarda o tema da barbearia para o layout usar quando o token expirar. Sem
  // aparência, apaga o cookie para não ficar com o tema de outra barbearia.
  const appearance = await fetchAppearance(tokens.data.accessToken);
  if (appearance) await rememberAppearance(appearance);
  else await forgetAppearance();
  const session = sessionFromToken(tokens.data.accessToken);
  return NextResponse.json({ user: session?.user ?? null }, { status: 200 });
}
