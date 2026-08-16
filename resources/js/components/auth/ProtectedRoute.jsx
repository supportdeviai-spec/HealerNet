import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserRoleSlug, savePostLoginRedirect } from '../../utils/authSession';

export default function ProtectedRoute({ children, allowedRoles = [], onNavigate, redirectView = 'admin-dashboard' }) {
  const { user, permissions, isAuthenticated, isLoading, authReady } = useAuth();
  const didRedirect = useRef(false);

  const userRole = getUserRoleSlug(user);
  const canAccessAdmin = userRole === 'admin' || (permissions || []).includes('access_admin');

  useEffect(() => {
    if (!authReady || isLoading) return;

    if (!isAuthenticated) {
      if (!didRedirect.current) {
        didRedirect.current = true;
        savePostLoginRedirect(redirectView);
        onNavigate?.('admin-login');
      }
      return;
    }

    didRedirect.current = false;

    if (allowedRoles.length > 0 && !canAccessAdmin && !allowedRoles.includes(userRole)) {
      onNavigate?.(canAccessAdmin ? 'admin-dashboard' : 'register');
    }
  }, [authReady, isLoading, isAuthenticated, userRole, canAccessAdmin, allowedRoles, onNavigate, redirectView]);

  if (!authReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071A12] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8DC63F]/30 border-t-[#8DC63F] rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#8DC63F] tracking-widest uppercase">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles.length > 0 && !canAccessAdmin && !allowedRoles.includes(userRole)) {
    return null;
  }

  return children;
}
