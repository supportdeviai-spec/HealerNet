import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { DEFAULT_BANNER_IMAGES, resolveBannerSrc } from '../constants/bannerPages';

const FALLBACK_LOGO = DEFAULT_BANNER_IMAGES.logo;
const FALLBACK_LOGO_ALT = '/assest/immage/logo.png';

export function useSiteLogo() {
  const [logoSrc, setLogoSrc] = useState(FALLBACK_LOGO);

  useEffect(() => {
    let cancelled = false;

    apiFetch('/banners/logo')
      .then(async (res) => {
        if (cancelled) return;
        const data = res.ok ? await res.json() : null;
        const banner = data?.data?.[0];
        if (banner) {
          setLogoSrc(resolveBannerSrc(banner) || FALLBACK_LOGO);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const onLogoError = (event) => {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === '1') {
      img.style.display = 'none';
      return;
    }
    img.dataset.fallbackApplied = '1';
    img.src = img.src.includes('/images/logo.png') ? FALLBACK_LOGO_ALT : FALLBACK_LOGO;
  };

  return { logoSrc, onLogoError };
}
