import React, { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import { apiFetch } from '../../services/api';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [linkSent, setLinkSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setIsLoading(true);

    try {
      const response = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && (data.status === 'success' || data.success)) {
        setStatusMsg(data.message || 'Password reset link sent to your email.');
        setEmail('');
        setLinkSent(true);
      } else {
        setErrorMsg(data.message || 'Unable to send reset link. Please check your email.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setErrorMsg('Unable to connect to authentication server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      page={linkSent ? 'reset_link_sent' : 'forgot_password'}
      title={linkSent ? 'Check Your Email' : 'Reset Password'}
      subtitle={linkSent
        ? 'We sent a secure reset link to your inbox. Follow the link to choose a new password.'
        : 'Enter your email to receive a password reset link.'}
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

        {linkSent ? (
          <div className="space-y-4">
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-emerald-200/60">
              Didn&apos;t get the email?{' '}
              <button
                type="button"
                onClick={() => { setLinkSent(false); setStatusMsg(null); }}
                className="font-bold text-[#0F382C] dark:text-[#A3E635] hover:text-[#65A30D] hover:underline"
              >
                Try again
              </button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="font-bold text-[#0F382C] dark:text-[#A3E635] hover:text-[#65A30D] hover:underline text-sm"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
        <>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="doctor@healernet.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#071812] border border-[#0F382C]/20 dark:border-[#1E4E3D] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 focus:border-[#65A30D] transition-all shadow-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0F382C] via-[#145240] to-[#65A30D] hover:from-[#09261E] hover:to-[#558B2F] text-white font-bold text-sm shadow-lg shadow-[#0F382C]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-emerald-200/60">
          Remembered your password?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="font-bold text-[#0F382C] dark:text-[#A3E635] hover:text-[#65A30D] hover:underline"
          >
            Back to Login
          </button>
        </div>
        </>
        )}
      </div>
    </AuthLayout>
  );
}
