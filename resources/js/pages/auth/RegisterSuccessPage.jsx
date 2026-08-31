import React, { useState, useEffect } from 'react';
import CategoryCommunityGroupList from '../../components/location/CategoryCommunityGroupList';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { MapPin, Users, Sparkles, User, UserPlus } from 'lucide-react';

import { DEFAULT_BANNER_IMAGES, resolveBannerSrc } from '../../constants/bannerPages';
import HealerNetLogo from '../../components/auth/HealerNetLogo';

const DEFAULT_BANNER = DEFAULT_BANNER_IMAGES.thanks;
const REGISTRATION_STORAGE_KEY = 'healernet_registration';

function toAbsoluteAsset(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

function resolveCategoryCommunityGroups(initialData, userData) {
  const fromRegistration = initialData?.category_community_groups;
  if (Array.isArray(fromRegistration) && fromRegistration.length) {
    return fromRegistration;
  }

  const categories = userData?.categories?.length
    ? userData.categories
    : (userData?.category ? [userData.category] : []);

  return categories.map((category) => ({
    category_id: category.id,
    category_name: category.name,
    status: 'not_found',
    message: 'No WhatsApp group is currently available for this category.',
    name: null,
    whatsapp_url: null,
  }));
}

function ThanksPageHero({
  bannerSrc,
  banner,
  firstName,
  onBannerError,
  showBannerImage,
}) {
  const heading = banner?.title?.trim() || (
    <>
      Thank You for Joining{' '}
      <span className="bg-gradient-to-r from-[#A3E635] to-[#E5C158] bg-clip-text text-transparent">
        HealerNet
      </span>
    </>
  );
  const lead = banner?.description?.trim()
    || `Welcome, ${firstName}! You're now part of our global evidence-based healing community.`;

  return (
    <div className="relative w-full overflow-hidden bg-[#041610] min-h-[11.5rem] sm:min-h-[14rem] md:min-h-[16rem] lg:min-h-[18rem]">
      {showBannerImage && bannerSrc && (
        <>
          <img
            key={`${bannerSrc}-blur`}
            src={bannerSrc}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full scale-110 blur-2xl opacity-35 object-cover object-center"
            onError={onBannerError}
          />
          <img
            key={bannerSrc}
            src={bannerSrc}
            alt={banner?.title || 'HealerNet welcome banner'}
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
            onError={onBannerError}
          />
        </>
      )}

      {!showBannerImage && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#0B2E24] via-[#0F382C] to-[#041610]"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-[#041610]/55 via-[#0A221A]/82 to-[#0A221A]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#041610]/90 via-[#041610]/35 to-transparent" />

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-end p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-3 sm:mb-4 min-w-0">
          <HealerNetLogo size="sm" showText={false} />
          <span className="text-sm font-bold text-white tracking-tight truncate">
            Healer<span className="text-[#A3E635]">Net</span>
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight break-words max-w-3xl">
          {heading}
        </h1>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-emerald-100/90 max-w-2xl leading-relaxed">
          {lead}
        </p>
      </div>
    </div>
  );
}

function CategoryTags({ categories = [], fallbackLabel = '' }) {
  if (categories.length) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <span
            key={cat.id || cat.name}
            className="inline-flex items-center rounded-lg bg-[#65A30D]/15 border border-[#65A30D]/25 px-2 py-1 text-[11px] sm:text-xs font-semibold text-[#A3E635]"
          >
            {cat.name}
          </span>
        ))}
      </div>
    );
  }

  if (!fallbackLabel) return <span className="font-bold text-[#A3E635] break-words">—</span>;

  return <span className="font-bold text-[#A3E635] break-words">{fallbackLabel}</span>;
}

