/**
 * Configuração de ambiente — SERVER ONLY.
 * Nunca importe este arquivo em código de cliente: `API_BASE_URL` e nomes de
 * cookie não devem vazar para o bundle. (Não usa prefixo NEXT_PUBLIC de propósito.)
 */
export const env = {
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
  cookies: {
    access: process.env.SESSION_COOKIE_ACCESS ?? 'bc_at',
    refresh: process.env.SESSION_COOKIE_REFRESH ?? 'bc_rt',
    // Última aparência da barbearia (cor, modo, nome). Não é sensível.
    theme: 'bc_theme',
  },
  // Barbearia usada no cadastro e no login quando o link não traz ?b=slug.
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG ?? 'barbearia-modelo',
  // Repassa o IP de quem chamou à API em X-Forwarded-For. Só ligue com um proxy
  // na frente que sobrescreva o cabeçalho e TRUST_PROXY na API; sem isso o IP é forjável.
  forwardClientIp: process.env.FORWARD_CLIENT_IP === 'true',
  // Cookie Secure em produção. Só COOKIE_SECURE=false, explícito, desliga (http local
  // do compose); qualquer outro valor mantém o padrão.
  cookieSecure:
    process.env.COOKIE_SECURE === 'false'
      ? false
      : process.env.NODE_ENV === 'production',
} as const;
