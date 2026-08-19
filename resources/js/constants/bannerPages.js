export const BANNER_PAGE_OPTIONS = [
  { value: 'login', label: 'Login Page' },
  { value: 'registration', label: 'Registration Page' },
  { value: 'forgot_password', label: 'Forgot Password Page' },
  { value: 'reset_link_sent', label: 'Reset Link Sent Page' },
  { value: 'reset_password', label: 'Reset Password Page' },
  { value: 'thanks', label: 'Thank You / Success Page' },
  { value: 'logo', label: 'Site Logo (all auth pages)' },
];

export const BANNER_PAGE_LABELS = Object.fromEntries(
  BANNER_PAGE_OPTIONS.map((option) => [option.value, option.label])
);

/** Required upload dimensions (width × height) for sharp display on each page. */
export const BANNER_RECOMMENDED_SIZES = {
  login: '1080 × 1480',
  registration: '1080 × 1480',
  forgot_password: '1080 × 1480',
  reset_link_sent: '1080 × 1480',
  reset_password: '1080 × 1480',
  thanks: '1600 × 520',
  logo: '512 × 512',
};

/** Same 1080:1480 ratio — use when a sharper desktop source is needed. */
export const BANNER_HIGH_RES_SIZE = '1440 × 1973';

/**
 * Size column: required upload size for admins, plus current file size when known.
 */
export function bannerSizeParts(banner) {
  const required = banner?.recommended_size || BANNER_RECOMMENDED_SIZES[banner?.page] || null;
  const current = banner?.size || null;
  return {
    required: required ? `${required} px` : null,
    current: current ? `${current} px` : null,
  };
}

function normalizeSize(value) {
  return String(value || '')
    .replace(/\s/g, '')
    .replace(/px/gi, '');
}

/** True when the uploaded file matches the required size (or the 1080:1480 high-res option). */
export function bannerSizeIsCorrect(banner) {
  const page = banner?.page;
  const current = banner?.size;
  if (!page || !current) return null;
  const required = BANNER_RECOMMENDED_SIZES[page];
  const currentNorm = normalizeSize(current);
  if (currentNorm === normalizeSize(required)) return true;
  if (required === '1080 × 1480' && currentNorm === normalizeSize(BANNER_HIGH_RES_SIZE)) return true;
  return false;
}

export function bannerSizeLabel(banner) {
  const { required, current } = bannerSizeParts(banner);
  if (required && current) return `${required} (uploaded ${current})`;
  return required || current || '—';
}

export const DEFAULT_BANNER_IMAGES = {
  login: '/banner/login-banner.png',
  registration: '/banner/sign-banner.png',
  forgot_password: '/banner/login-banner.png',
  reset_link_sent: '/banner/login-banner.png',
  reset_password: '/banner/login-banner.png',
  thanks: '/banner/sign-banner.png',
  logo: '/images/logo.png',
};

export function resolveBannerSrc(banner) {
  let path = banner?.image_url || banner?.image || '';
  if (!path) return '';

  // Prefer relative paths so Vite proxies /banner and /storage correctly.
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const parsed = new URL(path);
      path = `${parsed.pathname}${parsed.search}`;
    } catch {
      return path;
    }
  }

  return path.startsWith('/') ? path : `/${path}`;
}