export default function RegisterSuccessPage({ registrationData, onNavigate }) {
  const { clearAuth } = useAuth();
  const [storedData] = useState(() => {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const initialData = registrationData || storedData;
  const [userData, setUserData] = useState(initialData?.user || null);
  const [loading, setLoading] = useState(!initialData);
  const [bannerSrc, setBannerSrc] = useState('');
  const [banner, setBanner] = useState(null);
  const [showBannerImage, setShowBannerImage] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState(
    resolveCategoryCommunityGroups(initialData, initialData?.user)
  );
  const [groupsError, setGroupsError] = useState('');

  useEffect(() => {
    if (!bannerSrc) {
      setShowBannerImage(false);
      return undefined;
    }

    let cancelled = false;
    setShowBannerImage(false);

    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setShowBannerImage(true);
    };
    probe.onerror = () => {
      if (!cancelled) setShowBannerImage(false);
    };
    probe.src = toAbsoluteAsset(bannerSrc);

    return () => {
      cancelled = true;
    };
  }, [bannerSrc]);

  useEffect(() => {
    if (registrationData) {
      sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(registrationData));
    }
  }, [registrationData]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/banners/thanks')
      .then(async (res) => {
        if (cancelled) return;
        const data = res.ok ? await res.json() : null;
        if (data && (data.status === 'success' || data.success) && Array.isArray(data.data) && data.data.length > 0) {
          const activeBanner = data.data[0];
          setBanner(activeBanner);
          const src = resolveBannerSrc(activeBanner) || DEFAULT_BANNER;
          if (src) setBannerSrc(src);
        } else if (!cancelled) {
          setBannerSrc(DEFAULT_BANNER);
        }
      })
      .catch(() => {
        if (!cancelled) setBannerSrc(DEFAULT_BANNER);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (userData) return;
    setLoading(true);
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
      try {
        setUserData(JSON.parse(storedUserStr));
      } catch (e) {
        console.error('Failed parsing stored user:', e);
      }
    }
    apiFetch('/auth/me')
      .then(async (res) => {
        const data = res.ok ? await res.json() : null;
        if (data?.user) setUserData(data.user);
      })
      .catch((err) => console.warn('Auth me fetch error:', err))
      .finally(() => setLoading(false));
  }, [userData]);

  useEffect(() => {
    if (Array.isArray(initialData?.category_community_groups) && initialData.category_community_groups.length) {
      return;
    }
    if (!userData) return;

    let cancelled = false;
    setGroupsError('');

    apiFetch('/user/category-community-groups')
      .then(async (res) => {
        if (cancelled) return;
        const data = res.ok ? await res.json() : null;
        if (Array.isArray(data?.data) && data.data.length) {
          setCategoryGroups(data.data);
        } else {
          setCategoryGroups(resolveCategoryCommunityGroups(initialData, userData));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGroupsError('Could not load community groups. Please refresh or contact support.');
          setCategoryGroups(resolveCategoryCommunityGroups(initialData, userData));
        }
      });

    return () => { cancelled = true; };
  }, [userData, initialData]);

  const countryName = userData?.country?.name || initialData?.country_name || '';
  const regionName = userData?.region?.name || userData?.state?.name || initialData?.region_name || initialData?.state_name || '';
  const cityName = userData?.city?.name || initialData?.city_name || '';
  const userCategories = userData?.categories?.length
    ? userData.categories
    : (userData?.category ? [userData.category] : []);
  const categoryName = userCategories.map((cat) => cat.name).join(', ')
    || initialData?.category_name
    || userData?.category?.name
    || '';
  const locationLine = [cityName, regionName, countryName].filter(Boolean).join(', ');
  const firstName = (userData?.name || 'Member').split(' ')[0];
  const linkCount = categoryGroups.filter((g) => g.whatsapp_url).length;

  const handleBannerError = () => {
    setShowBannerImage(false);
  };

  const handleRegisterAnother = () => {
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    clearAuth();
    onNavigate?.('register');
  };

  return (
    <div className="min-h-[100dvh] bg-[#041610] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#041610] via-[#0A221A] to-[#061812]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[min(600px,70vh)] bg-[#65A30D]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl my-2 sm:my-4 animate-fadeIn min-w-0">
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.65)] border border-[#D4AF37]/40 bg-[#0A221A]">
          <ThanksPageHero
            bannerSrc={bannerSrc}
            banner={banner}
            firstName={firstName}
            onBannerError={handleBannerError}
            showBannerImage={showBannerImage}
          />

          <div className="p-4 sm:p-6 lg:p-8 space-y-5">
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#E5C158] flex items-center gap-1.5">
                <User size={12} /> Your Profile
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs p-4 rounded-2xl bg-[#071812]/80 border border-white/5">
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Name</span>
                  <span className="font-bold text-white break-words">{userData?.name || '—'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Email</span>
                  <span className="font-medium text-slate-300 break-all">{userData?.email || '—'}</span>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">Categories</span>
                  <CategoryTags categories={userCategories} fallbackLabel={categoryName} />
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Mobile</span>
                  <span className="font-medium text-slate-300 break-all">{userData?.mobile || '—'}</span>
                </div>
                {locationLine && (
                  <div className="sm:col-span-2 pt-2 border-t border-white/5">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1 mb-1">
                      <MapPin size={10} className="text-[#65A30D]" /> Location
                    </span>
                    <p className="text-sm font-bold text-white break-words">{locationLine}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0F382C]/80 via-[#0B2E24]/90 to-[#061812] border border-[#D4AF37]/25 space-y-3.5">
              <div>
                <div className="flex items-center gap-2 text-[#E5C158] mb-1">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Connect · Collaborate · Heal</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">Join Your Local Community</h3>
                <p className="text-[11px] sm:text-xs text-emerald-100/75 mt-1 leading-relaxed">
                  For each of your selected specialties
                  {locationLine ? <> in <strong className="text-white">{locationLine}</strong></> : null}
                  , join the matching WhatsApp group below.
                </p>
              </div>

              <div className="flex items-start gap-2 py-2.5 px-3 rounded-xl bg-black/20 border border-white/10">
                <Users size={15} className="text-[#A3E635] shrink-0 mt-0.5" />
                <span className="text-[11px] sm:text-xs text-slate-200 leading-relaxed">
                  {groupsError
                    ? groupsError
                    : !loading
                    ? (linkCount
                      ? `${linkCount} WhatsApp group link${linkCount > 1 ? 's' : ''} ready — tap to join`
                      : 'No WhatsApp group links are available for your selected categories in this district yet')
                    : 'Loading community group links…'}
                </span>
              </div>

              <CategoryCommunityGroupList
                items={categoryGroups}
                loading={loading}
                cityName={cityName}
                regionName={regionName}
              />
            </div>

            <div className="pt-2 space-y-3">
              <p className="text-[11px] sm:text-xs text-center text-emerald-100/60 leading-relaxed px-2">
                Registering for someone else? Use a different email and mobile number.
              </p>
              <button
                type="button"
                onClick={handleRegisterAnother}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0F382C] via-[#145240] to-[#65A30D] hover:from-[#09261E] hover:to-[#558B2F] text-white font-bold text-sm shadow-lg shadow-[#0F382C]/30 transition-all"
              >
                <UserPlus size={16} />
                Register Another Account
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-emerald-200/40 mt-4 tracking-wide px-2">
          © 2026 HealerNet · Evidence-Based Healing Network
        </p>
      </div>
    </div>
  );
}
