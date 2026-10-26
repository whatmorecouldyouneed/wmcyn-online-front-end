// product landing pages live at /{slug}. a static page or public folder with the same name
// always wins over pages/[slug].tsx, so those names can't be used as product slugs.
// keep in sync with wmcyn-backend-infra/functions/src/services/productSlug.ts
export const RESERVED_SLUGS = [
  '404', 'accessibility', 'admin', 'api', 'ar', 'ar-session', 'cookies', 'cross-body-bag',
  'dashboard', 'debug', 'fonts', 'friends-and-family', 'index', 'login', 'pair', 'privacy', 'privacy-choices', 'qr',
  'session', 'shipping-returns', 'shop', 'shoulder-bag', 'terms', 'viewer',
  'models', 'patterns', 'static', '_next', 'p',
];

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
}

export function slugError(slug: string): string | null {
  if (!slug) return null;
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) {
    return 'slug must be 3-64 lowercase letters, numbers, or single dashes';
  }
  if (RESERVED_SLUGS.includes(slug)) return `"${slug}" is already a site page`;
  return null;
}
