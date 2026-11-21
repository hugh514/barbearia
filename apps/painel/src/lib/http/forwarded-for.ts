import { isIP } from 'node:net';
import { env } from '@/lib/env';

/**
 * IP de quem chamou o BFF, para o limite por IP da API valer por pessoa e não
 * pelo servidor do painel. Só com FORWARD_CLIENT_IP=true: o Next mantém o
 * X-Forwarded-For que o navegador mandar, então sem um proxy na frente que
 * sobrescreva o cabeçalho qualquer um forja um IP por tentativa. Ligado, vale
 * o último endereço, o que o proxy da frente anotou; mesma regra do app
 * cliente (apps/cliente/src/lib/http/forwarded-for.ts).
 */
export function forwardedFor(request: Request, enabled = env.forwardClientIp): Record<string, string> {
  if (!enabled) return {};
  const last = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  const ip = last || request.headers.get('x-real-ip')?.trim();
  return ip && isIP(ip) ? { 'X-Forwarded-For': ip } : {};
}
