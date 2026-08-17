import React, { useState, useEffect, useMemo } from 'react';
import HealerNetLogo from './HealerNetLogo';
import { apiFetch } from '../../services/api';
import { DEFAULT_BANNER_IMAGES, resolveBannerSrc } from '../../constants/bannerPages';

function toAbsoluteAsset(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

export default function AuthLayout({ children, title, subtitle, page = 'login' }) {
  const defaultBannerSrc = DEFAULT_BANNER_IMAGES[page] || DEFAULT_BANNER_IMAGES.login;
  const [banner, setBanner] = useState(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannersList, setBannersList] = useState([]);
  const [bannerSrc, setBannerSrc] = useState(defaultBannerSrc);
  const [imgError, setImgError] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState(true);

  const absoluteBannerSrc = useMemo(() => toAbsoluteAsset(bannerSrc), [bannerSrc]);

  useEffect(() => {
    let isMounted = true;
    setLoadingBanner(true);
    setImgError(false);
    setBannerSrc(defaultBannerSrc);
    setBannersList([]);
    setBanner(null);
    setBannerIndex(0);

    apiFetch(`/banners/${page}`)
      .then(async (res) => {
        if (!isMounted) return;
        const data = res.ok ? await res.json() : null;
        if (data && (data.status === 'success' || data.success) && Array.isArray(data.data) && data.data.length > 0) {
          setBannersList(data.data);
          setBanner(data.data[0]);
          setBannerSrc(resolveBannerSrc(data.data[0]) || defaultBannerSrc);
        }
      })
      .catch((err) => {
        console.warn('Banner fetch error, using default banner image:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingBanner(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, defaultBannerSrc]);

  useEffect(() => {
    if (!absoluteBannerSrc || imgError) return undefined;

    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setImgError(false);
    };
    probe.onerror = () => {
      if (cancelled) return;
      setImgError(true);
    };
    probe.src = absoluteBannerSrc;

    return () => {
      cancelled = true;
    };
  }, [absoluteBannerSrc, bannerSrc, imgError]);

  useEffect(() => {
    if (bannersList.length <= 1) return undefined;
    const interval = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % bannersList.length;
        setBanner(bannersList[next]);
        setBannerSrc(resolveBannerSrc(bannersList[next]) || defaultBannerSrc);
        setImgError(false);
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [bannersList, defaultBannerSrc]);

  const showDynamicBanner = !imgError && Boolean(absoluteBannerSrc) && page !== 'logo';
  const isRegister = page === 'registration';

  return (
    <div
      className={`min-h-[100dvh] w-full bg-[#061812] text-white font-sans selection:bg-[#65A30D] selection:text-white flex justify-center px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 ${
        isRegister ? 'items-start' : 'items-center'
      }`}
    >
      <div
        className={`w-full rounded-2xl sm:rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-[#0A221A] border border-white/10 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] ${
          isRegister
            ? 'max-w-6xl'
            : 'max-w-[1360px] lg:h-[calc(100dvh-2.5rem)] lg:min-h-[560px]'
        }`}
      >
        <aside className="relative bg-[#041610] h-[210px] sm:h-[250px] lg:h-auto lg:min-h-full lg:col-span-5 overflow-hidden">
          {showDynamicBanner ? (
            <>
              {loadingBanner && (
                <div className="absolute inset-0 z-20 bg-[#0F382C]/50 animate-pulse" />
              )}
              <img
                key={absoluteBannerSrc}
                src={absoluteBannerSrc}
                alt={banner?.title || 'HealerNet banner'}
                sizes="(max-width: 1023px) 100vw, 42vw"
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={() => setImgError(true)}
              />
              {bannersList.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                  {bannersList.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === bannerIndex ? 'w-5 bg-[#E5C158]' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#0B2E24] to-[#041610]">
              <HealerNetLogo size="lg" showText={false} />
              <p className="mt-4 text-sm text-emerald-100/80 text-center max-w-xs hidden lg:block">
                Global Network for Evidence-Based Healing
              </p>
            </div>
          )}
        </aside>

        <section className={`min-w-0 bg-[#0B1A14] lg:col-span-7 flex flex-col p-5 sm:p-7 lg:p-8 ${isRegister ? '' : 'lg:justify-center xl:p-10'}`}>
          <div className={`w-full min-w-0 ${isRegister ? 'max-w-2xl' : 'max-w-[400px] lg:mx-auto'}`}>
            <div className="mb-6 lg:mb-7">
              <h2 className="text-2xl sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-snug">
                {title}
              </h2>
              <p className="mt-2 text-sm text-emerald-200/70 leading-relaxed">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
