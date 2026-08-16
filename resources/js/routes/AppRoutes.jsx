import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import GuestRoute from '../components/auth/GuestRoute';
import { resolveCmsViewSlug } from '../utils/cmsSlugs';

// Lazy-load pages so register/CMS don't download the huge admin + charts bundle
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const RegisterSuccessPage = lazy(() => import('../pages/auth/RegisterSuccessPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const CmsPageView = lazy(() => import('../pages/CmsPageView'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));

const ADMIN_ROLES = ['admin'];

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#071A12] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#8DC63F]/30 border-t-[#8DC63F] rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#8DC63F] tracking-widest uppercase">Loading...</p>
      </div>
    </div>
  );
}

function getInitialView() {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path === '/admin/login' || path === '/login') return 'admin-login';
  if (path === '/register') return 'register';
  if (path === '/register/thanks' || path === '/register/success' || path === '/register-success') return 'register-thanks';
  if (path === '/forgot-password') return 'forgot-password';
  if (path.startsWith('/reset-password/')) return 'reset-password';
  if (path.startsWith('/pages/') || path === '/terms' || path === '/privacy' || path === '/privacy-policy' || path === '/terms-and-conditions' || path === '/faq' || path === '/refund-policy' || path === '/cookie-policy' || path === '/contact-us') return 'cms-page';
  if (path === '/admin' || path === '/admin/dashboard' || path === '/admin-dashboard' || (path.startsWith('/admin/') && path !== '/admin/login')) return 'admin-dashboard';

  return 'register';
}

function viewToUrl(view, data) {
  if (view === 'cms-page' || view.startsWith('pages/')) {
    const slug = resolveCmsViewSlug({ view, data });
    return `/pages/${slug}`;
  }
  switch (view) {
    case 'admin-login': return '/admin/login';
    case 'login': return '/admin/login';
    case 'register': return '/register';
    case 'register-thanks':
    case 'register-success': return '/register/thanks';
    case 'forgot-password': return '/forgot-password';
    case 'reset-password': return window.location.pathname;
    case 'terms': return '/pages/terms-and-conditions';
    case 'privacy': return '/pages/privacy-policy';
    case 'admin-dashboard': return '/admin/dashboard';
    default: return '/register';
  }
}

function RoutesContent({ currentView, viewData, navigate }) {
  if (currentView === 'admin-login' || currentView === 'login') {
    return (
      <GuestRoute onNavigate={navigate}>
        <LoginPage onNavigate={navigate} />
      </GuestRoute>
    );
  }

  if (currentView === 'register') {
    return (
      <GuestRoute onNavigate={navigate} redirectAdmins={false}>
        <RegisterPage onNavigate={navigate} />
      </GuestRoute>
    );
  }

  if (currentView === 'register-thanks' || currentView === 'register-success') {
    return <RegisterSuccessPage onNavigate={navigate} registrationData={viewData} />;
  }

  if (currentView === 'forgot-password') {
    return <ForgotPasswordPage onNavigate={navigate} />;
  }

  if (currentView === 'reset-password') {
    const token = window.location.pathname.split('/').pop();
    return <ResetPasswordPage onNavigate={navigate} initialToken={token} />;
  }

  if (currentView === 'cms-page' || currentView.startsWith('pages/') || currentView === 'terms' || currentView === 'privacy') {
    const slug = resolveCmsViewSlug({
      view: currentView,
      data: viewData,
      pathname: window.location.pathname,
    });
    return <CmsPageView slug={slug} onNavigate={navigate} />;
  }

  if (currentView.startsWith('admin')) {
    return (
      <ProtectedRoute allowedRoles={ADMIN_ROLES} onNavigate={navigate} redirectView="admin-dashboard">
        <AdminDashboardPage />
      </ProtectedRoute>
    );
  }

  return (
    <GuestRoute onNavigate={navigate} redirectAdmins={false}>
      <RegisterPage onNavigate={navigate} />
    </GuestRoute>
  );
}

export default function AppRoutes() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/register';
  const initialView = getInitialView();
  const [currentView, setCurrentView] = useState(initialView);
  const [viewData, setViewData] = useState(() => (
    initialView === 'cms-page' ? { slug: resolveCmsViewSlug({ view: initialView, pathname: initialPath }) } : null
  ));

  const navigate = useCallback((view, data = null) => {
    setCurrentView((prev) => (prev === view && !data ? prev : view));
    if (data) setViewData(data);
    const targetUrl = viewToUrl(view, data);
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ view, data }, '', targetUrl);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
        if (e.state.data) setViewData(e.state.data);
      } else {
        setCurrentView(getInitialView());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const currentUrl = viewToUrl(currentView, viewData);
    if (window.location.pathname !== currentUrl) {
      window.history.replaceState({ view: currentView, data: viewData }, '', currentUrl);
    }
  }, [currentView, viewData]);

  // Redirect legacy registration success URLs
  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path === '/register/success' || path === '/register-success') {
      window.history.replaceState(
        { view: 'register-thanks', data: viewData },
        '',
        '/register/thanks'
      );
    }
  }, [viewData]);

  // Fix legacy /pages/cms-page URLs (internal view name leaked into URL)
  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path === '/pages/cms-page') {
      const slug = resolveCmsViewSlug({ view: 'cms-page', pathname: path });
      window.history.replaceState({ view: 'cms-page', data: { slug } }, '', `/pages/${slug}`);
      setCurrentView('cms-page');
      setViewData({ slug });
    }
  }, []);

  // Redirect legacy /privacy and /terms URLs to canonical CMS paths
  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path === '/privacy' || path === '/terms') {
      const slug = path === '/privacy' ? 'privacy-policy' : 'terms-and-conditions';
      window.history.replaceState({ view: 'cms-page', data: { slug } }, '', `/pages/${slug}`);
      setCurrentView('cms-page');
      setViewData({ slug });
    }
  }, []);

  return (
    <AuthProvider onNavigate={navigate}>
      <Suspense fallback={<PageLoader />}>
        <RoutesContent currentView={currentView} viewData={viewData} navigate={navigate} />
      </Suspense>
    </AuthProvider>
  );
}
