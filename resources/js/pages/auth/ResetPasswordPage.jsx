import React, { useState, useEffect } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';

export default function ResetPasswordPage({ onNavigate, initialToken }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Attempt to pull email from querystring
    const searchParams = new URLSearchParams(window.location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    
    setErrorMsg(null);
    setStatusMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          token: token,
          password: password,
          password_confirmation: passwordConfirmation
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setStatusMsg(data.message || 'Password successfully reset! Redirecting to login...');
        setPassword('');
        setPasswordConfirmation('');
        setTimeout(() => {
          onNavigate('login');
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Could not reset password. The link might be invalid or expired.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMsg('Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      page="reset_password"
      title="Create New Password"
      subtitle="Enter a new strong password for your Healernet account."
    >
      <div className="space-y-6">
        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <span>✅</span> {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#071812]/50 border border-[#0F382C]/20 dark:border-[#1E4E3D] text-slate-500 dark:text-slate-400 placeholder-slate-400 text-sm focus:outline-none shadow-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#071812] border border-[#0F382C]/20 dark:border-[#1E4E3D] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 focus:border-[#65A30D] transition-all shadow-sm"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#071812] border border-[#0F382C]/20 dark:border-[#1E4E3D] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 focus:border-[#65A30D] transition-all shadow-sm"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !passwordConfirmation}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0F382C] via-[#145240] to-[#65A30D] hover:from-[#09261E] hover:to-[#558B2F] text-white font-bold text-sm shadow-lg shadow-[#0F382C]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
