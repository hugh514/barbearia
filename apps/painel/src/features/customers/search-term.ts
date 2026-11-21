export function looksLikePhone(raw: string): boolean {
  const text = raw.trim();
  return /\d/.test(text) && /^[\d\s()+\-.]+$/.test(text);
}

/**
 * Termo de busca de cliente para a API. Telefone digitado com máscara vira só
 * dígitos (a API guarda o telefone sem máscara); nome segue como digitado.
 */
export function searchTerm(raw: string): string {
  return looksLikePhone(raw) ? raw.replace(/\D/g, '') : raw.trim();
}
