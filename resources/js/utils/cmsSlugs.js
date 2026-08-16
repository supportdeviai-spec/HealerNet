export const CMS_SLUG_ALIASES = {
  terms: 'terms-and-conditions',
  privacy: 'privacy-policy',
  'terms-conditions': 'terms-and-conditions',
};

/** Internal SPA view names — never valid CMS page slugs */
export const INVALID_CMS_SLUGS = new Set(['cms-page', '']);

export function resolveCmsSlug(slugOrPath) {
  if (!slugOrPath) return '';

  const clean = String(slugOrPath)
    .replace(/^\/pages\//, '')
    .replace(/^\//, '')
    .toLowerCase()
    .replace(/\/$/, '');

  const resolved = CMS_SLUG_ALIASES[clean] || clean;
  return INVALID_CMS_SLUGS.has(resolved) ? '' : resolved;
}

export function resolveCmsSlugFromPath(pathname = window.location.pathname) {
  const path = pathname.toLowerCase().replace(/\/$/, '') || '/';

  if (path === '/terms') return 'terms-and-conditions';
  if (path === '/privacy') return 'privacy-policy';

  if (path.startsWith('/pages/')) {
    return resolveCmsSlug(path.slice('/pages/'.length));
  }

  if (path.startsWith('/') && path.length > 1) {
    return resolveCmsSlug(path.slice(1));
  }

  return resolveCmsSlug(path);
}

/**
 * Resolve the CMS slug for routing from view name, optional data, or URL path.
 */
export function resolveCmsViewSlug({ view, data, pathname = window.location.pathname } = {}) {
  if (data?.slug) {
    const fromData = resolveCmsSlug(data.slug);
    if (fromData) return fromData;
  }

  if (view?.startsWith('pages/')) {
    const fromView = resolveCmsSlug(view.replace(/^pages\//, ''));
    if (fromView) return fromView;
  }

  const fromPath = resolveCmsSlugFromPath(pathname);
  if (fromPath) return fromPath;

  return 'privacy-policy';
}
