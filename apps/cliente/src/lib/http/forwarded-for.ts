import { isIP } from 'node:net';

/**
 * IP de quem chamou o BFF, para a API aplicar o limite por pessoa e não por
 * servidor do Next. Só com FORWARD_CLIENT_IP=true: o Next mantém o
 * X-Forwarded-For que o navegador manda, então sem um proxy na frente que
 * sobrescreva o cabeçalho qualquer um forja um IP novo a cada tentativa.
 * Ligado, vale o último endereço, o que o proxy da frente anotou (o mesmo que
 * a API lê com TRUST_PROXY=1).
 */
export function forwardedFor(headers: Headers, enabled: boolean): string | null {
  if (!enabled) return null;
  const last = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  const ip = last || headers.get('x-real-ip')?.trim();
  return ip && isIP(ip) ? ip : null;
}
