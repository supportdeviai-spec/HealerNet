import React from 'react';
import Header from '../components/layout/Header';
import AdminSidebar from '../components/layout/AdminSidebar';

export default function AdminLayoutWrapper({ currentView, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <Header userRole="admin" currentView={currentView} onNavigate={onNavigate} />
      <div className="flex-1 flex">
        <AdminSidebar currentView={currentView} onNavigate={onNavigate} />
        <main className="flex-1 p-8 bg-slate-950 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
