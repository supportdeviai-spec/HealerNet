import React from 'react';

export default function AdminSidebar({ currentView, onNavigate }) {
  const menuItems = [
    { id: 'admin-dashboard', label: 'Dashboard Overview', icon: '📊' },
    { id: 'admin-users', label: 'User Management', icon: '👥' },
    { id: 'admin-cms', label: 'Page CMS (Terms & Privacy)', icon: '📄' },
    { id: 'admin-whatsapp', label: 'WhatsApp Groups', icon: '💬' },
    { id: 'admin-otp-logs', label: 'OTP Logs', icon: '🔑' },
    { id: 'admin-email-logs', label: 'Email Logs', icon: '✉️' },
    { id: 'admin-activity-logs', label: 'Activity Audit Trail', icon: '🛡️' },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#061812]/90 p-4 space-y-2 min-h-[calc(100vh-4rem)]">
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#E5C158]">
        Admin Control Panel
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              currentView === item.id
                ? 'bg-[#65A30D]/20 text-[#A3E635] border border-[#65A30D]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}