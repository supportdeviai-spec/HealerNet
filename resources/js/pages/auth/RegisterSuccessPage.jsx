import React, { useState, useEffect, useMemo } from 'react';
import CommunityGroupList, { mergeCommunityGroups } from '../../components/location/CommunityGroupList';
import { useCommunityGroups } from '../../hooks/useCommunityGroups';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { MapPin, Users, Sparkles, User, UserPlus } from 'lucide-react';

import { DEFAULT_BANNER_IMAGES, resolveBannerSrc } from '../../constants/bannerPages';
import HealerNetLogo from '../../components/auth/HealerNetLogo';

const DEFAULT_BANNER = DEFAULT_BANNER_IMAGES.thanks;
const REGISTRATION_STORAGE_KEY = 'healernet_registration';

function filterGroupsByCategory(groups, categoryId) {
  if (!categoryId || !groups?.length) return groups || [];
  const matched = groups.filter(
    (g) => !g.category_id || String(g.category_id) === String(categoryId)
  );
  return matched.length ? matched : groups;
}

function pickGroupsForThanks({ fetchedGroups, initialData, userData, categoryId }) {
  const merged = mergeCommunityGroups(
    initialData?.community_groups,
    fetchedGroups,
    initialData?.community,
    userData?.communities
  );
  return filterGroupsByCategory(merged, categoryId);
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
  const cityId = userData?.city_id || initialData?.user?.city_id;
  const categoryId = userData?.category_id || initialData?.user?.category_id;
  const { groups, loading: fetchingCommunity, error: groupsError } = useCommunityGroups(cityId);
  const [loading, setLoading] = useState(!initialData);
  const [bannerSrc, setBannerSrc] = useState(DEFAULT_BANNER);

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
        if (data?.data?.[0]) {
          setBannerSrc(resolveBannerSrc(data.data[0]) || DEFAULT_BANNER);
        }
      })
      .catch(() => {});
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

  const communityGroups = useMemo(
    () => pickGroupsForThanks({ fetchedGroups: groups, initialData, userData, categoryId }),
    [groups, initialData, userData, categoryId]
  );

  const countryName = userData?.country?.name || initialData?.country_name || '';
  const regionName = userData?.region?.name || userData?.state?.name || initialData?.region_name || initialData?.state_name || '';
  const cityName = userData?.city?.name || initialData?.city_name || '';
  const categoryName = userData?.category?.name || initialData?.category_name || 'Healthcare Professional';
  const locationLine = [cityName, regionName, countryName].filter(Boolean).join(', ');
  const firstName = (userData?.name || 'Member').split(' ')[0];
  const linkCount = communityGroups.filter((g) => g.whatsapp_url || g.whatsapp_link).length;

  const handleRegisterAnother = () => {
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    clearAuth();
    onNavigate?.('register');
  };

  return (
    <div className="min-h-[100dvh] bg-[#041610] flex items-start sm:items-center justify-center p-3 sm:p-5 md:p-8 font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img
          src={bannerSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top opacity-20 blur-sm scale-105"
          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_BANNER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#041610]/95 via-[#0A221A]/90 to-[#061812]/95" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[600px] bg-[#65A30D]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl my-2 sm:my-0 animate-fadeIn min-w-0">
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.65)] border border-[#D4AF37]/40 bg-[#0A221A]">
          <div className="relative h-44 sm:h-52 md:h-60 lg:h-72 overflow-hidden">
            <img
              src={bannerSrc}
              alt="HealerNet"
              sizes="(max-width: 768px) 100vw, 1024px"
              className="absolute inset-0 w-full h-full object-cover object-top"
              onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_BANNER; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A221A] via-[#0A221A]/55 to-[#0F382C]/25" />
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-2.5 mb-2 sm:mb-3 min-w-0">
                <HealerNetLogo size="sm" showText={false} />
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  Healer<span className="text-[#A3E635]">Net</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white leading-snug break-words">
                Thank You for Joining{' '}
                <span className="bg-gradient-to-r from-[#A3E635] to-[#E5C158] bg-clip-text text-transparent">
                  HealerNet
                </span>
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/85 max-w-lg leading-relaxed">
                Welcome, {firstName}! You&apos;re now part of our global evidence-based healing community.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-7 lg:p-8 space-y-5">
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
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Category</span>
                  <span className="font-bold text-[#A3E635] break-words">{categoryName}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-0.5">Mobile</span>
                  <span className="font-medium text-slate-300">{userData?.mobile || '—'}</span>
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

            {/* Community groups */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0F382C]/80 via-[#0B2E24]/90 to-[#061812] border border-[#D4AF37]/25 space-y-3.5">
              <div>
                <div className="flex items-center gap-2 text-[#E5C158] mb-1">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Connect · Collaborate · Heal</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">Join Your Local Community</h3>
                <p className="text-[11px] sm:text-xs text-emerald-100/75 mt-1 leading-relaxed">
                  As a <strong className="text-[#A3E635]">{categoryName}</strong>
                  {locationLine ? <> in <strong className="text-white">{locationLine}</strong></> : null}
                  , tap a group below to connect on WhatsApp.
                </p>
              </div>

              <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-black/20 border border-white/10">
                <Users size={15} className="text-[#A3E635] shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-200">
                  {groupsError
                    ? 'Could not load community groups. Please refresh or contact support.'
                    : !fetchingCommunity && !loading
                    ? (linkCount
                      ? `${linkCount} WhatsApp group link${linkCount > 1 ? 's' : ''} ready — tap to join`
                      : 'No WhatsApp group links are set up for your district yet')
                    : 'Loading community group links…'}
                </span>
              </div>

              <CommunityGroupList
                groups={communityGroups}
                loading={fetchingCommunity || loading}
                cityName={cityName}
                regionName={regionName}
                emptyMessage={groupsError
                  ? 'We could not load your local groups right now. Please try again in a few minutes.'
                  : 'Local WhatsApp groups for your district are being set up. We\'ll notify you when they\'re ready.'}
              />
            </div>

            <div className="pt-2 space-y-3">
              <p className="text-[11px] sm:text-xs text-center text-emerald-100/60 leading-relaxed">
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

        <p className="text-center text-[10px] text-emerald-200/40 mt-4 tracking-wide">
          © 2026 HealerNet · Evidence-Based Healing Network
        </p>
      </div>
    </div>
  );
}
