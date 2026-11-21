import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/http/server-fetch';
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

  // Resposta genérica (não revela se a conta existe), mas só quando a API
  // aceitou o pedido: limite ou falha não pode prometer um e-mail que não sai.
  const res = await apiFetch('/auth/forgot-password', { method: 'POST', body: parsed.data }).catch(
    () => null,
  );
  if (res?.status === 429) {
    return NextResponse.json(
      { statusCode: 429, error: 'Too Many Requests', message: 'Muitos pedidos agora. Tente de novo em um minuto.' },
      { status: 429 },
    );
  }
  if (!res || res.status >= 500) {
    return NextResponse.json(
      { statusCode: 502, error: 'Bad Gateway', message: 'Não foi possível enviar o link agora. Tente de novo.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
