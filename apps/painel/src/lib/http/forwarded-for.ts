import { env } from '@/lib/env';

/**
 * IP de quem chamou o BFF, para o limite por IP da API valer por pessoa e não
 * pelo servidor do painel. Só ligue (FORWARD_CLIENT_IP=true) com um proxy de
 * borda na frente do painel que acrescente o IP real ao cabeçalho: o Next
 * mantém o X-Forwarded-For que o navegador mandar, e sem a borda qualquer um
 * forja um IP por tentativa de login. A API também precisa de TRUST_PROXY.
 */
export function forwardedFor(request: Request, enabled = env.forwardClientIp): Record<string, string> {
  const value = enabled ? request.headers.get('x-forwarded-for') : null;
  return value ? { 'X-Forwarded-For': value } : {};
}
