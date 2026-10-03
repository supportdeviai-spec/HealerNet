import React, { useState, useEffect, useMemo } from 'react';
import { mergeCommunityGroups } from '../../components/location/CommunityGroupList';
import { useCommunityGroups } from '../../hooks/useCommunityGroups';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { MapPin, Users, User, UserPlus, Check } from 'lucide-react';

import { DEFAULT_BANNER_IMAGES, resolveBannerSrc } from '../../constants/bannerPages';

const DEFAULT_BANNER = DEFAULT_BANNER_IMAGES.thanks;
const REGISTRATION_STORAGE_KEY = 'healernet_registration';

function filterGroupsByCategory(groups, categoryIds) {
  if (!categoryIds || !groups?.length) return groups || [];
  const ids = Array.isArray(categoryIds)
    ? categoryIds.map((id) => String(id))
    : [String(categoryIds)];
  if (!ids.length) return groups || [];
  const matched = groups.filter(
    (g) => !g.category_id || ids.includes(String(g.category_id))
  );
  return matched.length ? matched : groups;
}

function pickGroupsForThanks({ fetchedGroups, initialData, userData, categoryIds }) {
  const merged = mergeCommunityGroups(
    initialData?.community_groups,
    fetchedGroups,
    initialData?.community,
    userData?.communities
  );
  return filterGroupsByCategory(merged, categoryIds);
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

  const categoryList = useMemo(() => {
    // 1. Check if categories array exists on initialData or userData
    const list = initialData?.categories || userData?.categories;
    if (Array.isArray(list) && list.length > 0) {
      return list
        .map((c) => (typeof c === 'string' ? { name: c, id: c } : c))
        .filter((c) => c?.name);
    }

    // 2. Check if comma-separated category_name exists on initialData or userData
    const rawName = initialData?.category_name || userData?.category_name;
    if (rawName && typeof rawName === 'string') {
      const parts = rawName.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts.map((name, i) => ({ id: `cat-${i}`, name }));
      }
    }

    // 3. Fallback to single category object from user
    const single = userData?.category || initialData?.user?.category;
    if (single?.name) {
      return [single];
    }

    return [];
  }, [initialData, userData]);

  const categoryName = useMemo(() => {
    if (categoryList.length > 0) {
      return categoryList.map((c) => c.name).join(', ');
    }
    return (
      initialData?.category_name ||
      userData?.category_name ||
      userData?.category?.name ||
      initialData?.user?.category?.name ||
      'Healthcare Professional'
    );
  }, [categoryList, initialData, userData]);

  const categoryIds = useMemo(() => {
    if (Array.isArray(initialData?.category_ids) && initialData.category_ids.length) {
      return initialData.category_ids.map(String);
    }
    if (Array.isArray(userData?.category_ids) && userData.category_ids.length) {
      return userData.category_ids.map(String);
    }
    if (categoryList.length > 0) {
      const validIds = categoryList
        .map((c) => String(c.id || ''))
        .filter((id) => id && !id.startsWith('cat-'));
      if (validIds.length) return validIds;
    }
    const singleId = userData?.category_id || initialData?.user?.category_id;
    return singleId ? [String(singleId)] : [];
  }, [initialData, userData, categoryList]);

  const { groups, loading: fetchingCommunity, error: groupsError } = useCommunityGroups(cityId);
  const [loading, setLoading] = useState(!initialData);
  const [bannerSrc, setBannerSrc] = useState(DEFAULT_BANNER);
  const [banner, setBanner] = useState(null);

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
          setBanner(data.data[0]);
          setBannerSrc(resolveBannerSrc(data.data[0]) || DEFAULT_BANNER);
        }
      })
      .catch(() => { });
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
    () => pickGroupsForThanks({ fetchedGroups: groups, initialData, userData, categoryIds }),
    [groups, initialData, userData, categoryIds]
  );

  const countryName = userData?.country?.name || initialData?.country_name || '';
  const regionName = userData?.region?.name || userData?.state?.name || initialData?.region_name || initialData?.state_name || '';
  const cityName = userData?.city?.name || initialData?.city_name || '';
  const locationLine = [cityName, regionName, countryName].filter(Boolean).join(', ');
  const heading = banner?.title?.trim() || null;
  const lead = banner?.description?.trim() || null;

  const validCommunityGroups = useMemo(() => {
    return (communityGroups || []).filter((g) => g && (g.whatsapp_url || g.whatsapp_link));
  }, [communityGroups]);

  const groupLocation = [cityName, regionName].filter(Boolean).join(', ') || locationLine || 'Local Community';

  const handleRegisterAnother = () => {
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    clearAuth();
    onNavigate?.('register');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#051510] text-[#eef5ef] font-['Plus_Jakarta_Sans',system-ui,sans-serif] flex items-start sm:items-center justify-center p-0 min-[601px]:p-5 md:p-8 overflow-x-hidden selection:bg-[#a3e635] selection:text-[#051510]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      <div className="w-full max-w-[900px] mx-auto border-x-0 min-[601px]:border-x border-y min-[601px]:border border-[rgba(224,180,76,0.4)] rounded-none overflow-hidden bg-[#0a1f18] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.75)] animate-fadeIn">
        
        {/* 1) FULL BANNER HERO */}
        <section className="relative w-full overflow-hidden bg-[#051510] border-b border-[rgba(170,210,140,0.16)]">
          <img
            src={bannerSrc}
            alt="HealerNet Welcome Banner"
            width={1600}
            height={520}
            fetchPriority="high"
            className="w-full h-auto block"
            onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_BANNER; }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a1f18] to-transparent pointer-events-none"
            aria-hidden="true"
          />
        </section>

        {/* PAGE CONTENT CONTAINER */}
        <div className="p-[clamp(18px,4vw,36px)] space-y-6 sm:space-y-8">
          
          {/* 2) WELCOME BLOCK (centered) */}
          <header className="text-center pb-6 sm:pb-8 border-b border-[rgba(170,210,140,0.16)] space-y-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[13px] font-semibold text-[#a3e635] bg-[rgba(163,230,53,0.1)] border border-[rgba(163,230,53,0.3)]">
                <Check size={14} strokeWidth={2.5} className="text-[#a3e635]" />
                <span>Registration complete</span>
              </span>
            </div>

            <h1 className="text-[clamp(26px,4.4vw,40px)] font-extrabold text-[#eef5ef] leading-[1.15] tracking-[-0.025em]">
              {heading || 'Welcome to HealerNet'}
            </h1>

            <p className="text-[14px] sm:text-[15px] text-[#93ab9f] max-w-[46ch] mx-auto leading-relaxed">
              {lead || 'Join your local WhatsApp community and start collaborating with healers near you.'}
            </p>
          </header>

          {/* 3) YOUR PROFILE */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[15px] font-bold text-[#eef5ef]">
              <User size={18} strokeWidth={2} className="text-[#e0b44c]" />
              <span>Your profile</span>
            </div>

            <dl className="grid grid-cols-1 min-[521px]:grid-cols-2 rounded-none bg-[#0a1f18] border border-[rgba(170,210,140,0.16)] overflow-hidden">
              {/* Name */}
              <div className="px-[18px] py-[14px] border-b min-[521px]:border-r border-[rgba(170,210,140,0.16)]">
                <dt className="text-[12px] text-[#93ab9f] font-medium mb-1">Name</dt>
                <dd className="text-[15px] font-semibold text-[#eef5ef] [overflow-wrap:anywhere] break-words">
                  {userData?.name || '—'}
                </dd>
              </div>

              {/* Email */}
              <div className="px-[18px] py-[14px] border-b border-[rgba(170,210,140,0.16)]">
                <dt className="text-[12px] text-[#93ab9f] font-medium mb-1">Email</dt>
                <dd className="text-[15px] font-semibold text-[#eef5ef] [overflow-wrap:anywhere] break-all">
                  {userData?.email || '—'}
                </dd>
              </div>

              {/* Category */}
              <div className="px-[18px] py-[14px] border-b min-[521px]:border-r border-[rgba(170,210,140,0.16)]">
                <dt className="text-[12px] text-[#93ab9f] font-medium mb-1">
                  {categoryList.length > 1 ? 'Categories' : 'Category'}
                </dt>
                <dd className="text-[15px] font-semibold text-[#a3e635] [overflow-wrap:anywhere] break-words">
                  {categoryName || 'Healthcare Professional'}
                </dd>
              </div>

              {/* Mobile */}
              <div className="px-[18px] py-[14px] border-b border-[rgba(170,210,140,0.16)]">
                <dt className="text-[12px] text-[#93ab9f] font-medium mb-1">Mobile</dt>
                <dd className="text-[15px] font-semibold text-[#eef5ef] [overflow-wrap:anywhere]">
                  {userData?.mobile || '—'}
                </dd>
              </div>

              {/* Location (spans full width as the last row) */}
              <div className="col-span-1 min-[521px]:col-span-2 px-[18px] py-[14px]">
                <dt className="text-[12px] text-[#93ab9f] font-medium mb-1">Location</dt>
                <dd className="text-[15px] font-semibold text-[#eef5ef] [overflow-wrap:anywhere] break-words">
                  {locationLine || '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* 4) JOIN YOUR LOCAL COMMUNITY (WhatsApp groups) */}
          <section className="bg-[linear-gradient(180deg,#0e2a20,#0a1f18)] border border-[rgba(170,210,140,0.28)] rounded-none p-[clamp(18px,3vw,24px)] space-y-4">
            <div className="space-y-1">
              <h2 className="text-[clamp(18px,2.6vw,21px)] font-bold text-[#eef5ef]">
                Join your local community
              </h2>
              <p className="text-[14px] text-[#93ab9f] leading-relaxed">
                {categoryList.length > 1 ? (
                  <>
                    As a practitioner in <strong className="text-[#a3e635] font-semibold">{categoryName}</strong>
                  </>
                ) : (
                  <>
                    As a <strong className="text-[#a3e635] font-semibold">{categoryName}</strong>
                  </>
                )}
                {locationLine ? (
                  <>
                    {' '}in{' '}
                    <span className="text-[#eef5ef] font-semibold">
                      {cityName ? (regionName ? `${cityName}, ${regionName}` : cityName) : locationLine}
                    </span>
                  </>
                ) : null}
                , tap a group below to connect on WhatsApp.
              </p>
            </div>

            {fetchingCommunity || loading ? (
              <p className="text-[14px] text-[#93ab9f] italic py-2">
                Loading community group links…
              </p>
            ) : groupsError ? (
              <p className="text-[14px] text-[#93ab9f] italic py-2">
                We could not load your local groups right now. Please try again in a few minutes.
              </p>
            ) : validCommunityGroups.length === 0 ? (
              <p className="text-[14px] text-[#93ab9f] italic py-2">
                Local WhatsApp groups for your district are being set up. We'll notify you when they're ready.
              </p>
            ) : (
              <div className="space-y-3">
                {validCommunityGroups.map((group, idx) => (
                  <div
                    key={group.id || `${group.name}-${idx}`}
                    className="flex items-center gap-[14px] flex-wrap min-[521px]:flex-nowrap bg-[rgba(255,255,255,0.035)] border border-[rgba(170,210,140,0.16)] rounded-none p-[14px]"
                  >
                    <div className="w-[44px] h-[44px] shrink-0 rounded-none bg-[rgba(37,211,102,0.12)] text-[#25d366] flex items-center justify-center">
                      <Users size={20} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold text-[#eef5ef] break-words">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[13px] text-[#93ab9f] mt-0.5">
                        <MapPin size={13} strokeWidth={2} className="text-[#a3e635] shrink-0" />
                        <span className="truncate">{groupLocation}</span>
                      </div>
                    </div>
                    <a
                      href={group.whatsapp_url || group.whatsapp_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25d366] hover:bg-[#20ba5a] text-[#032a12] h-[46px] px-5 rounded-none font-bold text-[14px] inline-flex items-center justify-center shrink-0 w-full min-[521px]:w-auto min-[521px]:ml-auto transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b44c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1f18]"
                    >
                      Join WhatsApp group
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5) REGISTER ANOTHER ACCOUNT */}
          <section className="pt-2 space-y-3">
            <p className="text-[13px] text-[#93ab9f] text-center">
              Registering for someone else? Use a different email and mobile number.
            </p>
            <button
              type="button"
              onClick={handleRegisterAnother}
              className="w-full h-[52px] rounded-none bg-transparent border border-[rgba(170,210,140,0.28)] hover:bg-[rgba(163,230,53,0.06)] hover:border-[rgba(163,230,53,0.45)] text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b44c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#051510]"
            >
              <UserPlus size={18} strokeWidth={2} />
              <span>Register another account</span>
            </button>
          </section>
        </div>

        <footer className="text-center text-[11px] text-[#93ab9f]/50 py-4 border-t border-[rgba(170,210,140,0.1)]">
          © 2026 HealerNet · Evidence-Based Healing Network
        </footer>
      </div>
    </div>
  );
}
