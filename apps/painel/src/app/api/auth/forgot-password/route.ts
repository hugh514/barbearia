import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/http/server-fetch';
import { forwardedFor } from '@/lib/http/forwarded-for';
import { forgotPasswordSchema } from '@/features/auth/schemas';

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, error: 'Bad Request', message: 'E-mail inválido' },
      { status: 400 },
    );
  }

  // Resposta sempre genérica (não revela existência de conta).
  await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: parsed.data,
    headers: forwardedFor(request),
  }).catch(() => undefined);

  return NextResponse.json({ ok: true }, { status: 200 });
}
