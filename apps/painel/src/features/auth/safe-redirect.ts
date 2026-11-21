const BASE = 'http://painel.invalid';

/**
 * Destino depois do login: só caminho interno, contra redirecionamento aberto.
 * O caminho é resolvido como o navegador resolveria ("/..//x" vira "//x",
 * "/\" vale como "//") e recusado se o resultado sair da origem.
 */
export function safeRedirect(from: string | null | undefined): string {
  if (!from || !from.startsWith('/') || /[\r\n\t\\]/.test(from)) return '/';
  let resolved: URL;
  try {
    resolved = new URL(from, BASE);
  } catch {
    return '/';
  }
  const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  if (resolved.origin !== BASE || path.startsWith('//') || path.startsWith('/\\')) return '/';
  return path;
}
