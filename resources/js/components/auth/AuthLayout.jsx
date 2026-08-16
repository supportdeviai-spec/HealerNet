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
    <div className="min-h-[100dvh] w-full bg-[#FAF8F5] dark:bg-[#061812] flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 font-sans selection:bg-[#65A30D] selection:text-white">
      <div className="w-full max-w-7xl min-h-0 md:min-h-[640px] lg:min-h-[720px] rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0A221A] border border-[#D4AF37]/30 dark:border-[#1C4E3D] shadow-[0_25px_60px_-15px_rgba(15,56,44,0.25)] overflow-hidden grid grid-cols-1 md:grid-cols-12">

        {/* Banner panel: short on mobile, side column on tablet/desktop */}
        <div
          className="
            md:col-span-5 relative flex flex-col justify-between overflow-hidden text-white
            bg-gradient-to-b from-[#0B2E24] via-[#0F382C] to-[#041610]
            border-b md:border-b-0 md:border-r border-[#D4AF37]/25
            h-[200px] sm:h-[260px] md:h-auto md:min-h-full
            max-h-[38vh] sm:max-h-[42vh] md:max-h-none
          "
        >
          {showDynamicBanner ? (
            <div className="relative w-full h-full min-h-full flex items-end justify-center p-4 sm:p-5 md:p-6 animate-fadeIn">
              {loadingBanner && (
                <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#0B2E24]/40 via-[#0F382C]/20 to-[#041610]/40 animate-pulse" />
              )}
              <img
                key={absoluteBannerSrc}
                src={absoluteBannerSrc}
                alt={banner?.title || 'HealerNet banner'}
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 42vw, 533px"
                className="absolute inset-0 w-full h-full object-cover object-[center_30%] sm:object-center md:object-center transition-opacity duration-700"
                onError={() => setImgError(true)}
              />
              {/* Readable fade over banner on small screens */}
              <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 md:h-24 bg-gradient-to-t from-[#041610]/70 to-transparent pointer-events-none" />
              {bannersList.length > 1 && (
                <div className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 mb-1">
                  {bannersList.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        i === bannerIndex ? 'w-5 sm:w-6 bg-[#E5C158]' : 'w-1.5 sm:w-2 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 sm:p-8 lg:p-12 flex flex-col justify-between h-full min-h-full">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 bg-[#65A30D]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 hidden md:flex items-center justify-between">
                <HealerNetLogo size="sm" showText={true} />
                <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#E5C158] text-[11px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-md">
                  Enterprise Network
                </span>
              </div>

              <div className="relative z-10 my-4 md:my-6 flex flex-col items-center text-center px-2">
                <div className="mb-3 md:mb-5 relative group">
                  <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#65A30D] to-[#0F382C] blur-md opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse" />
                  <HealerNetLogo size="hero" showText={false} />
                </div>

                <div className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-[#D4AF37]/40 backdrop-blur-md text-[#E5C158] text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-3 shadow-inner">
                  <span>CONNECT</span>
                  <span className="text-[#84CC16]">•</span>
                  <span>COLLABORATE</span>
                  <span className="text-[#84CC16]">•</span>
                  <span>HEAL</span>
                  <span className="text-[#84CC16]">•</span>
                  <span>TRANSFORM</span>
                </div>

                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Global Network for <br />
                  <span className="bg-gradient-to-r from-[#A3E635] via-[#E5C158] to-[#84CC16] bg-clip-text text-transparent">
                    Evidence-Based Healing
                  </span>
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-emerald-100/80 leading-relaxed max-w-sm hidden sm:block">
                  Empowering healthcare practitioners, clinical researchers, and holistic care networks with AI tools.
                </p>

                <div className="hidden md:grid grid-cols-2 gap-2.5 w-full mt-6 text-left">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="text-[#A3E635] text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#65A30D]" />
                      Verified Access
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">Sanctum RBAC Security</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="text-[#E5C158] text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                      Clinical Network
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">Evidence & Community</div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-3 border-t border-white/10 hidden md:flex items-center justify-between text-[11px] text-emerald-200/60">
                <span>© 2026 HealerNet Platform</span>
                <span className="font-semibold text-[#E5C158]">Evidence-Based</span>
              </div>
            </div>
          )}
        </div>

        {/* Form panel */}
        <div className="md:col-span-7 p-5 sm:p-8 md:p-10 lg:p-14 flex flex-col justify-center bg-[#FAF8F5]/60 dark:bg-[#0A221A]/60 backdrop-blur-sm">
          <div className={`w-full mx-auto ${isRegister ? 'max-w-lg' : 'max-w-md'}`}>
            <div className="md:hidden mb-5 flex justify-center">
              <HealerNetLogo size="md" showText={true} />
            </div>

            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F382C] dark:text-white tracking-tight leading-tight">
                {title}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-emerald-200/80 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
