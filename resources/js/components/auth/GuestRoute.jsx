import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserRoleSlug } from '../../utils/authSession';

export default function GuestRoute({ children, onNavigate, redirectAdmins = true }) {
  const { user, isAuthenticated, isLoading, authReady } = useAuth();
  const userRole = getUserRoleSlug(user);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!redirectAdmins || !authReady || isLoading || !isAuthenticated || !isAdmin || !onNavigate) {
      return;
    }
    onNavigate('admin-dashboard');
  }, [redirectAdmins, authReady, isLoading, isAuthenticated, isAdmin, onNavigate]);

  if (redirectAdmins && (!authReady || isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071A12] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8DC63F]/30 border-t-[#8DC63F] rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#8DC63F] tracking-widest uppercase">
            Checking session...
          </p>
        </div>
      </div>
    );
  }

  if (redirectAdmins && isAuthenticated && isAdmin) {
    return null;
  }

  return children;
}
