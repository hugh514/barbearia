/**
 * Configuração de ambiente — SERVER ONLY.
 * Nunca importe este arquivo em código de cliente: `API_BASE_URL` e nomes de
 * cookie não devem vazar para o bundle. (Não usa prefixo NEXT_PUBLIC de propósito.)
 */
export const env = {
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
  // URL da API vista pelo navegador (Socket.IO). No Docker difere de API_BASE_URL.
  apiPublicUrl:
    process.env.API_PUBLIC_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:3000',
  cookies: {
    access: process.env.SESSION_COOKIE_ACCESS ?? 'bb_at',
    refresh: process.env.SESSION_COOKIE_REFRESH ?? 'bb_rt',
    // Última aparência da barbearia (cor, modo, nome). Não é sensível.
    theme: 'vez_theme',
  },
  // Cookie Secure em produção. Só COOKIE_SECURE=false, explícito, desliga (http local
  // do compose); qualquer outro valor mantém o padrão.
  cookieSecure:
    process.env.COOKIE_SECURE === 'false'
      ? false
      : process.env.NODE_ENV === 'production',
} as const;
