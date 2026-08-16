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
  login: '1080 × 1440',
  registration: '1080 × 1440',
  forgot_password: '1080 × 1440',
  reset_link_sent: '1080 × 1440',
  reset_password: '1080 × 1440',
  thanks: '1600 × 520',
  logo: '512 × 512',
};

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

export function bannerSizeLabel(banner) {
  const { required } = bannerSizeParts(banner);
  return required || '—';
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
