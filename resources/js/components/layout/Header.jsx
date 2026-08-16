import React from 'react';
import HealerNetLogo from '../auth/HealerNetLogo';

export default function Header({ userRole = 'user', currentView, onNavigate }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <HealerNetLogo size="sm" />
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          {userRole === 'admin' ? 'System Administrator Portal' : 'Patient & Practitioner Portal'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView.startsWith('admin')
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Admin Panel
        </button>

        <button
          onClick={() => onNavigate('admin-login')}
          className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
