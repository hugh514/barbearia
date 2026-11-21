const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function isTenantSlug(b: string | null | undefined): b is string {
  return typeof b === 'string' && SLUG.test(b);
}

export function slugFromLink(b: string | string[] | undefined): string | null {
  const slug = Array.isArray(b) ? b[0] : b;
  return isTenantSlug(slug) ? slug : null;
}

export function withTenant(href: string, slug: string | null | undefined): string {
  if (!slug) return href;
  return `${href}${href.includes('?') ? '&' : '?'}b=${encodeURIComponent(slug)}`;
}
