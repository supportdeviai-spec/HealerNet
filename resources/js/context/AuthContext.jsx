import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, registerUnauthorizedHandler } from '../services/api';
import {
  clearStoredAuth,
  persistAuth,
} from '../utils/authSession';

const AuthContext = createContext(null);

export function AuthProvider({ children, onNavigate }) {
  const hasStoredToken = Boolean(localStorage.getItem('token'));

  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [authReady, setAuthReady] = useState(!hasStoredToken);
  const [isLoading, setIsLoading] = useState(hasStoredToken);

  const clearAuth = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setPermissions([]);
    setToken(null);
    setAuthReady(true);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (token) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      clearAuth();
      setIsLoading(false);
      onNavigate?.('admin-login');
    }
  }, [token, clearAuth, onNavigate]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearAuth();
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const needsLoginRedirect =
        path === '/admin' ||
        path === '/admin/dashboard' ||
        path === '/admin-dashboard' ||
        (path.startsWith('/admin/') && path !== '/admin/login');

      if (needsLoginRedirect) {
        onNavigate?.('admin-login');
      }
    });
  }, [clearAuth, onNavigate]);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setAuthReady(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAuthReady(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await apiFetch('/api/auth/me', { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.user) {
          persistAuth(data.user, storedToken);
          setUser(data.user);
          setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
          setToken(storedToken);
        } else {
          clearAuth();
        }
      } else if (res.status === 401) {
        clearAuth();
      } else {
        clearAuth();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to verify authentication:', err);
      }
      clearAuth();
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setAuthReady(true);
    }
  }, [clearAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((userData, tokenVal, userPermissions = []) => {
    persistAuth(userData, tokenVal);
    setUser(userData);
    setPermissions(Array.isArray(userPermissions) ? userPermissions : []);
    setToken(tokenVal || null);
    setAuthReady(true);
    setIsLoading(false);
  }, []);

  const isAuthenticated = authReady && Boolean(user && token);

  const value = {
    user,
    permissions,
    token,
    isAuthenticated,
    isLoading,
    authReady,
    login,
    logout,
    clearAuth,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
