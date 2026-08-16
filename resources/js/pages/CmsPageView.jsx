import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import HealerNetLogo from '../components/auth/HealerNetLogo';
import { resolveCmsViewSlug } from '../utils/cmsSlugs';

export default function CmsPageView({ slug: initialSlug, onNavigate }) {
  const activeSlug = resolveCmsViewSlug({
    data: initialSlug ? { slug: initialSlug } : null,
    pathname: window.location.pathname,
  });

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError(null);
      setPageData(null);

      try {
        const res = await apiFetch(`/pages/${encodeURIComponent(activeSlug)}`);

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json.message || `Unable to load page (HTTP ${res.status}).`);
        }

        if (json.status !== 'success' || !json.page) {
          throw new Error(json.message || 'Invalid CMS response.');
        }

        if (!cancelled) {
          setPageData(json.page);
          document.title = json.page.meta_title || `${json.page.title} — HealerNet`;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load page content.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#061812] text-slate-800 dark:text-slate-100 p-4 sm:p-8 font-sans">
      <header className="fixed top-0 inset-x-0 h-16 bg-white/90 dark:bg-[#061812]/90 backdrop-blur-md border-b border-[#D4AF37]/20 z-50 flex items-center px-6 shadow-sm">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('register')}
            className="text-left"
          >
            <HealerNetLogo size="sm" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('register')}
            className="px-4 py-2 rounded-xl bg-[#0F382C] dark:bg-[#D4AF37] text-white dark:text-[#061812] text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
          >
            Register Now
          </button>
        </div>
      </header>

      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#0A221A] rounded-3xl border border-[#D4AF37]/30 p-6 sm:p-10 shadow-xl">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0F382C] border-t-transparent dark:border-[#D4AF37]" />
              <div className="text-sm font-medium text-slate-500">Loading page...</div>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-4">
              <h2 className="text-2xl font-bold text-[#0F382C] dark:text-white">Content unavailable</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
              <p className="text-xs text-slate-400">
                Make sure the page is published in Admin → CMS and the database is seeded.
              </p>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('register')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#0F382C] text-white text-xs font-bold hover:opacity-90"
              >
                Back to Registration
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-[#0F382C]/10 dark:border-[#1E4E3D] pb-6 mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F382C] dark:text-white font-serif">
                  {pageData.title}
                </h1>
                <p className="text-xs text-slate-500 dark:text-emerald-200/70 mt-2">
                  Last updated:{' '}
                  {pageData.updated_at
                    ? new Date(pageData.updated_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Recently'}
                </p>
              </div>

              <div
                className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4 font-sans cms-content"
                dangerouslySetInnerHTML={{
                  __html: pageData.content || '<p>No content published for this page yet.</p>',
                }}
              />

              <div className="border-t border-[#0F382C]/10 dark:border-[#1E4E3D] pt-6 mt-10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('register')}
                  className="px-4 py-2 rounded-xl bg-[#0F382C] dark:bg-[#D4AF37] text-white dark:text-[#061812] text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  ← Back to Registration
                </button>
                <span className="text-xs text-slate-400">© 2026 HealerNet Platform</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
