import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { consumePostLoginRedirect, getUserRoleSlug } from '../../utils/authSession';

export default function LoginForm({ onSwitchToRegister, onNavigate }) {
  const { login, clearAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          remember,
        }),
      });

      const data = await response.json();

      if (response.ok && (data.status === 'success' || data.user)) {
        const roleSlug = getUserRoleSlug(data.user);
        const perms = Array.isArray(data.permissions) ? data.permissions : [];
        const canAccessAdmin = roleSlug === 'admin' || perms.includes('access_admin');

        if (!canAccessAdmin) {
          clearAuth();
          setError('Access denied. This portal is for authorized staff only.');
          return;
        }

        setSuccessMsg('Signed in successfully! Redirecting to dashboard...');
        login(data.user, data.token, perms);

        setTimeout(() => {
          if (onNavigate) {
            onNavigate(consumePostLoginRedirect('admin-dashboard'));
          }
        }, 400);
      } else {
        setError(data.message || 'Invalid email or password credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to authentication server. Please check backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <span>✅</span> {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            placeholder="admin@healernet.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#071812] border border-[#0F382C]/20 dark:border-[#1E4E3D] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 focus:border-[#65A30D] transition-all shadow-sm"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200">
              Password
            </label>
            <a
              href="#forgot-password"
              onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('forgot-password'); }}
              className="text-xs font-semibold text-[#D4AF37] hover:text-[#E5C158] hover:underline"
            >
              Forgot Password?
            </a>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#071812] border border-[#0F382C]/20 dark:border-[#1E4E3D] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 focus:border-[#65A30D] transition-all shadow-sm"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            id="remember_me"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#0F382C] focus:ring-[#65A30D]"
          />
          <label htmlFor="remember_me" className="ml-2 block text-xs font-medium text-slate-600 dark:text-emerald-200/80">
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-[#0F382C] via-[#145240] to-[#65A30D] hover:from-[#09261E] hover:to-[#558B2F] text-white font-bold text-sm shadow-lg shadow-[#0F382C]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </div>
  );
}