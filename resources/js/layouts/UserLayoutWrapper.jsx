import React from 'react';
import Header from '../components/layout/Header';

export default function UserLayoutWrapper({ currentView, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <Header userRole="user" currentView={currentView} onNavigate={onNavigate} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-8">
        {children}
      </main>
    </div>
  );
}
