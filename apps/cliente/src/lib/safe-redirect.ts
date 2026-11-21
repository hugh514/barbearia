const ORIGIN = 'http://interno.invalid';

/**
 * Destino depois do login: só caminho interno. Resolve como o navegador faria
 * (que ignora tab, CR e LF e lê "/\" como "//") e só aceita se continuar na
 * mesma origem e, já resolvido (sem "." e ".."), começar com "/" sem ser "//".
 * Qualquer outra coisa vira a home, para o ?from= não virar redirecionamento
 * aberto.
 */
export function safeFrom(from: string | null | undefined): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return '/';
  if (/[\u0000-\u001f\\]/.test(from)) return '/';
  try {
    const url = new URL(from, ORIGIN);
    if (url.origin !== ORIGIN) return '/';
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith('//') || path.startsWith('/\\') ? '/' : path;
  } catch {
    return '/';
  }
}
